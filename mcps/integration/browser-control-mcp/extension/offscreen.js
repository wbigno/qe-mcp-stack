/**
 * Offscreen Document - Handles WebSocket connection for service worker
 */

const WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

let ws = null;
let reconnectTimer = null;
let pingTimer = null;

console.log('[Bridge Offscreen] Initialized');

/**
 * Connect to WebSocket server
 */
function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log('[Bridge Offscreen] Connecting to', WS_URL);

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[Bridge Offscreen] Connected to MCP server');
      notifyServiceWorker({ type: 'connectionState', state: 'connected' });
      startPing();

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Bridge Offscreen] Received:', message);

        // Forward message to service worker
        notifyServiceWorker({ type: 'wsMessage', data: message });
      } catch (error) {
        console.error('[Bridge Offscreen] Message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Bridge Offscreen] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Bridge Offscreen] Disconnected from MCP server');
      notifyServiceWorker({ type: 'connectionState', state: 'disconnected' });
      stopPing();
      scheduleReconnect();
    };

  } catch (error) {
    console.error('[Bridge Offscreen] Connection error:', error);
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimer) return;

  console.log(`[Bridge Offscreen] Reconnecting in ${RECONNECT_DELAY}ms...`);
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
      ws.send(JSON.stringify({ type: 'ping' }));
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
 * Send message to service worker
 */
function notifyServiceWorker(message) {
  chrome.runtime.sendMessage(message).catch(err => {
    console.error('[Bridge Offscreen] Error sending to service worker:', err);
  });
}

/**
 * Handle messages from service worker
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Bridge Offscreen] Message from service worker:', request);

  if (request.type === 'wsSend' && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(request.data));
    sendResponse({ success: true });
  } else if (request.type === 'getConnectionState') {
    const state = ws ?
      (ws.readyState === WebSocket.OPEN ? 'connected' :
       ws.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')
      : 'disconnected';
    sendResponse({ state });
  } else if (request.type === 'connect') {
    connect();
    sendResponse({ success: true });
  } else {
    sendResponse({ success: false, error: 'Unknown command or not connected' });
  }

  return true;
});

// Start connection
connect();
