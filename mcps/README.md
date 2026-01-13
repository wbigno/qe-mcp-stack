# QE MCP Stack - Service Documentation

## Overview

This directory contains all Model Context Protocol (MCP) services that power the QE (Quality Engineering) stack. Each MCP is a containerized microservice that handles specific analysis or integration tasks.

---

## MCP Categories

### Integration MCPs (Port Range: 8100-8199)

| MCP              | Port | Description                                                |
| ---------------- | ---- | ---------------------------------------------------------- |
| **azure-devops** | 8100 | Azure DevOps integration (work items, queries, test cases) |

### Code Analysis MCPs (Port Range: 8200-8299)

| MCP                              | Port | Description                                                 |
| -------------------------------- | ---- | ----------------------------------------------------------- |
| **code-analyzer**                | 8200 | .NET code structure analysis (classes, methods, complexity) |
| **coverage-analyzer**            | 8201 | Test coverage analysis and gap identification               |
| **blast-radius-analyzer**        | 8202 | Change impact analysis with fuzzy matching                  |
| **migration-analyzer**           | 8203 | Database migration analysis                                 |
| **javascript-code-analyzer**     | 8204 | JavaScript/TypeScript code analysis                         |
| **javascript-coverage-analyzer** | 8205 | JavaScript test coverage analysis                           |

### Quality Analysis MCPs (Port Range: 8300-8399)

| MCP                    | Port | Description                                         |
| ---------------------- | ---- | --------------------------------------------------- |
| **risk-analyzer**      | 8300 | QE risk analysis with Probability × Impact scoring  |
| **integration-mapper** | 8301 | Integration point detection (Epic, Financial, APIs) |

### Playwright MCPs (Port Range: 8400-8499)

| MCP                      | Port | Description                        |
| ------------------------ | ---- | ---------------------------------- |
| **playwright-generator** | 8400 | Automated test generation          |
| **playwright-analyzer**  | 8401 | Test analysis and optimization     |
| **playwright-healer**    | 8402 | Self-healing test selector updates |

---

## Key MCPs - Detailed Documentation

### Blast Radius Analyzer

**Location:** `/mcps/code-analysis/blast-radius-analyzer/`

**Purpose:** Analyzes the impact of code changes by identifying affected components, integrations, and tests.

**Key Features:**

- Fuzzy file matching (6 strategies)
- Dependency graph traversal (configurable depth)
- Integration detection (Epic, Financial, APIs, Database)
- Risk scoring based on affected components

**Scoring Methodology:**

```
Risk Score = Component Score + Integration Score + Test Score

Where:
- Component Score = min(affected_components × 5, 30)
- Integration Score = min(Σ(integration_weight × 10), 50)
- Test Score = min(directly_affected_tests × 5, 20)
```

[Full documentation](./code-analysis/blast-radius-analyzer/README.md)

---

### Risk Analyzer

**Location:** `/mcps/quality-analysis/risk-analyzer/`

**Purpose:** Performs comprehensive QE risk analysis with Probability × Impact matrix.

**Key Features:**

- 6-factor risk scoring (complexity, coverage, integration, change frequency, business impact, defect history)
- QE Risk Matrix (Probability × Impact)
- AC-to-Risk mapping
- Test prioritization recommendations

**Factor Weights:**
| Factor | Weight |
|--------|--------|
| Complexity | 20% |
| Coverage | 15% |
| Integration | 25% |
| Change Frequency | 10% |
| Business Impact | 20% |
| Defect History | 10% |

**Risk Levels:**
| Score | Level | Action |
|-------|-------|--------|
| 100+ | Critical | Stakeholder approval, full regression |
| 60-99 | High | Thorough testing, senior review |
| 30-59 | Medium | Standard testing |
| 0-29 | Low | Basic validation |

[Full documentation](./quality-analysis/risk-analyzer/README.md)

---

### Integration Mapper

**Location:** `/mcps/quality-analysis/integration-mapper/`

**Purpose:** Detects and maps integration points in the codebase.

**Detection Patterns:**

| Integration Type | Detection Patterns                         | Risk Level |
| ---------------- | ------------------------------------------ | ---------- |
| Epic/EHR         | `Epic`, `EHR`, `FHIR`, `HL7`               | Critical   |
| Financial        | `Payment`, `Billing`, `Invoice`, `Stripe`  | Critical   |
| External API     | `HttpClient`, `RestClient`, `API`          | High       |
| Database         | `DbContext`, `Repository`, `SqlConnection` | High       |
| Messaging        | `Queue`, `Event`, `Message`, `RabbitMQ`    | Medium     |

---

## Common Endpoints

All MCPs implement these standard endpoints:

| Endpoint  | Method | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| `/health` | GET    | Health check (returns `{ status: 'healthy' }`) |

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────>│   Orchestrator  │────>│      MCPs       │
│   (Frontend)    │     │   (API Layer)   │     │   (Services)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   MCP Calls:          │
                    │   • Risk Analyzer     │
                    │   • Blast Radius      │
                    │   • Integration Map   │
                    │   • Code Analyzer     │
                    │   • Coverage Analyzer │
                    └───────────────────────┘
```

---

## Running MCPs

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Start specific MCP
docker-compose up -d blast-radius-analyzer
```

### Individual Container

```bash
cd mcps/code-analysis/blast-radius-analyzer
docker build -t blast-radius-analyzer .
docker run -p 8202:8202 blast-radius-analyzer
```

---

## Environment Variables

| Variable            | Description                        | Example      |
| ------------------- | ---------------------------------- | ------------ |
| `PORT`              | Service port                       | `8202`       |
| `NODE_ENV`          | Environment                        | `production` |
| `ANTHROPIC_API_KEY` | Claude API key (for AI-based MCPs) | `sk-ant-...` |

---

## Adding a New MCP

1. Create directory under appropriate category:

   ```
   mcps/{category}/{mcp-name}/
   ├── src/
   │   └── index.js
   ├── package.json
   ├── Dockerfile
   └── README.md
   ```

2. Add to `docker-compose.yml`

3. Register in `orchestrator/src/services/mcpManager.js`

4. Document in this README
