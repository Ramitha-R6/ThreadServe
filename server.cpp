#include <iostream>
#include <string>
#include <sstream>
#include <thread>
#include <vector>
#include <queue>
#include <deque>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <chrono>
#include <iomanip>
#include <fstream>
#include <unordered_map>
#include <algorithm> // for sorting percentiles
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

// =========================================================================
// GLOBAL METRICS (Atomic for thread safety)
// =========================================================================
std::atomic<long long> total_requests{0};
std::atomic<int> active_connections{0};
std::atomic<int> max_active_connections{0};
std::atomic<double> total_latency_ms{0.0};
std::atomic<long long> current_second_requests{0};
std::atomic<long long> last_second_rps{0};
std::atomic<int> total_errors{0};
std::atomic<int> slow_requests{0};

// Analytics Data Extensions 
std::deque<double> recent_latencies;
std::mutex latMutex;
std::unordered_map<std::string, int> endpoint_counts;
std::mutex endpointMutex;

// =========================================================================
// THREAD POOL CONFIG & MONITORING
// =========================================================================
const int TOTAL_THREADS = 5;
std::atomic<int> busy_threads{0};
std::atomic<bool> thread_states[TOTAL_THREADS]; // false = idle, true = busy

std::queue<std::pair<SOCKET, std::string>> clientQueue; // Stores Socket & Client IP
std::mutex queueMutex;
std::condition_variable condition;
std::atomic<bool> server_running{true};

// =========================================================================
// RATE LIMITING & SECURITY
// =========================================================================
std::unordered_map<std::string, int> rate_limit_map;
std::mutex rateLimitMutex;

struct SecurityLog {
    std::string time;
    std::string ip;
    std::string event;
    std::string details;
};
std::deque<SecurityLog> security_logs;
std::mutex securityMutex;

void add_security_log(const std::string& ip, const std::string& event, const std::string& details) {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&now_c), "%Y-%m-%d %H:%M:%S");

    std::lock_guard<std::mutex> lock(securityMutex);
    security_logs.push_front({ss.str(), ip, event, details});
    if (security_logs.size() > 50) security_logs.pop_back();
}

// =========================================================================
// STATIC FILE CACHE & LOGGING
// =========================================================================
std::unordered_map<std::string, std::string> static_file_cache;
std::mutex cacheMutex;

struct LogEntry {
    std::string time;
    std::string ip;
    std::string method;
    std::string endpoint;
    int status;
    double latency;
};
std::deque<LogEntry> memory_logs;
std::mutex logsMutex;
std::ofstream log_file("server.log", std::ios::app);
std::mutex fileLogMutex;

struct ConnectionScope {
    ConnectionScope() {
        int current = ++active_connections;
        int max_val = max_active_connections.load();
        while (current > max_val && !max_active_connections.compare_exchange_weak(max_val, current));
    }
    ~ConnectionScope() { active_connections--; }
};

struct ThreadBusyScope {
    ThreadBusyScope() { busy_threads++; }
    ~ThreadBusyScope() { busy_threads--; }
};

std::string get_current_time() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&now_c), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

std::string read_static_file(const std::string& path) {
    std::string filepath = path;
    if (filepath[0] == '/') filepath = filepath.substr(1); 
    std::ifstream file(filepath, std::ios::binary);
    if (!file) return ""; 
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

// --------------------------------------------------------------------------
// HEARTBEAT MONITOR
// --------------------------------------------------------------------------
void background_monitor_thread() {
    while (server_running) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
        last_second_rps.store(current_second_requests.exchange(0));
        
        {
            std::lock_guard<std::mutex> lock(rateLimitMutex);
            rate_limit_map.clear();
        }
    }
}

// =========================================================================
// CORE CLIENT PROCESSING ENGINE 
// =========================================================================
void handle_client(SOCKET ClientSocket, const std::string& client_ip) {
    ConnectionScope conn_scope;

    // Anti-DDoS Check
    {
        std::lock_guard<std::mutex> lock(rateLimitMutex);
        rate_limit_map[client_ip]++;
        if (rate_limit_map[client_ip] > 10) {
            std::string body = "429 Too Many Requests";
            std::string response = "HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
            send(ClientSocket, response.c_str(), response.length(), 0);
            closesocket(ClientSocket);
            
            total_errors++;
            total_requests++;
            current_second_requests++;
            add_security_log(client_ip, "RATE_LIMIT_BLOCK", "Exceeded 10 req/s internally.");
            return;
        }
    }

    char recvbuf[4096];
    int iResult = recv(ClientSocket, recvbuf, sizeof(recvbuf) - 1, 0);
    auto parse_start = std::chrono::high_resolution_clock::now();

    if (iResult > 0) {
        recvbuf[iResult] = '\0';
        std::string requestStr(recvbuf);
        
        std::string method, path, version, reqBody;
        std::istringstream iss(requestStr);
        iss >> method >> path >> version;
        
        size_t bodyPos = requestStr.find("\r\n\r\n");
        if (bodyPos != std::string::npos) reqBody = requestStr.substr(bodyPos + 4);

        int statusCode = 200;
        std::string response;
        std::string cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\n";

        // Global Analytics Aggregation
        {
            std::lock_guard<std::mutex> lock(endpointMutex);
            if (path != "/metrics" && path != "/security" && method != "OPTIONS") endpoint_counts[path]++;
        }

        // Endpoint Router Engine
        if (method == "OPTIONS") {
            statusCode = 204;
            response = "HTTP/1.1 204 No Content\r\nConnection: close\r\n" + cors + "\r\n";
        } 
        else if (path == "/health") {
            std::string body = "{\"status\": \"ok\"}";
            response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
        } 
        else if (path == "/security") {
            std::lock_guard<std::mutex> lock(securityMutex);
            std::ostringstream json;
            json << "[";
            for (size_t i = 0; i < security_logs.size(); ++i) {
                json << "{";
                json << "\"time\":\"" << security_logs[i].time << "\",";
                json << "\"ip\":\"" << security_logs[i].ip << "\",";
                json << "\"event\":\"" << security_logs[i].event << "\",";
                json << "\"details\":\"" << security_logs[i].details << "\"";
                json << "}";
                if (i < security_logs.size() - 1) json << ",";
            }
            json << "]";
            std::string body = json.str();
            response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
        }
        else if (path == "/metrics") {
            long long reqs = total_requests.load();
            double avg_lat = reqs > 0 ? (total_latency_ms.load() / reqs) : 0.0;
            double err_rate = reqs > 0 ? ((double)total_errors.load() / reqs) : 0.0;
            
            // Calculate Percentiles securely
            double p95 = 0.0, p99 = 0.0;
            {
                std::lock_guard<std::mutex> lock(latMutex);
                if (!recent_latencies.empty()) {
                    std::vector<double> sortedLatencies(recent_latencies.begin(), recent_latencies.end());
                    std::sort(sortedLatencies.begin(), sortedLatencies.end());
                    p95 = sortedLatencies[(int)(sortedLatencies.size() * 0.95)];
                    p99 = sortedLatencies[(int)(sortedLatencies.size() * 0.99)];
                }
            }

            int q_size = 0;
            {
                std::lock_guard<std::mutex> lock(queueMutex);
                q_size = clientQueue.size();
            }

            std::ostringstream json;
            json << std::fixed << std::setprecision(2);
            json << "{\n"
                 << "  \"total_requests\": " << reqs << ",\n"
                 << "  \"active_connections\": " << active_connections.load() << ",\n"
                 << "  \"max_active_connections\": " << max_active_connections.load() << ",\n"
                 << "  \"avg_latency_ms\": " << avg_lat << ",\n"
                 << "  \"p95_latency\": " << p95 << ",\n"
                 << "  \"p99_latency\": " << p99 << ",\n"
                 << "  \"requests_per_sec\": " << last_second_rps.load() << ",\n"
                 << "  \"error_rate\": " << err_rate << ",\n"
                 << "  \"slow_requests\": " << slow_requests.load() << ",\n"
                 << "  \"thread_pool\": {\n"
                 << "    \"total_threads\": " << TOTAL_THREADS << ",\n"
                 << "    \"busy_threads\": " << busy_threads.load() << ",\n"
                 << "    \"queue_size\": " << q_size << ",\n"
                 << "    \"states\": [";
            for(int j=0; j<TOTAL_THREADS; j++) {
                json << (thread_states[j].load() ? "1" : "0");
                if (j < TOTAL_THREADS - 1) json << ", ";
            }
            json << "]\n  },\n"
                 << "  \"endpoints_traffic\": {";
            {
                std::lock_guard<std::mutex> lock(endpointMutex);
                int k = 0;
                for (auto const& x : endpoint_counts) {
                    json << "\"" << x.first << "\": " << x.second;
                    if (++k < endpoint_counts.size()) json << ", ";
                }
            }
            json << "}\n}";
            std::string body = json.str();
            response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
        } 
        else if (path == "/logs") {
            std::lock_guard<std::mutex> lock(logsMutex);
            std::ostringstream json;
            json << "[";
            for (size_t i = 0; i < memory_logs.size(); ++i) {
                json << "{\"time\":\"" << memory_logs[i].time << "\",\"ip\":\"" << memory_logs[i].ip 
                     << "\",\"method\":\"" << memory_logs[i].method << "\",\"endpoint\":\"" << memory_logs[i].endpoint 
                     << "\",\"status\":" << memory_logs[i].status << ",\"latency\":" << memory_logs[i].latency << "}";
                if (i < memory_logs.size() - 1) json << ",";
            }
            json << "]";
            std::string body = json.str();
            response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
        } 
        else if (method == "POST" && path == "/login") {
            if (reqBody.find("admin") != std::string::npos && reqBody.find("password") != std::string::npos) {
                std::string body = "{\"token\": \"usr_secure_90XF21\"}";
                response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
            } else {
                statusCode = 401;
                total_errors++;
                add_security_log(client_ip, "AUTH_FAILURE", "Invalid credentials block");
                std::string body = "{\"error\": \"Invalid Credentials\"}";
                response = "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
            }
        } 
        else {
            std::string content = "";
            bool found = false;
            {
                std::lock_guard<std::mutex> lock(cacheMutex);
                if (static_file_cache.find(path) != static_file_cache.end()) {
                    content = static_file_cache[path];
                    found = true;
                }
            }
            if (!found) {
                content = read_static_file(path == "/" ? "/index.html" : path);
                if (!content.empty()) {
                    found = true;
                    std::lock_guard<std::mutex> lock(cacheMutex);
                    static_file_cache[path] = content; 
                }
            }

            if (found) {
                response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(content.length()) + "\r\n\r\n" + content;
            } else {
                statusCode = 404;
                total_errors++;
                std::string body = "404 Not Found";
                response = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nConnection: close\r\n" + cors + "Content-Length: " + std::to_string(body.length()) + "\r\n\r\n" + body;
            }
        }

        send(ClientSocket, response.c_str(), response.length(), 0);

        auto process_end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::milli> process_duration = process_end - parse_start;
        double latency_val = process_duration.count();
        
        total_latency_ms.store(total_latency_ms.load() + latency_val);
        total_requests++;
        current_second_requests++;

        if (latency_val > 100.0) slow_requests++;

        {
            std::lock_guard<std::mutex> lock(latMutex);
            recent_latencies.push_back(latency_val);
            if (recent_latencies.size() > 500) recent_latencies.pop_front();
        }

        if (method != "OPTIONS") {
            std::string ts = get_current_time();
            {
                std::lock_guard<std::mutex> lock(logsMutex);
                memory_logs.push_front({ts, client_ip, method, path, statusCode, latency_val});
                if (memory_logs.size() > 50) memory_logs.pop_back();
            }
            {
                std::lock_guard<std::mutex> lock(fileLogMutex);
                if (log_file.is_open()) {
                    log_file << "[" << ts << "] [" << client_ip << "] " << method << " " << path << " -> " << statusCode << " (" << std::fixed << std::setprecision(2) << latency_val << "ms)\n";
                    log_file.flush();
                }
            }
        }
    }

    closesocket(ClientSocket);
}

void worker_thread(int thread_id) {
    // initialize state
    thread_states[thread_id] = false;

    while (server_running) {
        SOCKET ClientSocket;
        std::string client_ip;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            condition.wait(lock, [] { return !clientQueue.empty() || !server_running; });
            if (!server_running && clientQueue.empty()) return;
            ClientSocket = clientQueue.front().first;
            client_ip = clientQueue.front().second;
            clientQueue.pop();
        }
        
        ThreadBusyScope busy_scope; 
        thread_states[thread_id] = true; // explicitly activate specific thread map natively
        handle_client(ClientSocket, client_ip);
        thread_states[thread_id] = false;
    }
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return 1;

    SOCKET ListenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (ListenSocket == INVALID_SOCKET) return 1;

    sockaddr_in serverAddress;
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_addr.s_addr = INADDR_ANY;
    serverAddress.sin_port = htons(8080);

    if (bind(ListenSocket, (SOCKADDR*)&serverAddress, sizeof(serverAddress)) == SOCKET_ERROR) return 1;
    if (listen(ListenSocket, SOMAXCONN) == SOCKET_ERROR) return 1;

    std::cout << "Starting background monitoring engines..." << std::endl;
    std::thread rps_monitor(background_monitor_thread);

    std::vector<std::thread> workers;
    // Map thread arrays actively
    for (int i = 0; i < TOTAL_THREADS; ++i) {
        workers.push_back(std::thread(worker_thread, i));
    }
    
    std::cout << "Production Infrastructure Server listening heavily on port 8080." << std::endl;

    while (server_running) {
        sockaddr_in client_info;
        int client_info_len = sizeof(client_info);
        
        SOCKET ClientSocket = accept(ListenSocket, (struct sockaddr*)&client_info, &client_info_len);
        if (ClientSocket == INVALID_SOCKET) break;

        char client_ip_str[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &(client_info.sin_addr), client_ip_str, INET_ADDRSTRLEN);

        {
            std::lock_guard<std::mutex> lock(queueMutex);
            clientQueue.push({ClientSocket, std::string(client_ip_str)});
        }
        condition.notify_one();
    }

    server_running = false;
    condition.notify_all();
    
    for (auto& t : workers) {
        if (t.joinable()) t.join();
    }
    if (rps_monitor.joinable()) rps_monitor.join();

    if (log_file.is_open()) log_file.close();

    closesocket(ListenSocket);
    WSACleanup();
    return 0;
}
