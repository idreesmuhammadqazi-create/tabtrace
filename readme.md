# Browser Autopsy — Extension Specifications

## 1. Platform
- Chromium-based browsers
- Manifest Version: v3

---

## 2. Extension Components

### 2.1 Content Script
Runs in the context of the active tab.

Responsibilities:
- Collect performance metrics
- Observe script execution patterns
- Detect WASM and worker usage
- Send metrics to background script

Collected Data:
- Event loop activity rate
- Timer frequency
- Number of active Web Workers
- Presence of Service Workers
- WASM instantiation detection
- Network request count (via hooks)
- Data sent and received (bytes transferred)

---

### 2.2 Background Script (Service Worker)
Runs persistently in the extension context.

Responsibilities:
- Maintain per-tab state
- Aggregate metrics over time
- Apply detection heuristics
- Expose data to popup UI

Stored State (per tab):
- CPU activity score
- Memory usage (if available)
- Worker counts
- Network activity level
- Data sent and received
- Active warnings

---

### 2.3 Popup UI
User-facing interface.

Displays:
- Current site name and URL
- Live CPU activity indicator
- Memory usage (if supported)
- Network activity level
- Worker and WASM indicators
- Data sent and received
- Warning badges

Controls:
- Pause JavaScript execution
- Block network requests
- Reload tab with scripts disabled

---

## 3. Metrics & Detection

### 3.1 CPU Activity (Estimated)
Derived from:
- Event loop delay
- Script execution frequency
- Timer density

Output:
- Normalized score (0–100)

---

### 3.2 Memory Usage
- Source: `window.performance.memory`
- Availability: Chromium only
- Fallback: unsupported indicator

---

### 3.3 Network Activity
- Count outgoing requests per second
- Categorize by type where possible

Levels:
- Low
- Medium
- High

---

### 3.4 WebAssembly Detection
Triggers when:
- `WebAssembly.instantiate`
- `WebAssembly.instantiateStreaming`
are invoked

State:
- Boolean flag per tab

---

### 3.5 Worker Detection
Counts:
- Web Workers
- Service Workers

Flags:
- Excessive worker creation

---

## 4. Warnings

Possible Warnings:
- High CPU usage detected
- Excessive memory usage
- WebAssembly execution active
- Multiple background workers running
- High network activity
- High data transfer detected

Warnings are heuristic-based, not definitive.

---

## 5. Risk Indicator
- Green: normal behavior
- Yellow: heavy behavior
- Red: potentially abusive behavior

Calculated from:
- CPU score
- Memory usage
- Network activity
- Worker count
- Data transfer volume

---

## 6. Permissions

Required:
- `tabs`
- `scripting`
- `activeTab`
- `webRequest`

Optional:
- `debugger` (for advanced metrics)

---

## 7. Data Handling
- All data is ephemeral
- No persistence across sessions
- No external communication
- No user tracking

---

## 8. Limitations
- CPU usage is estimated
- Memory metrics are browser-limited
- Full script/network blocking is constrained by browser APIs

---

## 9. Compliance
- User-initiated activation only
- No background monitoring without consent
- Open-source friendly
