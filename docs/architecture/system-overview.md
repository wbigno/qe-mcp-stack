# QE MCP Stack - System Overview

## Architecture

The QE MCP Stack is a microservices-based quality engineering platform built on the Model Context Protocol (MCP) pattern. The system is organized as a monorepo using npm workspaces and Turbo for build orchestration.

## High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │ Swagger Hub  │  │  IDE Tools   │         │
│  │  (React)     │  │   (HTML/JS)  │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    API Gateway                                   │
│                  ┌──────────────────┐                           │
│                  │   Orchestrator   │                           │
│                  │    (port 3000)   │                           │
│                  └──────────────────┘                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼───────┐
│ Integration   │  │ Code Analysis   │  │   Quality    │
│     MCPs      │  │      MCPs       │  │   Analysis   │
│  (8100-8199)  │  │   (8200-8299)   │  │     MCPs     │
│               │  │                 │  │ (8300-8399)  │
│ • Azure       │  │ • Code         │  │ • Risk       │
│   DevOps      │  │   Analyzer     │  │   Analyzer   │
│ • Third Party │  │ • Coverage     │  │ • Integration│
│ • Test Plan   │  │   Analyzer     │  │   Mapper     │
│   Manager     │  │ • Playwright   │  │ • Test       │
│               │  │   Generator    │  │   Selector   │
│               │  │ • Migration    │  │              │
│               │  │   Analyzer     │  │              │
└───────────────┘  └─────────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │   Shared Packages     │
                │                       │
                │ • @qe-mcp-stack/      │
                │   shared              │
                │ • @qe-mcp-stack/      │
                │   mcp-sdk             │
                │ • @qe-mcp-stack/      │
                │   test-framework      │
                └───────────────────────┘
```

## Component Descriptions

### Dashboard (port 5173)
- **Purpose**: User interface for visualization and analysis
- **Technology**: React, Vite
- **Features**:
  - Code analysis visualization
  - Test gap analysis
  - Migration tracking
  - Real-time updates

### Swagger Hub (port 8000)
- **Purpose**: Central API documentation portal
- **Technology**: HTML, CSS, JavaScript
- **Features**:
  - Links to all MCP documentation
  - Health check status
  - Auto-refresh
  - Quick navigation

### Orchestrator (port 3000)
- **Purpose**: API gateway and request router
- **Technology**: Node.js, Express
- **Features**:
  - Routes requests to appropriate MCPs
  - Aggregates Swagger documentation
  - Health check aggregation
  - Authentication/authorization

### Integration MCPs (8100-8199)
Microservices that integrate with external systems:

- **Azure DevOps MCP (8100)**: Azure DevOps API integration
- **Third Party MCP (8101)**: Third-party integrations (Stripe, etc.)
- **Test Plan Manager MCP (8102)**: Test plan management

### Code Analysis MCPs (8200-8299)
Microservices for analyzing codebases:

- **Code Analyzer MCP (8200)**: Cyclomatic complexity, code metrics
- **Coverage Analyzer MCP (8201)**: Test coverage and gap detection
- **Playwright Generator MCP (8202)**: AI-powered test generation
- **Migration Analyzer MCP (8203)**: Core → Core.Common migration tracking

### Quality Analysis MCPs (8300-8399)
Microservices for quality assessment:

- **Risk Analyzer MCP (8300)**: Risk scoring and assessment
- **Integration Mapper MCP (8301)**: Integration discovery and mapping
- **Test Selector MCP (8302)**: Intelligent test selection

### Shared Packages
Common libraries used across all services:

- **@qe-mcp-stack/shared**: Auth, config, logging, types, utils
- **@qe-mcp-stack/mcp-sdk**: Base classes for building MCPs
- **@qe-mcp-stack/test-framework**: Playwright fixtures and helpers

## Data Flow

### 1. User Request Flow
```
User → Dashboard → Orchestrator → MCP → Response
```

### 2. Inter-MCP Communication
```
MCP A → MCP Client → Orchestrator → MCP B
```

### 3. External Integration Flow
```
MCP → External API → Response → MCP → Orchestrator → Dashboard
```

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Custom CSS with modern features

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript

### Testing
- **E2E**: Playwright
- **Unit**: Jest
- **API**: Supertest

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston logging

### Build & Development
- **Monorepo**: npm workspaces
- **Build System**: Turbo
- **Package Manager**: npm

## Design Principles

### 1. Microservices Architecture
Each MCP is an independent service with:
- Single responsibility
- Own API documentation
- Independent deployment
- Health check endpoint

### 2. API-First Design
All MCPs expose:
- RESTful APIs
- OpenAPI/Swagger documentation at `/api-docs`
- Health check at `/health`
- Standardized error responses

### 3. Shared Infrastructure
Common functionality is extracted into shared packages:
- Reduces duplication
- Ensures consistency
- Simplifies maintenance

### 4. Observable Systems
All services include:
- Structured logging
- Health checks
- Error tracking
- Performance metrics

### 5. Developer Experience
Focus on productivity:
- Fast builds with Turbo
- Hot reload in development
- Comprehensive documentation
- Type safety with TypeScript

## Scalability

### Horizontal Scaling
- MCPs are stateless and can be scaled independently
- Load balancing via orchestrator
- Docker makes deployment consistent

### Vertical Scaling
- Node.js services can utilize multiple cores
- Caching for expensive operations
- Async/await for I/O operations

## Security

### Authentication
- JWT tokens for user authentication
- API keys for service-to-service communication

### Authorization
- Role-based access control (RBAC)
- Service-level permissions

### Data Protection
- Secrets managed via environment variables
- HTTPS for all external communication
- Input validation on all endpoints

## Monitoring & Observability

### Logging
- Winston structured logging
- Log levels: error, warn, info, debug
- Centralized log aggregation

### Health Checks
- Each MCP exposes `/health` endpoint
- Orchestrator aggregates health status
- Docker health checks for container management

### Metrics
- API response times
- Error rates
- Resource utilization

## Deployment

### Local Development
```bash
npm run dev
```

### Docker Deployment
```bash
docker-compose up
```

### Production Deployment
- Docker images built via CI/CD
- Deployed to container orchestration platform
- Environment-specific configuration

## Future Enhancements

### Planned Features
- [ ] OpenTelemetry tracing
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Machine learning for test prediction

### Technical Debt
- [ ] Implement Redis caching
- [ ] Add rate limiting
- [ ] Enhance error recovery
- [ ] Add performance monitoring

## Related Documentation

- [MCP Architecture](./mcp-architecture.md)
- [Data Flow](./data-flow.md)
- [Decision Records](./decision-records/)
