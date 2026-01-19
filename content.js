// Track event loop activity
let eventLoopActivity = 0;
let lastTimestamp = performance.now();
let timerCount = 0;
let workerCount = 0;
let wasmDetected = false;
let networkRequestCount = 0;
let lastMetricsSent = performance.now();

// Measure CPU activity using event loop and DOM operations
let domOperationsCount = 0;
const originalCreateElement = document.createElement;
document.createElement = function(...args) {
  domOperationsCount++;
  return originalCreateElement.apply(this, args);
};

// Monitor event loop
function measureEventLoop() {
  const now = performance.now();
  const delta = now - lastTimestamp;
  eventLoopActivity += delta;
  lastTimestamp = now;
  
  // Send metrics to background script every second
  if (now - lastMetricsSent > 1000) {
    sendMetrics(now);
  }
  
  requestAnimationFrame(measureEventLoop);
}

// Send metrics to background script
function sendMetrics(timestamp) {
  // Calculate CPU score based on event loop activity and DOM operations
  const cpuScore = Math.min(100, (eventLoopActivity / 16.67) * 0.7 + (domOperationsCount / 100) * 0.3);
  
  chrome.runtime.sendMessage({
    type: 'cpuScore',
    data: {
      cpuScore,
      eventLoopActivity,
      domOperationsCount,
      timerCount,
      workerCount,
      wasmDetected,
      networkRequestCount,
      timestamp,
      // Add memory information from performance API
      memory: window.performance && window.performance.memory ? 
        window.performance.memory.usedJSHeapSize / (1024 * 1024) : null
    }
  });
  
  // Reset counters
  lastMetricsSent = timestamp;
  eventLoopActivity = 0;
  domOperationsCount = 0;
  timerCount = 0;
  networkRequestCount = 0;
}

// Hook into timers
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay, ...args) {
  timerCount++;
  return originalSetTimeout.call(this, callback, delay, ...args);
};

// Hook into fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  networkRequestCount++;
  return originalFetch.apply(this, args);
};

// Detect WebAssembly usage
const originalWasmInstantiate = WebAssembly.instantiate;
WebAssembly.instantiate = function(...args) {
  wasmDetected = true;
  chrome.runtime.sendMessage({
    type: 'wasmDetected'
  });
  return originalWasmInstantiate.apply(this, args);
};

// Detect Worker creation
const originalWorker = window.Worker;
window.Worker = function(scriptURL, options) {
  workerCount++;
  chrome.runtime.sendMessage({
    type: 'workerCreated',
    count: workerCount
  });
  return new originalWorker(scriptURL, options);
};

// Start monitoring
measureEventLoop();
