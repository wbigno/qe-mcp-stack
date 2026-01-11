/**
 * Popup Script - Extension popup UI
 */

const statusDiv = document.getElementById('status');
const stateDetailDiv = document.getElementById('state-detail');
const refreshBtn = document.getElementById('refresh-btn');

async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConnectionState' });
    const state = response.state;

    if (state === 'connected') {
      statusDiv.className = 'status connected';
      statusDiv.textContent = '✓ Connected to MCP Server';
      stateDetailDiv.textContent = 'Ready to receive commands';
    } else if (state === 'connecting') {
      statusDiv.className = 'status connecting';
      statusDiv.textContent = '⟳ Connecting...';
      stateDetailDiv.textContent = 'Attempting to connect to MCP server';
    } else {
      statusDiv.className = 'status disconnected';
      statusDiv.textContent = '✗ Disconnected';
      stateDetailDiv.textContent = 'MCP server not reachable. Make sure it\'s running.';
    }
  } catch (error) {
    statusDiv.className = 'status disconnected';
    statusDiv.textContent = '✗ Error';
    stateDetailDiv.textContent = error.message;
  }
}

refreshBtn.addEventListener('click', updateStatus);

// Update status on popup open
updateStatus();

// Auto-refresh every 2 seconds
setInterval(updateStatus, 2000);
