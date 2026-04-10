<h1 align="center">🖥️ ThreadServe</h1>

<p align="center">
  A production-grade, multithreaded HTTP server built from scratch in C++ with a real-time React analytics dashboard.
  <br/><br/>
  <a href="https://github.com/Ramitha-R6/ThreadServe">github.com/Ramitha-R6/ThreadServe</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/C%2B%2B-11-blue?style=for-the-badge&logo=cplusplus" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## 📸 Preview

> A high-performance, real-time analytics dashboard connected live to the C++ core engine.

<p align="center">
  <img src="dashboard/DashBoard_preview1.png" width="45%" alt="Analytics Overview" />
  <img src="dashboard/DashBoard_preview2.png" width="45%" alt="Network Toolkit" />
</p>
<p align="center">
  <img src="dashboard/DashBoard_preview3.png" width="45%" alt="Traffic Logs" />
  <img src="dashboard/DashBoard_preview4.png" width="45%" alt="Threat Telemetry" />
</p>

---

## 🚀 Overview

This project demonstrates a full-stack systems engineering implementation combining:

- A **native C++ HTTP server** built on the Winsock2 API with a custom thread pool architecture
- A **React + Tailwind dashboard** that connects directly to the C++ backend in real-time
- End-to-end visibility into server health, request analytics, thread pool activity, and security events

No external frameworks power the backend — pure C++11 with raw OS-level socket calls.

---

## ✨ Features

### 🔧 C++ Backend (`server.cpp`)
| Feature | Description |
|---|---|
| **Thread Pool** | Fixed worker pool using `std::condition_variable` — zero CPU spin-waiting |
| **RAII Safety** | `ConnectionScope` & `ThreadBusyScope` structs guarantee no counter leaks on any code path |
| **P95 / P99 Latency** | Rolling 500-sample deque sorted on-demand for tail-latency percentiles |
| **RPS Tracker** | Dedicated background heartbeat thread sampling requests-per-second every 1 second |
| **Rate Limiting** | Per-IP hash map limiting to 10 req/s — resets automatically each heartbeat cycle |
| **Security Logging** | Captures every `HTTP 429` block and `HTTP 401` auth failure with timestamp + client IP |
| **Endpoint Analytics** | Tracks hit counts per route natively in an `unordered_map` |
| **Static File Cache** | In-memory `unordered_map` cache avoids repeated disk reads for static files |
| **File Logging** | Persistent `server.log` with `[SLOW]` tagging for requests exceeding 100ms |
| **CORS Support** | Full preflight `OPTIONS` handling for cross-origin React frontend access |

### 📡 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Load balancer ping — returns `{"status":"ok"}` |
| `GET` | `/metrics` | Full JSON metrics: RPS, latency, P95/P99, thread states, endpoint traffic |
| `GET` | `/logs` | Last 50 HTTP transactions with IP, method, status code, latency |
| `GET` | `/security` | Auth failures and rate-limit blocks with timestamps |
| `POST` | `/login` | Session authentication returning a token |

### 🎨 React Dashboard (`/dashboard`)
| Feature | Description |
|---|---|
| **Login Portal** | Secure gateway — all routes are blocked until authenticated |
| **Live Metrics Cards** | RPS, Avg Latency, P95/P99, Error Rate, Active Connections, Slow Requests |
| **Thread Heatmap** | 5 live blocks light up as each C++ worker thread picks up a task |
| **Traffic Pie Chart** | Recharts breakdown of which endpoints receive the most traffic |
| **Latency History Chart** | Area chart tracking average latency over time |
| **RPS Chart** | Live line graph of requests-per-second peaks |
| **Compact Mode** | Toggle between full detail view and condensed summary bar |
| **Live Logs Viewer** | Streams real server logs with filtering by status |
| **Threat Telemetry** | Dedicated security panel showing rate-limit blocks and auth failures |
| **API Tester** | Built-in tool to fire requests at any endpoint and inspect responses |

---

## 🛠️ Tech Stack

**Backend**
- C++11
- Winsock2 (`ws2_32.lib`)
- `std::thread`, `std::mutex`, `std::condition_variable`, `std::atomic`
- `std::chrono` for high-precision latency measurement
- `std::deque`, `std::unordered_map` for analytics and caching

**Frontend**
- React 18 (functional components + hooks)
- Tailwind CSS 3
- Recharts (AreaChart, LineChart, PieChart)
- Lucide React (icons)
- Vite (dev server + build tool)

---

## ⚡ Getting Started

### Prerequisites
- Windows OS
- `g++` with C++11 support (MinGW recommended)
- Node.js 18+

### 1. Clone the Repository

```bash
git clone https://github.com/Ramitha-R6/ThreadServe.git
cd ThreadServe
```

### 2. Compile & Run the C++ Server

```powershell
g++ -std=c++11 server.cpp -o server.exe -lws2_32 -lwsock32
.\server.exe
```

The server starts on **`http://localhost:8080`**

### 3. Launch the React Dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

### 4. Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `password` |

---

## 🔥 Load Testing

A built-in Node.js stress tester is included to push the server under concurrent load:

```powershell
node load_test.js
```

While the test runs, watch the React Dashboard in real-time:
- **RPS counter** spikes as requests flood in
- **Thread Heatmap** lights up showing worker threads processing concurrently  
- **P99 Latency** climbs under sustained load
- **Rate Limiter** kicks in — `HTTP 429` events appear in the Threat Telemetry panel

---

## 📁 Project Structure

```
SDE_project/
├── server.cpp          # C++ HTTP server (Winsock2, thread pool, metrics engine)
├── server.log          # Auto-generated request log file
├── load_test.js        # Node.js concurrent load test script
├── README.md           # This file
└── dashboard/          # React frontend
    ├── src/
    │   ├── App.jsx                      # Root layout + routing + auth guard
    │   ├── index.css                    # Global dark theme styles
    │   └── components/
    │       ├── Login.jsx                # Secure login portal
    │       ├── Dashboard.jsx            # Metrics, charts, thread heatmap
    │       ├── ApiTester.jsx            # In-browser API request tool
    │       ├── LogsViewer.jsx           # Live server log stream
    │       └── SecurityLogs.jsx         # Auth failures & rate-limit events
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🧠 Architecture Highlights

```
Browser (React Dashboard)
       │
       │  HTTP Fetch (every 1s)
       ▼
C++ HTTP Server (port 8080)
       │
       ├── accept() loop
       │       │
       │       ▼
       │   Queue (std::queue + mutex)
       │       │
       │       ▼
       │   Thread Pool (5 workers)
       │       │
       │       ├── parse request
       │       ├── route to handler
       │       ├── record metrics (atomic)
       │       ├── push to log buffer
       │       └── send HTTP response
       │
       └── Background Thread
               ├── reset RPS counter (every 1s)
               └── clear rate-limit map (every 1s)
```

---

## 👤 Author

**Ramitha R**  
[github.com/Ramitha-R6](https://github.com/Ramitha-R6)  
[🔗 ThreadServe Repository](https://github.com/Ramitha-R6/ThreadServe)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
