const http = require('http');

// Configuration
const TOTAL_REQUESTS = 15000;
const CONCURRENCY = 200; // How many requests to fire simultaneously in a batch

let completed = 0;
let errors = 0;
const startTime = Date.now();

console.log(`\n🚀 Starting Node.js Stress Test on C++ Thread Pool Server`);
console.log(`========================================================`);
console.log(`Targeting:      http://localhost:8080/metrics`);
console.log(`Total Requests: ${TOTAL_REQUESTS}`);
console.log(`Concurrency:    ${CONCURRENCY}`);
console.log(`========================================================\n`);

// Helper function to fire a single HTTP GET request
function makeRequest() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080/metrics', (res) => {
      // Must consume the response buffer to free memory
      res.on('data', () => {}); 
      res.on('end', () => {
        if (res.statusCode === 200) completed++;
        else errors++;
        resolve();
      });
    });
    
    // Catch connection refused / timeout errors
    req.on('error', () => {
      errors++;
      resolve();
    });
  });
}

// Main execution loop
async function run() {
  // We chunk the requests into batches based on concurrency level
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
    const promises = [];
    
    for (let j = 0; j < batchSize; j++) {
      promises.push(makeRequest());
    }
    
    // Wait for the entire batch to finish before sending the next wave
    await Promise.all(promises);
    
    // Print progress without spamming new lines
    const current = completed + errors;
    process.stdout.write(`\r⏳ Progress: ${current}/${TOTAL_REQUESTS} [${Math.round((current)/TOTAL_REQUESTS * 100)}%]`);
  }
  
  const timeTakenSec = (Date.now() - startTime) / 1000;
  
  console.log(`\n\n✅ --- Test Complete ---`);
  console.log(`Time Elapsed:   ${timeTakenSec.toFixed(2)} seconds`);
  console.log(`Successful:     ${completed} requests`);
  console.log(`Errors:         ${errors} requests`);
  console.log(`Throughput:     ${Math.round(TOTAL_REQUESTS / timeTakenSec)} Requests per Second (RPS)\n`);
}

run();
