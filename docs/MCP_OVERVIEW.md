# QE MCP Stack - Complete MCP Overview

## 📋 Table of Contents

- [Quick Navigation](#quick-navigation)
- [Architecture Overview](#architecture-overview)
- [Docker MCPs (14 Services)](#docker-mcps-14-services)
- [STDIO MCPs (14 Services)](#stdio-mcps-14-services)
- [Which MCP Do I Need?](#which-mcp-do-i-need)
- [API Endpoint to MCP Mapping](#api-endpoint-to-mcp-mapping)
- [MCP Communication Patterns](#mcp-communication-patterns)

---

## Quick Navigation

### By Category
- 🐳 [Docker MCPs](DOCKER_MCPS.md) - Always running HTTP services
- 📝 [STDIO MCPs](STDIO_MCPS.md) - On-demand process-based services

### By Function
- **Code Analysis**: [code-analyzer](#code-analyzer), [coverage-analyzer](#coverage-analyzer), [architecture-analyzer](#architecture-analyzer)
- **Test Generation**: [unit-test-generator](#unit-test-generator), [integration-test-generator](#integration-test-generator), [playwright-generator](#playwright-generator)
- **ADO Integration**: [azure-devops](#azure-devops), [requirements-analyzer](#requirements-analyzer)
- **Quality Analysis**: [quality-metrics-analyzer](#quality-metrics-analyzer), [security-analyzer](#security-analyzer), [risk-analyzer](#risk-analyzer)

### By Status
- ✅ **Production Ready**: All Docker MCPs
- 🚧 **In Development**: STDIO MCPs (require implementation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator (3000)                  │
│               Central Coordinator & API Gateway          │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Docker MCPs  │    │ Docker MCPs  │    │  STDIO MCPs  │
│  (Ports      │    │  (Ports      │    │  (On-demand) │
│  3001-3007)  │    │  3008-3013)  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Your .NET   │
                    │ Applications │
                    └──────────────┘
```

### Communication Patterns

**Docker MCPs:**
- Always running HTTP servers
- Direct HTTP/REST API access
- Port-based (3000-3013)
- Health check endpoints
- Persistent state in `/app/data`

**STDIO MCPs:**
- Started on-demand by orchestrator
- JSON-RPC via stdin/stdout
- No persistent state
- Lightweight and fast
- Exit when task complete

---

## Docker MCPs (14 Services)

### Central Services

#### orchestrator
- **Port:** 3000
- **Purpose:** Central API gateway and MCP coordinator
- **Type:** Node.js/Express
- **Endpoints:** RESTful API for all operations
- **Dependencies:** All other MCPs
- **Details:** [→ README](../orchestrator/README.md)

---

### Code Analysis Services (Ports 3001-3002)

#### code-analyzer
- **Port:** 3001
- **Purpose:** Scan .NET C# applications, identify classes, methods, integrations
- **Type:** Node.js/Docker
- **Key Features:**
  - AST parsing (planned: Roslyn)
  - Epic API detection
  - Financial system touchpoints
  - Dependency mapping
- **Details:** [→ README](../mcps/code-analyzer/README.md)

#### coverage-analyzer
- **Port:** 3002
- **Purpose:** Analyze xUnit test coverage, identify gaps
- **Type:** Node.js/Docker
- **Key Features:**
  - Parse coverage reports
  - Identify untested methods
  - Missing negative tests
  - Coverage percentage calculation
- **Details:** [→ README](../mcps/coverage-analyzer/README.md)

---

### Integration Services (Port 3003)

#### azure-devops
- **Port:** 3003
- **Purpose:** Azure DevOps API integration
- **Type:** Node.js/Docker
- **Key Features:**
  - Pull work items/stories
  - Query work items
  - Update work items
  - Create test cases
  - ADO API v7.0
- **Details:** [→ README](../mcps/azure-devops/README.md)

---

### UI Test Services (Ports 3004-3006)

#### playwright-analyzer
- **Port:** 3004
- **Purpose:** Analyze critical UI paths and test stability
- **Type:** Node.js/Playwright
- **Key Features:**
  - Critical path detection
  - User flow analysis
  - Risk assessment
  - Test prioritization
- **Details:** [→ README](../mcps/playwright-analyzer/README.md)

#### playwright-generator
- **Port:** 3005
- **Purpose:** Generate Playwright TypeScript tests
- **Type:** Node.js/Playwright + AI
- **Key Features:**
  - Test code generation
  - Page object models
  - Test scaffolding
  - AI-powered test creation
- **Details:** [→ README](../mcps/playwright-generator/README.md)

#### playwright-healer
- **Port:** 3006
- **Purpose:** Self-healing test maintenance
- **Type:** Node.js/Playwright + AI
- **Key Features:**
  - Detect failing selectors
  - Suggest fixes
  - Auto-repair tests
  - Learning from patterns
- **Details:** [→ README](../mcps/playwright-healer/README.md)

---

### Architecture Services (Ports 3007-3008, 3013)

#### architecture-analyzer
- **Port:** 3007
- **Purpose:** Analyze application architecture and dependencies
- **Type:** Node.js/Docker
- **Key Features:**
  - Component mapping
  - Dependency graphs
  - Architecture diagrams
  - Layer detection
- **Details:** [→ README](../mcps/architecture-analyzer/README.md)

#### integration-mapper
- **Port:** 3008
- **Purpose:** Map API integrations and external systems
- **Type:** Node.js/Docker
- **Key Features:**
  - API endpoint discovery
  - Integration documentation
  - Schema mapping
  - External system catalog
- **Details:** [→ README](../mcps/integration-mapper/README.md)

#### data-model-analyzer
- **Port:** 3013
- **Purpose:** Analyze data models and entity relationships
- **Type:** Node.js/Docker
- **Key Features:**
  - Entity relationship mapping
  - Database schema analysis
  - Data flow tracking
  - Model documentation
- **Details:** [→ README](../mcps/data-model-analyzer/README.md)

---

### Quality Services (Ports 3009-3012)

#### risk-analyzer
- **Port:** 3009
- **Purpose:** Assess risk scores and identify high-risk areas
- **Type:** Node.js/Docker
- **Key Features:**
  - Risk scoring
  - Critical path identification
  - Impact analysis
  - Priority recommendations
- **Details:** [→ README](../mcps/risk-analyzer/README.md)

#### workflow-analyzer
- **Port:** 3010
- **Purpose:** Analyze workflows and suggest optimizations
- **Type:** Node.js/Docker + AI
- **Key Features:**
  - Workflow pattern detection
  - Bottleneck identification
  - Optimization suggestions
  - Process documentation
- **Details:** [→ README](../mcps/workflow-analyzer/README.md)

#### quality-metrics-analyzer
- **Port:** 3011
- **Purpose:** Track quality metrics and trends over time
- **Type:** Node.js/Docker
- **Key Features:**
  - Historical metrics
  - Trend analysis
  - Quality dashboards
  - Benchmark tracking
- **Details:** [→ README](../mcps/quality-metrics-analyzer/README.md)

#### security-analyzer
- **Port:** 3012
- **Purpose:** Scan for security vulnerabilities
- **Type:** Node.js/Docker
- **Key Features:**
  - Vulnerability scanning
  - Security best practices
  - Compliance checking
  - Security reporting
- **Details:** [→ README](../mcps/security-analyzer/README.md)

---

## STDIO MCPs (14 Services)

### Test Generation Services

#### unit-test-generator
- **Purpose:** Generate xUnit unit tests for .NET code
- **Type:** STDIO/On-demand
- **Key Features:**
  - xUnit test generation
  - Mock setup
  - Negative test cases
  - AI-powered
- **Input:** `{app, className, methodName}`
- **Output:** Generated xUnit test code
- **Details:** [→ README](../mcps/unit-test-generator/README.md)

#### integration-test-generator
- **Purpose:** Generate integration tests for APIs and services
- **Type:** STDIO/On-demand
- **Key Features:**
  - API test generation
  - Service integration tests
  - End-to-end scenarios
  - Test data setup
- **Input:** `{app, apiEndpoint, scenario}`
- **Output:** Generated integration test code
- **Details:** [→ README](../mcps/integration-test-generator/README.md)

---

### Requirements Services

#### requirements-analyzer
- **Purpose:** Analyze ADO stories for requirement completeness
- **Type:** STDIO/On-demand
- **Key Features:**
  - Gap detection
  - Acceptance criteria analysis
  - Missing requirements
  - Completeness score
- **Input:** `{storyId, storyContent}`
- **Output:** Analysis with gaps and recommendations
- **Details:** [→ README](../mcps/requirements-analyzer/README.md)

#### test-case-planner
- **Purpose:** Generate comprehensive test cases from requirements
- **Type:** STDIO/On-demand
- **Key Features:**
  - Test scenario generation
  - Edge case identification
  - Negative scenarios
  - Test case documentation
- **Input:** `{storyId, requirements}`
- **Output:** Complete test case specifications
- **Details:** [→ README](../mcps/test-case-planner/README.md)

#### automation-requirements
- **Purpose:** Create automation requirements from stories
- **Type:** STDIO/On-demand
- **Key Features:**
  - Automation feasibility analysis
  - Priority recommendations
  - Technical requirements
  - Automation roadmap
- **Input:** `{storyId, testCases}`
- **Output:** Automation requirements document
- **Details:** [→ README](../mcps/automation-requirements/README.md)

---

### Planning Services

#### playwright-planner
- **Purpose:** Plan Playwright test architecture and strategy
- **Type:** STDIO/On-demand
- **Key Features:**
  - Test architecture design
  - Page object model planning
  - Test organization strategy
  - Best practices application
- **Input:** `{app, criticalPaths}`
- **Output:** Playwright architecture plan
- **Details:** [→ README](../mcps/playwright-planner/README.md)

---

### Impact Analysis Services

#### blast-radius-analyzer
- **Purpose:** Analyze blast radius of code changes
- **Type:** STDIO/On-demand
- **Key Features:**
  - Change impact analysis
  - Affected component identification
  - Risk assessment
  - Test scope recommendations
- **Input:** `{files, changes}`
- **Output:** Blast radius report with affected areas
- **Details:** [→ README](../mcps/blast-radius-analyzer/README.md)

#### change-impact-analyzer
- **Purpose:** Detailed change impact analysis across systems
- **Type:** STDIO/On-demand
- **Key Features:**
  - Cross-system impact
  - Integration point analysis
  - Regression risk scoring
  - Testing recommendations
- **Input:** `{app, changedFiles, changedMethods}`
- **Output:** Impact analysis with test recommendations
- **Details:** [→ README](../mcps/change-impact-analyzer/README.md)

---

### Documentation Services

#### business-logic-documenter
- **Purpose:** Generate business logic documentation from code
- **Type:** STDIO/On-demand
- **Key Features:**
  - Business rule extraction
  - Logic flow documentation
  - Decision tree mapping
  - Plain language descriptions
- **Input:** `{app, className}`
- **Output:** Business logic documentation
- **Details:** [→ README](../mcps/business-logic-documenter/README.md)

#### documentation-generator
- **Purpose:** Generate technical documentation from code
- **Type:** STDIO/On-demand
- **Key Features:**
  - API documentation
  - Code documentation
  - Architecture docs
  - Integration guides
- **Input:** `{app, scope}`
- **Output:** Generated documentation
- **Details:** [→ README](../mcps/documentation-generator/README.md)

---

### Analysis Services

#### state-machine-analyzer
- **Purpose:** Analyze state machines and workflows in code
- **Type:** STDIO/On-demand
- **Key Features:**
  - State detection
  - Transition mapping
  - Invalid state identification
  - State diagram generation
- **Input:** `{app, className}`
- **Output:** State machine analysis and diagram
- **Details:** [→ README](../mcps/state-machine-analyzer/README.md)

#### smell-detector
- **Purpose:** Detect code smells and anti-patterns
- **Type:** STDIO/On-demand
- **Key Features:**
  - Code smell detection
  - Anti-pattern identification
  - Refactoring suggestions
  - Technical debt tracking
- **Input:** `{app, files}`
- **Output:** Code smell report with recommendations
- **Details:** [→ README](../mcps/smell-detector/README.md)

#### trend-analyzer
- **Purpose:** Analyze trends in metrics over time
- **Type:** STDIO/On-demand
- **Key Features:**
  - Historical trend analysis
  - Prediction modeling
  - Anomaly detection
  - Trend reporting
- **Input:** `{metric, timeRange}`
- **Output:** Trend analysis with predictions
- **Details:** [→ README](../mcps/trend-analyzer/README.md)

#### performance-analyzer
- **Purpose:** Analyze code performance and bottlenecks
- **Type:** STDIO/On-demand
- **Key Features:**
  - Performance profiling
  - Bottleneck detection
  - Optimization suggestions
  - Performance benchmarking
- **Input:** `{app, scope}`
- **Output:** Performance analysis report
- **Details:** [→ README](../mcps/performance-analyzer/README.md)

---

## Which MCP Do I Need?

### "I want to..."

#### Understand My Code
- **Scan .NET applications** → [code-analyzer](#code-analyzer)
- **Check test coverage** → [coverage-analyzer](#coverage-analyzer)
- **See architecture** → [architecture-analyzer](#architecture-analyzer)
- **Find integrations** → [integration-mapper](#integration-mapper)
- **Analyze data models** → [data-model-analyzer](#data-model-analyzer)

#### Generate Tests
- **Create unit tests** → [unit-test-generator](#unit-test-generator)
- **Create integration tests** → [integration-test-generator](#integration-test-generator)
- **Create UI tests** → [playwright-generator](#playwright-generator)
- **Plan test strategy** → [playwright-planner](#playwright-planner)

#### Work with Azure DevOps
- **Pull stories** → [azure-devops](#azure-devops)
- **Analyze requirements** → [requirements-analyzer](#requirements-analyzer)
- **Generate test cases** → [test-case-planner](#test-case-planner)
- **Create automation requirements** → [automation-requirements](#automation-requirements)

#### Improve Quality
- **Find security issues** → [security-analyzer](#security-analyzer)
- **Detect code smells** → [smell-detector](#smell-detector)
- **Track quality metrics** → [quality-metrics-analyzer](#quality-metrics-analyzer)
- **Analyze performance** → [performance-analyzer](#performance-analyzer)

#### Assess Risk
- **Calculate risk scores** → [risk-analyzer](#risk-analyzer)
- **Analyze change impact** → [change-impact-analyzer](#change-impact-analyzer)
- **Find blast radius** → [blast-radius-analyzer](#blast-radius-analyzer)

#### Fix Problems
- **Heal Playwright tests** → [playwright-healer](#playwright-healer)
- **Optimize workflows** → [workflow-analyzer](#workflow-analyzer)

#### Generate Documentation
- **Document business logic** → [business-logic-documenter](#business-logic-documenter)
- **Generate technical docs** → [documentation-generator](#documentation-generator)

---

## API Endpoint to MCP Mapping

### Code Analysis Endpoints
```
POST /api/analysis/code-scan
  → Uses: code-analyzer (Docker)
  
POST /api/analysis/coverage
  → Uses: coverage-analyzer (Docker)
  
POST /api/analysis/test-gaps
  → Uses: code-analyzer + coverage-analyzer (Docker)
```

### Azure DevOps Endpoints
```
POST /api/ado/pull-stories
  → Uses: azure-devops (Docker)
  
POST /api/ado/analyze-requirements
  → Uses: azure-devops (Docker) + requirements-analyzer (STDIO)
  
POST /api/ado/generate-test-cases
  → Uses: azure-devops (Docker) + test-case-planner (STDIO)
  
POST /api/ado/automation-requirements
  → Uses: azure-devops (Docker) + automation-requirements (STDIO)
  
POST /api/ado/complete-workflow
  → Uses: Multiple MCPs (orchestrated workflow)
```

### Test Generation Endpoints
```
POST /api/tests/generate-unit-tests
  → Uses: code-analyzer (Docker) + unit-test-generator (STDIO)
  
POST /api/tests/generate-integration-tests
  → Uses: code-analyzer (Docker) + integration-test-generator (STDIO)
  
POST /api/tests/analyze-ui-paths
  → Uses: playwright-analyzer (Docker)
  
POST /api/tests/generate-playwright-tests
  → Uses: playwright-analyzer (Docker) + playwright-generator (Docker)
  
POST /api/tests/heal-playwright-tests
  → Uses: playwright-healer (Docker)
```

### Quality & Risk Endpoints
```
POST /api/quality/security-scan
  → Uses: security-analyzer (Docker)
  
POST /api/quality/code-smells
  → Uses: smell-detector (STDIO)
  
POST /api/risk/assess
  → Uses: risk-analyzer (Docker)
  
POST /api/risk/blast-radius
  → Uses: blast-radius-analyzer (STDIO)
  
POST /api/risk/change-impact
  → Uses: change-impact-analyzer (STDIO)
```

---

## MCP Communication Patterns

### Pattern 1: Direct Docker MCP Call
```
Client → Orchestrator → Docker MCP → Response
```
Example: Code scanning, coverage analysis

### Pattern 2: Docker + STDIO Orchestration
```
Client → Orchestrator → Docker MCP (data) → STDIO MCP (processing) → Response
```
Example: Test generation (code-analyzer gets data, unit-test-generator generates tests)

### Pattern 3: Multi-MCP Workflow
```
Client → Orchestrator → Multiple MCPs (sequential) → Aggregated Response
```
Example: Complete ADO workflow (pull story → analyze → generate tests → update ADO)

### Pattern 4: STDIO Chain
```
Client → Orchestrator → STDIO MCP 1 → STDIO MCP 2 → Response
```
Example: Requirements analysis → test case planning → automation requirements

---

## Summary Statistics

### Total MCPs: 28
- **Docker MCPs:** 14 (Always running)
- **STDIO MCPs:** 14 (On-demand)

### By Function:
- **Code Analysis:** 5 MCPs
- **Test Generation:** 3 MCPs
- **Quality/Security:** 4 MCPs
- **Requirements:** 3 MCPs
- **Planning:** 2 MCPs
- **Impact Analysis:** 2 MCPs
- **Documentation:** 2 MCPs
- **Other Analysis:** 7 MCPs

### Ports Used:
- 3000: Orchestrator
- 3001-3013: Docker MCPs (13 services)

---

## Next Steps

1. **Explore by category:** [Docker MCPs](DOCKER_MCPS.md) | [STDIO MCPs](STDIO_MCPS.md)
2. **Read detailed docs:** Navigate to individual MCP READMEs
3. **Try it out:** See [GETTING_STARTED.md](GETTING_STARTED.md)
4. **Quick reference:** See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

**Last Updated:** December 29, 2024
**Version:** 1.0.0
