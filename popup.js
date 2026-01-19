document.addEventListener('DOMContentLoaded', function() {
  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      document.getElementById('site-name').textContent = new URL(tabs[0].url).hostname;
      document.getElementById('site-url').textContent = tabs[0].url;
      
      // Request data from background script initially
      requestTabData(tabs[0].id);
      
      // Refresh data every second
      setInterval(function() {
        requestTabData(tabs[0].id);
      }, 1000);
    }
  });
  
  function requestTabData(tabId) {
    chrome.runtime.sendMessage({
      type: 'getTabData',
      tabId: tabId
    }, function(response) {
      if (response) {
        updateUI(response);
      }
    });
  }
  
  // Set up control buttons
  document.getElementById('pause-js').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        // First, check if we have the debugger permission
        chrome.permissions.contains({permissions: ['debugger']}, function(hasPermission) {
          if (!hasPermission) {
            // Request the debugger permission
            chrome.permissions.request({permissions: ['debugger']}, function(granted) {
              if (granted) {
                attachDebuggerAndPause(tabs[0].id);
              } else {
                alert('Debugger permission is required to pause JavaScript');
              }
            });
          } else {
            attachDebuggerAndPause(tabs[0].id);
          }
        });
      }
    });
  });
  
  document.getElementById('block-network').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        // First, check if we have the debugger permission
        chrome.permissions.contains({permissions: ['debugger']}, function(hasPermission) {
          if (!hasPermission) {
            // Request the debugger permission
            chrome.permissions.request({permissions: ['debugger']}, function(granted) {
              if (granted) {
                blockNetworkRequests(tabs[0].id);
              } else {
                alert('Debugger permission is required to block network requests');
              }
            });
          } else {
            blockNetworkRequests(tabs[0].id);
          }
        });
      }
    });
  });
  
  document.getElementById('reload-no-scripts').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id, {bypassCache: true});
      }
    });
  });
  
  document.getElementById('clear-cache').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        // Clear cache for current tab
        chrome.browsingData.remove({
          "origins": [tabs[0].url.match(/https?:\/\/[^\/]+/)[0]]
        }, {
          "cache": true
        }, function() {
          // Reload after clearing cache
          chrome.tabs.reload(tabs[0].id, {bypassCache: true});
        });
      }
    });
  });
});

// Update UI with tab data
function updateUI(tabData) {
  // Update CPU indicator
  const cpuScore = Math.min(100, tabData.cpuActivityScore || 0);
  document.getElementById('cpu-score').textContent = cpuScore;
  const cpuIndicator = document.getElementById('cpu-indicator');
  cpuIndicator.className = 'indicator ' + (cpuScore > 70 ? 'red' : cpuScore > 40 ? 'yellow' : 'green');
  
  // Update Memory indicator
  const memoryUsage = tabData.memoryUsage || 0;
  document.getElementById('memory-usage').textContent = memoryUsage > 0 ? memoryUsage.toFixed(2) + ' MB' : 'N/A';
  const memoryIndicator = document.getElementById('memory-indicator');
  memoryIndicator.className = 'indicator ' + (memoryUsage > 1000 ? 'red' : memoryUsage > 500 ? 'yellow' : 'green');
  
  // Update Network indicator
  const networkLevel = tabData.networkActivityLevel || 'Low';
  document.getElementById('network-level').textContent = networkLevel;
  const networkIndicator = document.getElementById('network-indicator');
  networkIndicator.className = 'indicator ' + (networkLevel === 'High' ? 'red' : networkLevel === 'Medium' ? 'yellow' : 'green');
  
  // Update Worker indicator
  const workerCount = tabData.workerCount || 0;
  document.getElementById('worker-count').textContent = workerCount;
  const workerIndicator = document.getElementById('worker-indicator');
  workerIndicator.className = 'indicator ' + (workerCount > 5 ? 'red' : workerCount > 2 ? 'yellow' : 'green');
  
  // Update WASM indicator
  const wasmDetected = tabData.wasmDetected || false;
  document.getElementById('wasm-status').textContent = wasmDetected ? 'Yes' : 'No';
  const wasmIndicator = document.getElementById('wasm-indicator');
  wasmIndicator.className = 'indicator ' + (wasmDetected ? 'red' : 'green');
  
  // Update Risk indicator
  const riskIndicator = document.getElementById('risk-indicator');
  riskIndicator.textContent = tabData.riskLevel || 'Green';
  riskIndicator.className = 'risk-indicator ' + (tabData.riskLevel || 'green').toLowerCase();
  
  // Update Warnings
  const warningsList = document.getElementById('warnings-list');
  warningsList.innerHTML = '';
  if (tabData.warnings && tabData.warnings.length > 0) {
    tabData.warnings.forEach(function(warning) {
      const li = document.createElement('li');
      li.textContent = warning;
      warningsList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No warnings';
    warningsList.appendChild(li);
  }
}

function attachDebuggerAndPause(tabId) {
  chrome.debugger.attach({tabId: tabId}, "1.0", function() {
    chrome.debugger.sendCommand({tabId: tabId}, "Debugger.enable", function() {
      chrome.debugger.sendCommand({tabId: tabId}, "Debugger.pause");
    });
  });
}

function blockNetworkRequests(tabId) {
  chrome.debugger.attach({tabId: tabId}, "1.0", function() {
    chrome.debugger.sendCommand({tabId: tabId}, "Network.enable", function() {
      // Block all URLs
      chrome.debugger.sendCommand({tabId: tabId}, "Network.setBlockedURLs", {
        urls: ["*"]
      });
    });
  });
}
