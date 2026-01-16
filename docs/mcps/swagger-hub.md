# Swagger Hub

Central landing page for all QE MCP Stack API documentation.

## Features

- **Aggregated API Documentation**: Interactive Swagger UI with all MCP APIs in one place
- **Real-time Health Monitoring**: Live status indicators for all MCPs
- **Interactive API Testing**: Test any API endpoint directly from the browser
- **Complete API Details**: Request/response schemas, examples, and parameter descriptions
- **Auto-refresh**: Automatically updates health status every 30 seconds (toggleable)
- **Quick Links**: Direct access to all MCP services and documentation
- **Categorized View**: MCPs organized by function (Integration, Code Analysis, Quality Analysis)
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

The Swagger Hub is a lightweight Express.js server that:

1. **Aggregates API Documentation**: Fetches OpenAPI specs from orchestrator and displays in Swagger UI
2. **Interactive Testing Interface**: Enables direct API testing from the browser
3. **Health Monitoring**: Proxies health check requests to the orchestrator
4. **Real-time Status**: Displays live status of all MCPs with auto-refresh
5. **Quick Navigation**: Provides direct links to all MCP services and documentation

The hub acts as a **single entry point** for developers to discover, explore, and test all QE MCP Stack APIs.

## Configuration

### Environment Variables

```bash
PORT=8000                              # Server port (default: 8000)
ORCHESTRATOR_URL=http://localhost:3000 # Orchestrator URL
```

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Run in Production

```bash
npm start
```

## Docker

### Build Image

```bash
docker build -t swagger-hub .
```

### Run Container

```bash
docker run -p 8000:8000 \
  -e ORCHESTRATOR_URL=http://orchestrator:3000 \
  swagger-hub
```

## Usage

Once running, access the Swagger Hub at:

- **Landing Page**: http://localhost:8000
- **Aggregated API Docs**: http://localhost:8000/api-docs
- **OpenAPI Spec**: http://localhost:8000/api/swagger/aggregated.json

### Features:

**Interactive API Documentation** (`/api-docs`)

- Complete Swagger UI with all 15 MCPs
- Test any API endpoint directly in your browser
- View request/response examples
- Download OpenAPI specification
- Organized by service category
- Real-time spec aggregation from orchestrator

**System Overview**

- Total number of MCPs
- Number of healthy MCPs
- Last update timestamp
- Orchestrator connection status

**MCP Categories**

1. **Integration MCPs (8100-8199)**
   - Azure DevOps (8100): Work item management
   - Third Party (8101): External integrations
   - Test Plan Manager (8102): Test planning
   - Browser Control (8103): Chrome browser automation

2. **Code Analysis MCPs (8200-8299)**
   - Code Quality Analyzer (8200): Static code analysis
   - Infrastructure Analyzer (8201): Infrastructure analysis
   - Test Analyzer (8202): Test analysis
   - Migration Analyzer (8203): Migration tracking

3. **Test MCPs (8400-8499)**
   - Playwright Generator (8400): Test generation
   - Test Generation (8300): AI-powered test generation
   - Unit Test (8301): Unit test generation

4. **Framework MCPs**
   - Swagger Hub (8000): API documentation hub
   - MCP SDK: Base MCP framework
   - Shared: Shared utilities

**For Each MCP**

- Health status badge (Healthy/Unhealthy/Unknown)
- Service URL
- Description
- Quick links to:
  - API Documentation (`/api-docs`)
  - Health endpoint (`/health`)

**Auto-refresh**

- Toggle on/off with switch in header
- Refreshes every 30 seconds when enabled
- Manual refresh button available

## API Endpoints

### GET /api-docs

**Interactive Swagger UI with aggregated API documentation from all MCPs.**

This endpoint serves a complete Swagger UI interface that aggregates API documentation from all healthy MCPs. You can:

- Browse all available endpoints
- View request/response schemas
- Test APIs directly in the browser
- Download OpenAPI specifications

Fetches the aggregated spec from the orchestrator in real-time and displays it in an interactive UI.

### GET /api/swagger/aggregated.json

**Download the complete OpenAPI 3.0 specification.**

Returns the raw JSON specification that combines all MCP APIs into a single OpenAPI document.

### GET /health

Health check endpoint for the Swagger Hub itself.

**Response:**

```json
{
  "status": "healthy",
  "service": "swagger-hub",
  "timestamp": "2026-01-08T20:00:00.000Z",
  "uptime": 123.456
}
```

### GET /api/mcps

Fetches current status of all MCPs from the orchestrator.

**Response:**

```json
{
  "success": true,
  "data": {
    "integration": {
      "azureDevOps": {
        "status": "healthy",
        "url": "http://azure-devops:8100",
        "category": "integration"
      }
    },
    "summary": {
      "mcpsHealthy": 15,
      "mcpsTotal": 15
    }
  },
  "timestamp": "2026-01-08T20:00:00.000Z"
}
```

## File Structure

```
swagger-hub/
├── src/
│   └── server.js          # Express server
├── public/
│   ├── index.html         # Main HTML page
│   ├── css/
│   │   └── styles.css     # Styling
│   └── js/
│       └── app.js         # Client-side logic
├── Dockerfile             # Container definition
├── package.json           # Dependencies
└── README.md             # This file
```

## Integration with QE MCP Stack

The Swagger Hub integrates with the orchestrator at `http://orchestrator:3000` to:

1. Fetch real-time health status of all MCPs
2. Get MCP URLs and categories
3. Display aggregated system status

It provides a single entry point for developers to:

- Discover available MCPs
- Access API documentation
- Monitor system health
- Navigate to specific services

## Styling

The hub uses a modern, gradient design with:

- Purple gradient background
- Clean white cards
- Status color coding:
  - Green: Healthy
  - Red: Unhealthy
  - Gray: Unknown
- Responsive grid layouts
- Smooth animations and transitions

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT
