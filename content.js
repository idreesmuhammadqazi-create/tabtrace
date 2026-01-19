// Track event loop activity
let eventLoopActivity = 0;
let lastTimestamp = performance.now();
let timerCount = 0;
let workerCount = 0;
let wasmDetected = false;
let networkRequestCount = 0;

// Monitor event loop
function measureEventLoop() {
  const now = performance.now();
  const delta = now - lastTimestamp;
  eventLoopActivity += delta;
  lastTimestamp = now;
  
  // Send metrics to background script
  chrome.runtime.sendMessage({
    type: 'metrics',
    data: {
      eventLoopActivity,
      timerCount,
      workerCount,
      wasmDetected,
      networkRequestCount
    }
  });
  
  requestAnimationFrame(measureEventLoop);
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
