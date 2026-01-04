# Workflow Analyzer - AI-Powered Testing Workflow Optimization

**Type:** Docker MCP (Always Running)  
**Port:** 3010  
**Container:** `qe-workflow-analyzer`  
**Location:** `mcps/workflow-analyzer/`  
**Technology:** Node.js 18 + Express + Anthropic Claude API  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Input/Output Schemas](#inputoutput-schemas)
8. [Data Persistence](#data-persistence)
9. [Development](#development)
10. [Testing](#testing)
11. [Error Handling](#error-handling)
12. [Troubleshooting](#troubleshooting)
13. [Monitoring](#monitoring)
14. [Integration](#integration)
15. [Changelog](#changelog)

---

## Overview

### Purpose

The **Workflow Analyzer** is a specialized MCP that uses AI (Anthropic Claude) to analyze, optimize, and improve QA testing workflows and processes. It examines existing testing practices, identifies inefficiencies and bottlenecks, recommends workflow improvements using AI and automation, generates optimized testing workflows with proper tool integration, and provides actionable insights for reducing testing time while maintaining quality. The service acts as a QA process consultant, applying AI intelligence to transform manual, time-consuming workflows into efficient, automated processes.

This MCP addresses the reality that many QA teams follow inefficient workflows simply because "that's how we've always done it." When manual test case creation takes hours per story, when regression testing takes days because tests aren't prioritized, when test maintenance consumes 50% of QA time, or when test results aren't actionable because they're not tied to requirements, the Workflow Analyzer identifies these inefficiencies, designs optimized workflows leveraging the QE MCP Stack, generates implementation plans, and measures expected improvements.

The Workflow Analyzer is essential for QA process improvement initiatives, team efficiency optimization, onboarding new QA engineers with best practices, and justifying investment in test automation and AI tools.

### Key Features

- ✅ **AI-Powered Analysis** - Uses Claude API to intelligently analyze QA workflows and identify improvements
- ✅ **Bottleneck Detection** - Identifies time-consuming manual steps and inefficiencies
- ✅ **MCP Stack Optimization** - Recommends which MCPs to use for workflow automation
- ✅ **Workflow Generation** - Creates complete, optimized workflows with tool integration
- ✅ **Time Savings Calculation** - Quantifies time saved by workflow improvements
- ✅ **Best Practice Recommendations** - Suggests industry best practices for QA processes
- ✅ **Tool Integration Planning** - Maps current tools to MCP capabilities
- ✅ **ROI Analysis** - Calculates return on investment for automation efforts
- ✅ **Implementation Roadmap** - Generates step-by-step implementation plans
- ✅ **Workflow Templates** - Provides pre-built workflow templates for common scenarios

### Use Cases

1. **Process Improvement** - Analyze and optimize existing QA workflows
2. **Automation Planning** - Identify which workflows benefit most from automation
3. **Tool Evaluation** - Assess if current tools are optimal or if MCPs provide better alternatives
4. **Team Efficiency** - Reduce time spent on manual, repetitive tasks
5. **Onboarding** - Establish best-practice workflows for new team members
6. **Sprint Planning** - Optimize sprint testing workflows
7. **CI/CD Integration** - Design efficient continuous testing workflows
8. **Cost Justification** - Calculate ROI for QA automation investments

### What It Does NOT Do

- ❌ Does not execute workflows (provides recommendations only)
- ❌ Does not implement changes (generates plans for manual implementation)
- ❌ Does not manage project tasks (advisory only)
- ❌ Does not replace QA leadership (augments decision-making)
- ❌ Does not guarantee outcomes (provides data-driven recommendations)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze current workflow
curl -X POST http://localhost:3000/api/workflow/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "name": "Story to Test Automation",
      "currentSteps": [
        "QA reads user story in ADO",
        "QA manually writes test cases in Excel",
        "QA manually creates Playwright tests",
        "QA manually runs tests",
        "QA manually updates ADO with results"
      ]
    }
  }'

# Get optimized workflow
curl -X POST http://localhost:3000/api/workflow/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "Story to Test Automation",
    "goals": ["reduce time", "increase coverage"]
  }'

# Generate workflow template
curl -X POST http://localhost:3000/api/workflow/template \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "sprint-testing",
    "app": "App1"
  }'
```

### Direct Access (Testing Only)

```bash
# Analyze workflow
curl -X POST http://localhost:3010/analyze-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "name": "Story to Test Automation",
      "currentSteps": [
        "QA reads user story in ADO",
        "QA manually writes test cases",
        "QA manually creates Playwright tests",
        "QA manually runs tests",
        "QA manually updates ADO"
      ],
      "timePerExecution": 180,
      "executionsPerWeek": 15
    }
  }'

# Generate optimized workflow
curl -X POST http://localhost:3010/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkflow": "Story to Test Automation",
    "goals": ["reduce time", "increase coverage", "improve maintainability"]
  }'

# Get workflow template
curl -X POST http://localhost:3010/get-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateType": "sprint-testing"
  }'

# Calculate ROI
curl -X POST http://localhost:3010/calculate-roi \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkflow": {
      "timePerWeek": 40,
      "hourlyRate": 75
    },
    "optimizedWorkflow": {
      "timePerWeek": 15
    }
  }'

# Health check
curl http://localhost:3010/health
```

### Expected Output

```json
{
  "success": true,
  "analysis": {
    "workflowName": "Story to Test Automation",
    "currentState": {
      "steps": 5,
      "manualSteps": 5,
      "automatedSteps": 0,
      "timePerExecution": "180 minutes",
      "executionsPerWeek": 15,
      "totalTimePerWeek": "45 hours"
    },
    "bottlenecks": [
      {
        "step": "QA manually writes test cases in Excel",
        "issue": "Manual test case creation is time-consuming and error-prone",
        "impact": "High",
        "timeWasted": "60 minutes per execution (15 hours/week)"
      },
      {
        "step": "QA manually creates Playwright tests",
        "issue": "Manual test coding without AI assistance",
        "impact": "High",
        "timeWasted": "90 minutes per execution (22.5 hours/week)"
      },
      {
        "step": "QA manually updates ADO with results",
        "issue": "Manual result tracking instead of automated integration",
        "impact": "Medium",
        "timeWasted": "15 minutes per execution (3.75 hours/week)"
      }
    ],
    "recommendations": [
      {
        "priority": 1,
        "recommendation": "Use azure-devops MCP to automatically pull stories with acceptance criteria",
        "impact": "Eliminates manual story review, ensures acceptance criteria captured",
        "timeSaved": "5 minutes per story (1.25 hours/week)",
        "implementation": "Configure azure-devops MCP with ADO credentials, create workflow to fetch stories"
      },
      {
        "priority": 2,
        "recommendation": "Use playwright-generator MCP to automatically generate tests from acceptance criteria",
        "impact": "Eliminates manual test coding, generates production-ready tests",
        "timeSaved": "90 minutes per story (22.5 hours/week)",
        "implementation": "Integrate playwright-generator with acceptance criteria from ADO"
      },
      {
        "priority": 3,
        "recommendation": "Integrate test execution with CI/CD pipeline",
        "impact": "Automated test execution on every commit",
        "timeSaved": "Tests run automatically without manual intervention",
        "implementation": "Add Playwright tests to GitHub Actions workflow"
      },
      {
        "priority": 4,
        "recommendation": "Use playwright-healer MCP to automatically fix broken tests",
        "impact": "Reduces test maintenance time by 70%",
        "timeSaved": "Reduces maintenance from 10 hours/week to 3 hours/week",
        "implementation": "Configure playwright-healer to run after test failures"
      }
    ],
    "optimizedWorkflow": {
      "name": "Automated Story to Test Pipeline",
      "steps": [
        {
          "step": 1,
          "action": "Azure DevOps MCP pulls story with acceptance criteria",
          "tool": "azure-devops (Port 3003)",
          "automation": "Full",
          "time": "Automatic (0 minutes)",
          "trigger": "New story assigned to sprint"
        },
        {
          "step": 2,
          "action": "Requirements Analyzer extracts testable requirements",
          "tool": "requirements-analyzer (STDIO)",
          "automation": "Full",
          "time": "Automatic (0 minutes)"
        },
        {
          "step": 3,
          "action": "Playwright Generator creates tests from acceptance criteria",
          "tool": "playwright-generator (Port 3005)",
          "automation": "Full",
          "time": "5 minutes (mostly AI processing)",
          "output": "Complete Playwright test with Page Objects"
        },
        {
          "step": 4,
          "action": "QA reviews generated test (optional)",
          "tool": "Manual review",
          "automation": "Manual",
          "time": "10 minutes",
          "optional": true
        },
        {
          "step": 5,
          "action": "Tests run automatically on every commit",
          "tool": "CI/CD pipeline",
          "automation": "Full",
          "time": "Automatic (0 minutes)"
        },
        {
          "step": 6,
          "action": "Test failures trigger playwright-healer",
          "tool": "playwright-healer (Port 3006)",
          "automation": "Full",
          "time": "5 minutes (AI diagnosis and repair)"
        },
        {
          "step": 7,
          "action": "Results automatically posted to ADO",
          "tool": "azure-devops (Port 3003)",
          "automation": "Full",
          "time": "Automatic (0 minutes)"
        }
      ],
      "totalTimePerExecution": "20 minutes (manual review optional)",
      "executionsPerWeek": 15,
      "totalTimePerWeek": "5 hours"
    },
    "improvement": {
      "timeReduction": "89%",
      "timeSaved": "40 hours per week",
      "annualTimeSaved": "2,080 hours",
      "costSavings": "$156,000 per year (at $75/hour)",
      "qualityImprovements": [
        "Consistent test structure using Page Object Model",
        "Comprehensive test coverage from acceptance criteria",
        "Faster feedback with automated CI/CD execution",
        "Reduced test flakiness with automated healing"
      ]
    },
    "implementationPlan": {
      "phase1": {
        "name": "Azure DevOps Integration",
        "duration": "1 week",
        "tasks": [
          "Configure azure-devops MCP with PAT",
          "Create workflow to pull stories",
          "Test story retrieval"
        ],
        "effort": "8 hours"
      },
      "phase2": {
        "name": "Test Generation Automation",
        "duration": "2 weeks",
        "tasks": [
          "Configure playwright-generator MCP",
          "Create integration between ADO and generator",
          "Test generation workflow",
          "Refine prompts for quality"
        ],
        "effort": "20 hours"
      },
      "phase3": {
        "name": "CI/CD Integration",
        "duration": "1 week",
        "tasks": [
          "Add Playwright to CI pipeline",
          "Configure test execution",
          "Set up result reporting"
        ],
        "effort": "10 hours"
      },
      "phase4": {
        "name": "Test Healing Automation",
        "duration": "1 week",
        "tasks": [
          "Configure playwright-healer",
          "Integrate with test failures",
          "Test healing workflow"
        ],
        "effort": "8 hours"
      },
      "totalImplementationTime": "5 weeks",
      "totalImplementationEffort": "46 hours",
      "breakEvenPoint": "1.15 weeks after implementation",
      "roi": "4,422% over first year"
    },
    "risks": [
      {
        "risk": "AI-generated tests may require manual review initially",
        "mitigation": "Include QA review step in Phase 2, refine over time"
      },
      {
        "risk": "Test healing may not work for all failure types",
        "mitigation": "Monitor healing success rate, manual fallback for complex cases"
      }
    ]
  },
  "executionTime": 8340,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Workflow Analyzer (Port 3010)                          │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Claude API   │──▶│ Workflow       │         │
│  │ Router   │   │ Client       │   │ Analyzer       │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      AI Analysis         Process Mining              │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Bottleneck   │   │ Optimizer    │   │ ROI          │      │
│  │ Detector     │   │              │   │ Calculator   │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Inefficiencies      Optimized Workflow    Financial Impact
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /analyze-workflow` - Analyze current workflow
   - `POST /optimize` - Generate optimized workflow
   - `POST /get-template` - Get workflow template
   - `POST /calculate-roi` - Calculate ROI
   - `GET /health` - Health check endpoint

2. **Claude API Client** (`src/services/claudeClient.js`)
   - **Authentication** - Manages Anthropic API key
   - **Analysis Prompts** - Constructs workflow analysis prompts
   - **Optimization Prompts** - Constructs optimization prompts
   - **Response Parser** - Extracts structured recommendations

3. **Workflow Analyzer** (`src/analyzers/workflowAnalyzer.js`)
   - **Step Analyzer** - Analyzes individual workflow steps
   - **Time Calculator** - Calculates time per step
   - **Automation Detector** - Identifies automatable steps
   - **Dependency Mapper** - Maps tool dependencies

4. **Bottleneck Detector** (`src/detectors/bottleneckDetector.js`)
   - **Time Analysis** - Identifies time-consuming steps
   - **Manual Step Detector** - Finds manual processes
   - **Repetition Detector** - Identifies repeated tasks
   - **Tool Gap Analyzer** - Finds missing tool integrations

5. **Optimizer** (`src/services/optimizer.js`)
   - **MCP Recommender** - Recommends which MCPs to use
   - **Workflow Designer** - Designs optimized workflows
   - **Integration Planner** - Plans tool integrations
   - **Best Practice Applier** - Applies industry best practices

6. **ROI Calculator** (`src/calculators/roiCalculator.js`)
   - **Time Savings Calculator** - Calculates time saved
   - **Cost Calculator** - Calculates cost savings
   - **Break-Even Analyzer** - Calculates payback period
   - **ROI Percentage** - Calculates return on investment

7. **Template Manager** (`src/templates/templateManager.js`)
   - **Template Library** - Pre-built workflow templates
   - **Template Customizer** - Customizes templates for apps
   - **Template Validator** - Validates template completeness

### Dependencies

**Internal:**
- All MCPs (for workflow recommendations)

**External Services:**
- Anthropic Claude API - For AI-powered analysis
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- @anthropic-ai/sdk - Claude API client
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /analyze-workflow)
   │
   ▼
2. Request Validation
   ├─▶ Validate workflow data
   └─▶ Extract current steps
       │
       ▼
3. Step Analysis
   ├─▶ Analyze each step
   ├─▶ Classify as manual/automated
   ├─▶ Calculate time per step
   └─▶ Identify tool usage
       │
       ▼
4. Bottleneck Detection
   ├─▶ Find time-consuming steps
   ├─▶ Identify repeated tasks
   ├─▶ Detect manual processes
   └─▶ Find missing automations
       │
       ▼
5. Claude Analysis
   ├─▶ Construct analysis prompt
   ├─▶ Send to Claude API
   ├─▶ Parse recommendations
   └─▶ Extract improvement ideas
       │
       ▼
6. Optimization
   ├─▶ Design optimized workflow
   ├─▶ Recommend MCP usage
   ├─▶ Plan integrations
   └─▶ Apply best practices
       │
       ▼
7. Time Savings Calculation
   ├─▶ Calculate current time
   ├─▶ Calculate optimized time
   ├─▶ Calculate reduction %
   └─▶ Extrapolate annual savings
       │
       ▼
8. ROI Calculation
   ├─▶ Calculate cost savings
   ├─▶ Calculate implementation cost
   ├─▶ Calculate break-even point
   └─▶ Calculate ROI percentage
       │
       ▼
9. Implementation Plan
   ├─▶ Break into phases
   ├─▶ Estimate effort per phase
   ├─▶ Identify dependencies
   └─▶ Create timeline
       │
       ▼
10. Response
    └─▶ Return analysis, optimized workflow, ROI, plan
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3010 | Workflow analyzer HTTP port |
| `ANTHROPIC_API_KEY` | ✅ Yes | - | Anthropic Claude API key |
| `CLAUDE_MODEL` | ❌ No | claude-sonnet-4-20250514 | Claude model to use |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |

### Configuration Files

#### `config/workflow-templates.json`

Pre-built workflow templates:

```json
{
  "templates": [
    {
      "name": "sprint-testing",
      "displayName": "Sprint Testing Workflow",
      "description": "Complete workflow from story assignment to test execution",
      "steps": [
        {
          "name": "Story Retrieval",
          "tool": "azure-devops",
          "automation": "full"
        },
        {
          "name": "Test Generation",
          "tool": "playwright-generator",
          "automation": "full"
        }
      ]
    }
  ]
}
```

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
workflow-analyzer:
  build: ./mcps/workflow-analyzer
  container_name: qe-workflow-analyzer
  ports:
    - "3010:3010"
  environment:
    - NODE_ENV=production
    - PORT=3010
  env_file:
    - .env  # Contains ANTHROPIC_API_KEY
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/workflow-analyzer:/app/data   # Workflow analyses
  networks:
    - qe-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3010/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## API Reference

### Workflow Analysis Endpoints

#### POST /analyze-workflow

Analyze current workflow and identify improvements

**Request Body:**
```typescript
{
  workflow: {
    name: string;
    currentSteps: string[];
    timePerExecution?: number;        // Minutes
    executionsPerWeek?: number;
  };
  goals?: string[];                   // e.g., ["reduce time", "increase coverage"]
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis: {
    workflowName: string;
    currentState: CurrentState;
    bottlenecks: Bottleneck[];
    recommendations: Recommendation[];
    optimizedWorkflow: OptimizedWorkflow;
    improvement: Improvement;
    implementationPlan: ImplementationPlan;
    risks: Risk[];
  };
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3010/analyze-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "name": "Story to Test Automation",
      "currentSteps": [
        "Read story in ADO",
        "Write test cases manually",
        "Create Playwright tests manually",
        "Run tests manually",
        "Update ADO manually"
      ],
      "timePerExecution": 180,
      "executionsPerWeek": 15
    },
    "goals": ["reduce time", "increase coverage"]
  }'
```

---

#### POST /optimize

Generate optimized workflow

**Request Body:**
```typescript
{
  currentWorkflow: string;            // Workflow name or description
  goals: string[];
  constraints?: string[];             // e.g., ["no budget for new tools"]
}
```

**Response:**
```typescript
{
  success: boolean;
  optimizedWorkflow: OptimizedWorkflow;
  timeSavings: number;
  implementation: ImplementationPlan;
}
```

---

#### POST /get-template

Get pre-built workflow template

**Request Body:**
```typescript
{
  templateType: string;               // e.g., "sprint-testing", "regression-testing"
  customizations?: object;
}
```

**Response:**
```typescript
{
  success: boolean;
  template: WorkflowTemplate;
}
```

---

#### POST /calculate-roi

Calculate ROI for workflow improvement

**Request Body:**
```typescript
{
  currentWorkflow: {
    timePerWeek: number;              // Hours
    hourlyRate: number;               // Dollars
  };
  optimizedWorkflow: {
    timePerWeek: number;
    implementationHours?: number;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  roi: {
    annualSavings: number;
    implementationCost: number;
    breakEvenWeeks: number;
    roiPercentage: number;
  };
}
```

---

### Health Endpoints

#### GET /health

Service health check

**Response:**
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  uptime: number;
  version: string;
  claudeApi: "connected" | "disconnected";
  timestamp: string;
}
```

---

## Usage Examples

### Example 1: Analyze Manual Testing Workflow

**Scenario:** Team spending too much time on manual testing - need optimization

```bash
curl -X POST http://localhost:3010/analyze-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "name": "Manual Regression Testing",
      "currentSteps": [
        "QA manually selects test cases from Excel",
        "QA manually executes 200 test cases",
        "QA manually logs results in Excel",
        "QA manually creates bug tickets in ADO"
      ],
      "timePerExecution": 480,
      "executionsPerWeek": 2
    }
  }'
```

**Action:** Implement recommended automation with playwright-generator and CI/CD

---

### Example 2: Calculate ROI for Automation

**Scenario:** Need to justify automation investment to management

```bash
curl -X POST http://localhost:3010/calculate-roi \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkflow": {
      "timePerWeek": 40,
      "hourlyRate": 75
    },
    "optimizedWorkflow": {
      "timePerWeek": 10,
      "implementationHours": 80
    }
  }'
```

**Response:**
```json
{
  "roi": {
    "annualSavings": "$117,000",
    "implementationCost": "$6,000",
    "breakEvenWeeks": 2,
    "roiPercentage": "1,850%"
  }
}
```

**Action:** Present ROI to leadership for approval

---

### Example 3: Get Sprint Testing Template

**Scenario:** Setting up testing for new project - need best practices

```bash
curl -X POST http://localhost:3010/get-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateType": "sprint-testing"
  }'
```

**Action:** Implement template workflow for team

---

### Example 4: Optimize CI/CD Integration

**Scenario:** Tests not integrated with CI/CD - slow feedback

```bash
curl -X POST http://localhost:3010/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkflow": "Manual test execution after every commit",
    "goals": ["faster feedback", "automated execution"],
    "constraints": ["GitHub Actions only"]
  }'
```

---

### Example 5: Test Maintenance Workflow

**Scenario:** Spending too much time fixing broken tests

```bash
curl -X POST http://localhost:3010/analyze-workflow \
  -d '{
    "workflow": {
      "name": "Test Maintenance",
      "currentSteps": [
        "Test fails in CI",
        "QA investigates failure manually",
        "QA updates selector manually",
        "QA commits fix",
        "QA re-runs test"
      ],
      "timePerExecution": 30,
      "executionsPerWeek": 20
    }
  }'
```

**Recommendation:** Use playwright-healer for automated fixing

---

## Input/Output Schemas

### Input Schema: Analyze Workflow Request

```typescript
interface AnalyzeWorkflowRequest {
  workflow: {
    name: string;
    currentSteps: string[];
    timePerExecution?: number;
    executionsPerWeek?: number;
  };
  goals?: string[];
}
```

---

### Output Schema: Analysis Result

```typescript
interface AnalysisResult {
  success: boolean;
  analysis: {
    workflowName: string;
    currentState: CurrentState;
    bottlenecks: Bottleneck[];
    recommendations: Recommendation[];
    optimizedWorkflow: OptimizedWorkflow;
    improvement: Improvement;
    implementationPlan: ImplementationPlan;
    risks: Risk[];
  };
  executionTime: number;
  timestamp: string;
}

interface Bottleneck {
  step: string;
  issue: string;
  impact: "High" | "Medium" | "Low";
  timeWasted: string;
}

interface Recommendation {
  priority: number;
  recommendation: string;
  impact: string;
  timeSaved: string;
  implementation: string;
}

interface OptimizedWorkflow {
  name: string;
  steps: WorkflowStep[];
  totalTimePerExecution: string;
  executionsPerWeek: number;
  totalTimePerWeek: string;
}

interface WorkflowStep {
  step: number;
  action: string;
  tool: string;
  automation: "Full" | "Partial" | "Manual";
  time: string;
  trigger?: string;
  optional?: boolean;
}
```

---

## Data Persistence

### Storage Locations

```
./data/workflow-analyzer/
├── analyses/
│   └── workflow-analyses.json
└── logs/
    └── workflow-analyzer.log
```

---

## Development

### Local Setup

```bash
cd mcps/workflow-analyzer
npm install
cp ../../.env.example .env
# Set ANTHROPIC_API_KEY
```

---

## Testing

### Unit Tests

```bash
npm test
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `MISSING_API_KEY` | 401 | ANTHROPIC_API_KEY not set | Set API key in .env |
| `INVALID_WORKFLOW` | 400 | Invalid workflow data | Check workflow structure |

---

## Troubleshooting

### Issue: Analysis too generic

**Solution:** Provide more detailed workflow steps and time estimates

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3010/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/workflow/analyze`

### Uses

**Anthropic Claude API:** For AI-powered workflow analysis

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ AI-powered workflow analysis
- ✅ Bottleneck detection
- ✅ ROI calculation

---

**Need help?** View logs with `docker compose logs -f workflow-analyzer`
