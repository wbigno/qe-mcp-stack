# Browser Control MCP

## Overview

The Browser Control MCP provides Chrome browser automation capabilities via a WebSocket bridge connection to a Chrome extension. This enables Claude Desktop and other clients to control and interact with web pages through natural language commands.

**Port**: 8103 (HTTP API), 8765 (WebSocket Bridge)
**Swagger UI**: http://localhost:8103/api-docs
**Category**: Integration MCP
**Docker Container**: `qe-browser-control-mcp`

## Architecture

```
Chrome Extension (Content + Background Scripts)
         ↕ WebSocket (ws://localhost:8765)
    Browser Control MCP Server (HTTP + WS)
         ↕ HTTP REST API (port 8103)
         Claude Desktop / Orchestrator
```

The system consists of three main components:
1. **Chrome Extension**: Injected into web pages, communicates with MCP via WebSocket
2. **WebSocket Bridge Server**: Manages WebSocket connections (port 8765)
3. **HTTP API Server**: RESTful API for browser automation (port 8103)

## Features

- 🌐 **Page Navigation**: Navigate to URLs and manage browser state
- 📄 **Content Extraction**: Get page content, HTML, metadata, and selected text
- 🖱️ **Element Interaction**: Click elements and type text using CSS selectors
- 💻 **Script Execution**: Execute arbitrary JavaScript in page context
- 📸 **Screenshots**: Capture visible page screenshots
- 📑 **Tab Management**: List and manage all open browser tabs
- 🔄 **Auto-Reconnect**: WebSocket connection with automatic reconnection
- 💚 **Health Monitoring**: Built-in health checks and status endpoints

## Chrome Extension Setup

### Installation

1. **Load Extension in Chrome**:
   ```
   1. Open Chrome and navigate to chrome://extensions/
   2. Enable "Developer mode" (toggle in top right)
   3. Click "Load unpacked"
   4. Select: mcps/integration/browser-control-mcp/extension/
   ```

2. **Verify Connection**:
   - Click the extension icon in Chrome toolbar
   - Check that status shows "✓ Connected to MCP Server"
   - WebSocket should connect to `ws://localhost:8765`

3. **Start MCP Server** (Docker):
   ```bash
   docker compose up browser-control-mcp
   ```

### Extension Files

- `manifest.json` - Extension configuration (Manifest V3)
- `background.js` - Service worker managing WebSocket connection
- `content.js` - Injected into pages for DOM interaction
- `popup.html/js` - Extension popup showing connection status
- `offscreen.html/js` - Offscreen document for WebSocket handling

## API Endpoints

### Check Extension Connection

```http
POST /browser/check-connection
```

**Response**:
```json
{
  "success": true,
  "connected": true,
  "message": "Extension is connected"
}
```

### Get Page Content

```http
POST /browser/get-page-content
```

**Response**:
```json
{
  "success": true,
  "result": {
    "url": "https://example.com",
    "title": "Example Domain",
    "text": "Page text content...",
    "metadata": {
      "description": "Example domain",
      "keywords": "example, domain"
    },
    "links": [
      { "text": "More information", "href": "https://example.com/more" }
    ]
  }
}
```

### Get Page HTML

```http
POST /browser/get-page-html
```

**Response**:
```json
{
  "success": true,
  "result": {
    "html": "<!DOCTYPE html><html>...</html>"
  }
}
```

### Click Element

```http
POST /browser/click-element
Content-Type: application/json

{
  "selector": "#submit-button"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "success": true,
    "selector": "#submit-button",
    "elementType": "BUTTON",
    "elementText": "Submit"
  }
}
```

### Type Text

```http
POST /browser/type-text
Content-Type: application/json

{
  "selector": "input[name='email']",
  "text": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "success": true,
    "selector": "input[name='email']",
    "text": "user@example.com"
  }
}
```

### Navigate to URL

```http
POST /browser/navigate
Content-Type: application/json

{
  "url": "https://google.com"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "success": true,
    "url": "https://google.com"
  }
}
```

### Execute JavaScript

```http
POST /browser/execute-script
Content-Type: application/json

{
  "script": "return document.title;"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "result": "Example Domain",
    "error": null
  }
}
```

### Take Screenshot

```http
POST /browser/take-screenshot
Content-Type: application/json

{
  "fullPage": false
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "screenshot": "data:image/png;base64,iVBORw0KG..."
  }
}
```

### Get Bridge Status

```http
GET /bridge/status
```

**Response**:
```json
{
  "success": true,
  "status": {
    "extensionConnected": true,
    "lastActivity": "2026-01-11T12:45:30.123Z",
    "messageCount": 42,
    "wsPort": 8765,
    "httpPort": 8103
  }
}
```

## Usage Examples

### With Claude Desktop

Once the extension and MCP are running, you can use natural language commands:

- "Navigate to google.com and search for 'TypeScript tutorials'"
- "Click the first search result"
- "Get the page content and summarize it"
- "Take a screenshot of this page"
- "What text is currently selected on the page?"

### With HTTP API

```bash
# Check connection
curl -X POST http://localhost:8103/browser/check-connection

# Navigate to URL
curl -X POST http://localhost:8103/browser/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com"}'

# Get page content
curl -X POST http://localhost:8103/browser/get-page-content

# Click element
curl -X POST http://localhost:8103/browser/click-element \
  -H "Content-Type: application/json" \
  -d '{"selector": ".search-button"}'
```

## Security

- WebSocket server binds to `0.0.0.0:8765` for Docker port forwarding
- Only accepts connections from localhost in production
- No external data transmission
- All browser actions are logged to console for transparency
- Extension requires explicit user installation
- Commands only execute on user's local machine

## Troubleshooting

### Extension Not Connecting

1. **Check MCP Server Status**:
   ```bash
   curl http://localhost:8103/health
   curl http://localhost:8103/bridge/status
   ```

2. **Verify WebSocket Port**:
   ```bash
   docker ps | grep browser-control-mcp
   # Should show: 0.0.0.0:8765->8765/tcp
   ```

3. **Check Extension Logs**:
   - Open `chrome://extensions/`
   - Click "Inspect views: service worker" on Claude Desktop Bridge
   - Check Console tab for errors

### Commands Not Working

1. Make sure you're on a regular web page (not `chrome://` or `about://` URLs)
2. Check if content script is injected (look for `[Bridge Content]` console messages)
3. Try refreshing the page
4. Verify popup shows "✓ Connected"

### Connection Keeps Dropping

- Check firewall isn't blocking WebSocket port 8765
- Review MCP server logs: `docker logs qe-browser-control-mcp`
- Check system power settings (laptop sleep mode)

## Docker Configuration

The MCP runs in Docker with these settings:

```yaml
browser-control-mcp:
  build: mcps/integration/browser-control-mcp
  ports:
    - "8103:8103"  # HTTP API
    - "8765:8765"  # WebSocket Bridge
  environment:
    - NODE_ENV=production
    - PORT=8103
    - WS_PORT=8765
  healthcheck:
    test: ["CMD", "node", "-e", "...health check..."]
    interval: 30s
    timeout: 10s
    retries: 3
```

## Development

### Building TypeScript

```bash
cd mcps/integration/browser-control-mcp
npm install
npm run build
```

### Running Locally (Non-Docker)

```bash
cd mcps/integration/browser-control-mcp
npm install
npm run build
PORT=8103 WS_PORT=8765 npm start
```

### Extension Development

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension card
4. Test changes in browser

## Dependencies

- **Node.js** 18+ (Alpine)
- **express** ^4.18.2 - HTTP server
- **ws** ^8.14.2 - WebSocket implementation
- **@qe-mcp-stack/mcp-sdk** - Base MCP framework
- **@qe-mcp-stack/shared** - Shared utilities

## Related Documentation

- [Chrome Extension README](./extension/README.md) - Detailed extension documentation
- [Swagger API Docs](http://localhost:8103/api-docs) - Interactive API documentation
- [Orchestrator Health](http://localhost:3000/health) - MCP status dashboard

## Contributing

When making changes to this MCP:

1. Update TypeScript source files in `src/`
2. Rebuild: `npm run build`
3. Test locally before Docker build
4. Update this README if adding new features
5. Add Swagger documentation for new endpoints
