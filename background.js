// Per-tab state storage
const tabStates = {};

// Initialize or get tab state
function getTabState(tabId) {
  if (!tabStates[tabId]) {
    tabStates[tabId] = {
      cpuActivityScore: 0,
      memoryUsage: 0,
      workerCount: 0,
      networkActivityLevel: 'Low',
      warnings: [],
      wasmDetected: false
    };
  }
  return tabStates[tabId];
}

// Calculate risk indicator
function calculateRiskIndicator(tabState) {
  let riskScore = 0;
  
  // CPU score (0-100)
  riskScore += tabState.cpuActivityScore;
  
  // Memory usage (0-40)
  if (tabState.memoryUsage > 100) {
    riskScore += 40;
  } else if (tabState.memoryUsage > 50) {
    riskScore += 20;
  }
  
  // Network activity (0-20)
  if (tabState.networkActivityLevel === 'High') {
    riskScore += 20;
  } else if (tabState.networkActivityLevel === 'Medium') {
    riskScore += 10;
  }
  
  // Worker count (0-20)
  if (tabState.workerCount > 5) {
    riskScore += 20;
  } else if (tabState.workerCount > 2) {
    riskScore += 10;
  }
  
  // WASM usage (0-10)
  if (tabState.wasmDetected) {
    riskScore += 10;
  }
  
  // Determine risk level
  if (riskScore > 120) {
    return 'Red';
  } else if (riskScore > 60) {
    return 'Yellow';
  }
  return 'Green';
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab) {
    const tabState = getTabState(sender.tab.id);
    
    if (message.type === 'metrics') {
      // Update tab state with metrics
      tabState.cpuActivityScore = Math.min(100, message.data.eventLoopActivity / 10);
      tabState.workerCount = message.data.workerCount;
      tabState.wasmDetected = message.data.wasmDetected;
      
      // Determine network activity level
      if (message.data.networkRequestCount > 10) {
        tabState.networkActivityLevel = 'High';
      } else if (message.data.networkRequestCount > 5) {
        tabState.networkActivityLevel = 'Medium';
      } else {
        tabState.networkActivityLevel = 'Low';
      }
      
      // Check for warnings
      tabState.warnings = [];
      if (tabState.cpuActivityScore > 80) {
        tabState.warnings.push('High CPU usage detected');
      }
      if (tabState.workerCount > 3) {
        tabState.warnings.push('Multiple background workers running');
      }
      if (tabState.wasmDetected) {
        tabState.warnings.push('WebAssembly execution active');
      }
      if (tabState.networkActivityLevel === 'High') {
        tabState.warnings.push('High network activity');
      }
      
      // Try to get memory usage if available
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              function: () => {
                if (window.performance && window.performance.memory) {
                  return window.performance.memory.usedJSHeapSize;
                }
                return null;
              }
            }, (results) => {
              if (results && results[0] && results[0].result) {
                tabState.memoryUsage = results[0].result / (1024 * 1024); // Convert to MB
              }
            });
          }
        });
      }
    }
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Reset state when tab is reloaded
    tabStates[tabId] = getTabState(tabId);
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});
// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getTabData' && tabStates[message.tabId]) {
    const tabState = tabStates[message.tabId];
    sendResponse({
      cpuActivityScore: tabState.cpuActivityScore,
      memoryUsage: tabState.memoryUsage,
      workerCount: tabState.workerCount,
      networkActivityLevel: tabState.networkActivityLevel,
      wasmDetected: tabState.wasmDetected,
      riskLevel: calculateRiskIndicator(tabState),
      warnings: tabState.warnings
    });
  }
});

