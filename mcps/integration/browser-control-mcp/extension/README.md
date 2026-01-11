# Claude Desktop Bridge - Chrome Extension

Connects your Chrome browser to Claude Desktop via WebSocket for enhanced automation capabilities.

## Features

- 🔗 WebSocket connection to MCP server (localhost:8765)
- 🔄 Auto-reconnect on connection loss
- 📄 Get page content, HTML, and metadata
- 🖱️ Click elements via CSS selectors
- ⌨️ Type text into input fields
- 🌐 Navigate to URLs
- 📸 Take screenshots
- ✂️ Get selected text
- 💻 Execute JavaScript in page context
- 📑 List all open tabs

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this directory: `chrome-extension/claude-desktop-bridge/`

### 2. Add Extension Icons (Optional)

See `icons/README.md` for instructions on creating icon files.

The extension will work without icons, but they make it easier to identify.

### 3. Start MCP Server

Make sure the MCP server is running on `localhost:8765`:

```bash
cd mcps/integration/browser-control-mcp
npm install
npm run build
npm start
```

### 4. Verify Connection

Click the extension icon in Chrome toolbar to open the popup and check connection status:
- ✓ Green = Connected
- ⟳ Yellow = Connecting
- ✗ Red = Disconnected

## Usage

Once the extension and MCP server are running, Claude Desktop can control your browser through natural language commands:

**Examples:**
- "Go to google.com and search for 'TypeScript tutorials'"
- "Click the first result"
- "Get the page content"
- "Take a screenshot of this page"
- "What text is currently selected on the page?"

## Architecture

```
Chrome Extension (Content + Background)
           ↕ WebSocket (ws://localhost:8765)
    MCP Server (Browser Control)
           ↕ MCP Protocol
      Claude Desktop
```

**Components:**
- `manifest.json` - Extension configuration (Manifest V3)
- `background.js` - Service worker managing WebSocket connection
- `content.js` - Injected into web pages, executes commands
- `popup.html/js` - Extension popup showing connection status

## Available Commands

Commands are sent from Claude Desktop through the MCP server to the extension:

| Command | Description | Parameters |
|---------|-------------|------------|
| `getPageContent` | Get page text, title, URL, metadata | none |
| `getPageHTML` | Get full page HTML source | none |
| `getSelection` | Get currently selected text | none |
| `executeScript` | Run JavaScript in page context | `script` |
| `clickElement` | Click an element | `selector` |
| `typeText` | Type into input field | `selector`, `text` |
| `navigate` | Navigate to URL | `url` |
| `getAllTabs` | List all open tabs | none |
| `takeScreenshot` | Capture page screenshot | none |

## Security

- WebSocket connection is **localhost only** (not exposed to internet)
- Commands only execute on user's machine
- No external data transmission
- All actions are logged to console for transparency

## Troubleshooting

### Extension not connecting

1. Check that MCP server is running:
   ```bash
   curl http://localhost:8103/health
   ```

2. Check WebSocket port is accessible:
   ```bash
   telnet localhost 8765
   ```

3. View extension logs:
   - Open `chrome://extensions/`
   - Click "Details" on Claude Desktop Bridge
   - Click "Inspect views: service worker"
   - Check Console tab for errors

### Commands not working

1. Make sure you're on a regular web page (not `chrome://` or `about://`)
2. Check if content script is injected (look for console message)
3. Try refreshing the page
4. Check popup for connection status

### Connection keeps dropping

- Firewall blocking WebSocket connection
- MCP server crashed (check server logs)
- Browser went to sleep (desktop/laptop power settings)

## Development

### Testing the Extension

1. Install the extension in developer mode
2. Open the browser console (`F12`)
3. Look for `[Bridge]` prefixed messages
4. Use the popup to monitor connection status

### Message Format

WebSocket messages use this format:

```json
{
  "requestId": "req_1_1234567890",
  "command": "getPageContent",
  "params": {
    "tabId": 123
  }
}
```

Response:
```json
{
  "requestId": "req_1_1234567890",
  "result": { ... },
  "error": null
}
```

## License

MIT
