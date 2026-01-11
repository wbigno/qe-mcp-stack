/**
 * Background Service Worker - Manages WebSocket connection to MCP server
 */

const WS_URL = "ws://localhost:8765";
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

let ws = null;
let reconnectTimer = null;
let pingTimer = null;
let pendingRequests = new Map();
let requestIdCounter = 0;

// Connection state
let connectionState = "disconnected"; // 'disconnected', 'connecting', 'connected'

// Network traffic storage
const networkRequests = new Map();
const MAX_NETWORK_REQUESTS = 500; // Limit to prevent memory issues

/**
 * Connect to WebSocket server
 */
function connect() {
  if (
    ws &&
    (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  console.log("[Bridge] Connecting to", WS_URL);
  connectionState = "connecting";
  updateBadge("...", "#FFA500");

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[Bridge] Connected to MCP server");
      connectionState = "connected";
      updateBadge("✓", "#00AA00");

      // Start ping to keep connection alive
      startPing();

      // Clear reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[Bridge] Received:", message);

        // Handle response to pending request
        if (message.requestId && pendingRequests.has(message.requestId)) {
          const { resolve, reject, timeoutId } = pendingRequests.get(
            message.requestId,
          );
          clearTimeout(timeoutId);
          pendingRequests.delete(message.requestId);

          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve(message.result);
          }
          return;
        }

        // Handle incoming command from MCP server
        if (message.command) {
          try {
            // Get active tab
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });

            if (!tab || !tab.id) {
              throw new Error("No active tab found");
            }

            // Send command to content script
            const response = await chrome.tabs.sendMessage(tab.id, {
              command: message.command,
              params: message.params || {},
            });

            // Send response back to MCP server
            ws.send(
              JSON.stringify({
                requestId: message.requestId,
                result: response.result || response,
                error: response.error,
              }),
            );
          } catch (error) {
            console.error("[Bridge] Command execution error:", error);
            // Send error back to MCP server
            ws.send(
              JSON.stringify({
                requestId: message.requestId,
                error: error.message,
              }),
            );
          }
        }
      } catch (error) {
        console.error("[Bridge] Message parse error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[Bridge] WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("[Bridge] Disconnected from MCP server");
      connectionState = "disconnected";
      updateBadge("✗", "#AA0000");

      stopPing();

      // Reject all pending requests
      for (const [requestId, { reject, timeoutId }] of pendingRequests) {
        clearTimeout(timeoutId);
        reject(new Error("Connection closed"));
      }
      pendingRequests.clear();

      // Schedule reconnection
      scheduleReconnect();
    };
  } catch (error) {
    console.error("[Bridge] Connection error:", error);
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimer) return;

  console.log(`[Bridge] Reconnecting in ${RECONNECT_DELAY}ms...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY);
}

/**
 * Start sending ping messages
 */
function startPing() {
  if (pingTimer) return;

  pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, PING_INTERVAL);
}

/**
 * Stop ping timer
 */
function stopPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/**
 * Update extension badge
 */
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

/**
 * Send command to MCP server and wait for response
 */
async function sendCommand(command, params = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to MCP server");
  }

  const requestId = `req_${++requestIdCounter}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    // Set 30 second timeout
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("Request timeout"));
    }, 30000);

    pendingRequests.set(requestId, { resolve, reject, timeoutId });

    const message = {
      requestId,
      command,
      params,
    };

    ws.send(JSON.stringify(message));
  });
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Bridge] Message from content script:", request);

  (async () => {
    try {
      if (request.action === "getConnectionState") {
        sendResponse({ state: connectionState });
        return;
      }

      // Handle network traffic commands locally
      if (request.action === "getNetworkTraffic") {
        sendResponse(getNetworkTraffic(request.params || {}));
        return;
      }

      if (request.action === "clearNetworkTraffic") {
        sendResponse(clearNetworkTraffic());
        return;
      }

      // Forward command to MCP server
      const result = await sendCommand(request.action, {
        ...request.params,
        tabId: sender.tab?.id,
      });

      sendResponse({ success: true, result });
    } catch (error) {
      console.error("[Bridge] Command error:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

/**
 * Handle tab activation - inject content script if needed
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeInfo.tabId },
      files: ["content.js"],
    });
  } catch (error) {
    // Ignore errors (e.g., chrome:// pages)
  }
});

/**
 * Network traffic monitoring using webRequest API
 */

// Track request start times
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!networkRequests.has(details.requestId)) {
      networkRequests.set(details.requestId, {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        tabId: details.tabId,
        timestamp: new Date().toISOString(),
        startTime: Date.now(),
      });

      // Limit size
      if (networkRequests.size > MAX_NETWORK_REQUESTS) {
        const firstKey = networkRequests.keys().next().value;
        networkRequests.delete(firstKey);
      }
    }
  },
  { urls: ["<all_urls>"] },
);

// Capture request headers
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    const request = networkRequests.get(details.requestId);
    if (request) {
      request.requestHeaders = details.requestHeaders;
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"],
);

// Capture response headers and status
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const request = networkRequests.get(details.requestId);
    if (request) {
      request.statusCode = details.statusCode;
      request.responseHeaders = details.responseHeaders;
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.completed = true;
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"],
);

// Capture errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const request = networkRequests.get(details.requestId);
    if (request) {
      request.error = details.error;
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.failed = true;
    }
  },
  { urls: ["<all_urls>"] },
);

/**
 * Get network traffic
 */
function getNetworkTraffic(options = {}) {
  const { limit, types, statusCodes, since, url: urlFilter } = options;

  let requests = Array.from(networkRequests.values());

  // Filter by type
  if (types && types.length > 0) {
    requests = requests.filter((req) => types.includes(req.type));
  }

  // Filter by status code
  if (statusCodes && statusCodes.length > 0) {
    requests = requests.filter((req) => statusCodes.includes(req.statusCode));
  }

  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    requests = requests.filter((req) => new Date(req.timestamp) >= sinceDate);
  }

  // Filter by URL pattern
  if (urlFilter) {
    requests = requests.filter((req) => req.url.includes(urlFilter));
  }

  // Sort by timestamp (newest first)
  requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Limit results
  if (limit && limit > 0) {
    requests = requests.slice(0, limit);
  }

  return {
    requests,
    total: requests.length,
    captured: networkRequests.size,
  };
}

/**
 * Clear network traffic
 */
function clearNetworkTraffic() {
  networkRequests.clear();
  return { success: true, message: "Network traffic cleared" };
}

// Start connection on extension load
connect();

console.log("[Bridge] Background service worker initialized");
