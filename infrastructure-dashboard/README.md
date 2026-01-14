# Infrastructure Dashboard

A React-based visualization and testing dashboard for CarePayment microservices infrastructure.

## Features

### 1. Multi-Environment Support

Switch between different deployment environments:

- **Local**: Development on localhost (default)
- **Dev**: Development environment
- **Staging**: Pre-production testing
- **Prod**: Production environment

Environment selection is persisted in localStorage and affects:

- Base URLs displayed in the header
- Swagger spec fetching
- API execution endpoints

### 2. Application Views

#### Visual View

Interactive diagram showing the application's integrations and data flow between services.

#### Details View

Detailed breakdown of all application integrations with configuration information.

#### Flow View (Event Flow)

React Flow-based visualization showing service-to-service communication patterns.

#### API View (Swagger Panel)

Browse and execute OpenAPI/Swagger endpoints:

- **Endpoint Browser**: Tree view grouped by tags
- **Parameter Forms**: Input path and query parameters
- **Request Body Editor**: JSON editor with auto-generated samples
- **Custom Headers**: Add authentication and custom headers
- **Response Viewer**: Status, headers, body, and timing

#### Database View

Enhanced database schema visualization with three sub-tabs:

**Overview Tab**

- Database schema visualization showing tables and relationships
- Connected applications display
- Schema statistics summary (schemas, tables, columns counts)
- Application-database connection diagram
- Environment toggle (PROD/QA)

**Schema Explorer Tab**

- Full schema browser for 1,200+ tables across 56 schemas
- Search by table name or column name
- Filter by schema (CarePayment, Epic, FiServ, Accounting, etc.)
- Expandable table details showing all columns with data types
- Primary key and foreign key indicators
- Nullable column indicators

**Query Assistant Tab**

- AI-powered SQL query generation from natural language
- Pre-built common queries library (14 queries across 6 categories)
- Query categories: Patient, Settlement, Epic, FiServ, Accounting, Reporting
- Generated SQL with explanations and warnings
- Copy-to-clipboard functionality
- Query execution safety (SELECT only)

### 3. Authentication Testing

Test authentication configurations for each integration:

- API Key input with localStorage persistence
- OAuth flow visualization
- JWT token testing

## CarePayment Applications

| Key            | Application      | Repository  | Tech Stack         |
| -------------- | ---------------- | ----------- | ------------------ |
| servicelayer   | ServiceLayer API | Core        | .NET Framework 4.8 |
| integration    | Integration API  | Core        | .NET Framework 4.8 |
| corecommon     | Core.Common API  | Core.Common | .NET 6             |
| payments       | Payments API     | Payments    | .NET 6             |
| precare        | PreCare API      | PreCare     | .NET 6             |
| carelink       | CareLink         | Core        | Angular 14         |
| memberportal   | Member Portal    | Core        | Angular 14         |
| providerportal | Provider Portal  | Core        | Angular 14         |

## Environment URLs

Each application has environment-specific URLs configured:

```javascript
// Example: ServiceLayer API
baseUrls: {
  local: 'http://localhost:15155/',
  dev: 'https://servicelayer-dev.carepayment.com/',
  staging: 'https://servicelayer-staging.carepayment.com/',
  prod: 'https://servicelayer.carepayment.com/'
}
```

## Architecture

```
infrastructure-dashboard/
├── src/
│   ├── App.tsx                 # Main app with routing and state
│   ├── App.css                 # Global styles
│   ├── components/
│   │   ├── common/
│   │   │   ├── EnvironmentSelector.tsx  # Environment dropdown
│   │   │   └── MethodBadge.tsx          # HTTP method badge
│   │   ├── layout/
│   │   │   ├── Header.tsx      # App header with environment selector
│   │   │   └── Sidebar.tsx     # Application navigation sidebar
│   │   ├── database/
│   │   │   ├── QueryAssistant.tsx    # AI query generation component
│   │   │   └── SchemaExplorer.tsx    # Schema browser component
│   │   ├── panels/
│   │   │   ├── AuthTestSection.tsx   # Auth testing component
│   │   │   ├── DatabasePanel.tsx     # Database schema view with sub-tabs
│   │   │   ├── EventFlowPanel.tsx    # React Flow diagram
│   │   │   └── SwaggerPanel.tsx      # API documentation & execution
│   │   └── views/
│   │       ├── DetailsView.tsx       # Integration details
│   │       ├── IntegrationView.tsx   # Single integration detail
│   │       └── VisualView.tsx        # Visual diagram view
│   ├── data/
│   │   └── commonQueries.ts    # Pre-built SQL queries library
│   ├── hooks/
│   │   └── useSchemaData.ts    # Schema loading and search hook
│   ├── services/
│   │   └── api.ts              # API client for orchestrator
│   └── types/
│       ├── infrastructure.ts   # Core types including Environment
│       ├── schema.ts           # Database schema types
│       └── swagger.ts          # OpenAPI/Swagger types
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- QE Orchestrator running on port 3000

### Installation

```bash
cd infrastructure-dashboard
npm install
```

### Running Locally

```bash
npm run dev
```

Dashboard runs at `http://localhost:8082`

### Building for Production

```bash
npm run build
```

Output is in the `dist/` directory.

## API Dependencies

The dashboard requires the QE Orchestrator for:

### Proxy Routes (CORS bypass)

- `GET /api/proxy/swagger?url=` - Fetch swagger specs
- `POST /api/proxy/execute` - Execute API calls

### Infrastructure Data

- `GET /api/infrastructure/status` - Get application configurations

### AI Query Assistant

- `POST /api/ai/generate-query` - Generate SQL from natural language
- `GET /api/ai/schema-summary` - Get schema summary for a database
- `POST /api/ai/explain-query` - Explain an existing SQL query

### Schema Data

Schema JSON files are served from `/schemas/` directory:

- `CarePayment_PROD.json` - Production database schema
- `CarePayment_QA.json` - QA database schema

## Type Definitions

### Environment

```typescript
export type Environment = "local" | "dev" | "staging" | "prod";
```

### EnvironmentUrls

```typescript
export interface EnvironmentUrls {
  local?: string;
  dev?: string;
  staging?: string;
  prod?: string;
}
```

### Application

```typescript
export interface Application {
  name: string;
  tech: string;
  color: string;
  baseUrl: string;
  baseUrls?: EnvironmentUrls;
  repository?: string;
  swagger?: {
    enabled: boolean;
    url: string;
    urls?: EnvironmentUrls;
    version?: string;
  };
  integrations: Record<string, Integration>;
}
```

## Configuration

### Data Source

Application data is defined in:

```
/orchestrator/src/data/carePaymentApps.js
```

### Orchestrator URL

The dashboard connects to the orchestrator at:

```typescript
const ORCHESTRATOR_URL = "http://localhost:3000";
```

## Recent Changes (January 2026)

### Database Panel Enhancements (Latest)

- **Schema Explorer**: Browse 1,200+ tables across 56 schemas with search
- **Query Assistant**: AI-powered SQL generation from natural language using Claude
- **Common Queries Library**: 14 pre-built queries across 6 categories
- **Environment Toggle**: Switch between PROD and QA database schemas
- **Schema Statistics**: Visual summary of database structure

### Environment Selector Feature

- Added environment dropdown (Local/Dev/Staging/Prod)
- Environment-specific base URLs and swagger URLs
- Persistent environment selection via localStorage

### API Panel Enhancements

- Proxy-based swagger fetching (bypasses CORS)
- API execution with parameter forms
- Request body editor with sample generation
- Response viewer with status, headers, body, timing

### Auth Testing Improvements

- Editable API key input fields
- localStorage persistence per app/integration
- Show/hide toggle for sensitive values

## Troubleshooting

### CORS Errors

If swagger fetching fails with CORS errors:

1. Ensure the orchestrator is running on port 3000
2. Check that `/api/proxy/swagger` route is registered
3. Verify the target API allows requests from the proxy

### Environment Not Persisting

- Check browser localStorage for `carepayment_environment` key
- Clear localStorage and refresh if corrupted

### API Execution Fails

- Verify orchestrator `/api/proxy/execute` endpoint is working
- Check network tab for request/response details
- Ensure authentication headers are correctly formatted

## License

Internal use only - CarePayment Technologies
