# Orchestrator Integration - Dashboard Routes

## 🎯 What This Package Does

This package adds **dashboard endpoints** to your existing QE Orchestrator, allowing both dashboards to connect and get real data from your MCPs.

---

## 📦 What's in This Package

```
FINAL_PACKAGES/orchestrator-integration/
├── dashboard.js          ← NEW route file to add to orchestrator
├── README.md             ← This file (comprehensive guide)
└── QUICK_START.md        ← One-page installation guide
```

---

## 🔧 WHAT TO DO

### Step 1: Copy Route File

```bash
# Copy dashboard.js to your orchestrator routes folder
cp dashboard.js /qe-mcp-stack/orchestrator/src/routes/dashboard.js
```

### Step 2: Register Route in Orchestrator

Edit `/qe-mcp-stack/orchestrator/index.js` (or `src/index.js`):

```javascript
// Add this import at the top with your other routes
import dashboardRoutes from './src/routes/dashboard.js';

// Register the route with your other routes
app.use('/api/dashboard', dashboardRoutes);
```

**Example** (full context):
```javascript
import express from 'express';
import cors from 'cors';
import { MCPManager } from './src/services/mcpManager.js';
import { logger } from './src/utils/logger.js';

// Import routes
import adoRoutes from './src/routes/ado.js';
import analysisRoutes from './src/routes/analysis.js';
import mcpRoutes from './src/routes/mcp.js';
import testsRoutes from './src/routes/tests.js';
import dashboardRoutes from './src/routes/dashboard.js';  // ← ADD THIS

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MCP Manager
const mcpManager = new MCPManager();
await mcpManager.initialize();

// Middleware to inject mcpManager
app.use((req, res, next) => {
  req.mcpManager = mcpManager;
  next();
});

// Register routes
app.use('/api/ado', adoRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/dashboard', dashboardRoutes);  // ← ADD THIS

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`QE Orchestrator running on port ${PORT}`);
});
```

### Step 3: Restart Orchestrator

```bash
cd /qe-mcp-stack/orchestrator

# Stop if running (Ctrl+C)

# Start again
npm start
```

### Step 4: Test Endpoints

```bash
# Test code analysis endpoint
curl "http://localhost:4000/api/dashboard/code-analysis?app=App1"

# Test Azure DevOps endpoint
curl "http://localhost:4000/api/dashboard/aod-summary"
```

---

## 🎯 WHAT THIS FILE PROVIDES

### New Endpoints Added to Orchestrator

#### Code Analysis Dashboard Endpoints:

1. **`GET /api/dashboard/code-analysis?app=App1`**
   - Primary endpoint for code dashboard
   - Calls: Code Analyzer MCP + Coverage Analyzer MCP
   - Returns: Files, classes, methods, coverage, dependencies
   - Used by: Code Analysis Dashboard

2. **`GET /api/dashboard/coverage?app=App1`**
   - Detailed coverage information
   - Calls: Coverage Analyzer MCP
   - Returns: Coverage metrics and details

3. **`GET /api/dashboard/test-gaps?app=App1`**
   - Identifies testing gaps
   - Calls: Code Analyzer + Coverage Analyzer MCPs
   - Returns: Untested methods, missing tests

#### Azure DevOps Dashboard Endpoints:

4. **`GET /api/dashboard/aod-summary`**
   - Primary endpoint for AOD dashboard
   - Calls: Azure DevOps MCP
   - Returns: Work items, pipelines, PRs, tests
   - Used by: Azure DevOps Dashboard

5. **`GET /api/dashboard/work-item/:itemId`**
   - Detailed work item with AI analysis
   - Calls: Azure DevOps MCP + STDIO MCPs (optional)
   - Query params: `?analyze=true&generateTestCases=true`
   - Returns: Work item + requirements analysis + test cases

6. **`POST /api/dashboard/analyze-story`**
   - Complete workflow: Analyze story with AI
   - Calls: Azure DevOps MCP + Requirements Analyzer + Test Case Planner + Automation Requirements
   - Body: `{ storyId: 12345 }`
   - Returns: Complete analysis with test cases and automation plan

---

## 📝 WHAT EACH ENDPOINT DOES

### Code Analysis Endpoint

**Request**:
```http
GET /api/dashboard/code-analysis?app=App1
```

**What It Does**:
1. Receives app name from dashboard
2. Calls `dotnetCodeAnalyzer` MCP to analyze code
3. Calls `dotnetCoverageAnalyzer` MCP to get coverage
4. Transforms data to dashboard format
5. Returns combined JSON response

**Code** (from dashboard.js):
```javascript
router.get('/code-analysis', async (req, res) => {
  const appName = req.query.app || 'App1';
  
  // Get code analysis
  const response = await req.mcpManager.callDockerMcp(
    'dotnetCodeAnalyzer',
    '/analyze',
    { app: appName, includeTests: true, includeIntegrations: true }
  );
  
  // Get coverage
  const coverage = await req.mcpManager.callDockerMcp(
    'dotnetCoverageAnalyzer',
    '/analyze',
    { app: appName }
  );
  
  // Transform and return
  const dashboardData = transformCodeAnalysisForDashboard(response, coverage, appName);
  res.json(dashboardData);
});
```

**Response**:
```json
{
  "applications": [{ "id": "App1", "name": "App1" }],
  "files": [
    {
      "id": "f1",
      "name": "UserService.cs",
      "path": "/src/Services/UserService.cs",
      "lines": 342,
      "classCount": 1,
      "methodCount": 15,
      "avgComplexity": 4.2,
      "lineCoverage": 92.5,
      "uncoveredLines": [45, 67, 89]
    }
  ],
  "classes": [...],
  "coverage": {...},
  "dependencies": {...}
}
```

---

### Azure DevOps Summary Endpoint

**Request**:
```http
GET /api/dashboard/aod-summary?project=YourProject&sprint=Sprint1
```

**What It Does**:
1. Receives project/sprint from dashboard
2. Calls `azureDevOps` MCP to query work items
3. Transforms data to dashboard format
4. Returns work items, sprint progress, activity

**Code** (from dashboard.js):
```javascript
router.get('/aod-summary', async (req, res) => {
  const { project, sprint } = req.query;
  
  // Get work items from Azure DevOps
  const stories = await req.mcpManager.callDockerMcp(
    'azureDevOps',
    '/work-items/query',
    { sprint: sprint }
  );
  
  // Transform and return
  const dashboardData = transformAzureDevOpsForDashboard(stories);
  res.json(dashboardData);
});
```

**Response**:
```json
{
  "summary": {
    "activeWorkItems": 24,
    "activePipelines": 8,
    "successRate": 92.5,
    "openPRs": 12
  },
  "sprint": {
    "completed": 18,
    "inProgress": 8,
    "todo": 6
  },
  "workItems": {...},
  "workItemDetails": [...],
  "pipelines": {...},
  "recentActivity": [...]
}
```

---

### Story Analysis Endpoint

**Request**:
```http
POST /api/dashboard/analyze-story
Content-Type: application/json

{
  "storyId": 12345
}
```

**What It Does**:
1. Gets work item from Azure DevOps MCP
2. Analyzes requirements with Requirements Analyzer STDIO MCP
3. Generates test cases with Test Case Planner STDIO MCP
4. Creates automation requirements with Automation Requirements STDIO MCP
5. Returns complete analysis

**Code** (from dashboard.js):
```javascript
router.post('/analyze-story', async (req, res) => {
  const { storyId } = req.body;
  
  // 1. Get story
  const stories = await req.mcpManager.callDockerMcp(
    'azureDevOps',
    '/work-items/get',
    { ids: [parseInt(storyId)] }
  );
  const story = stories[0];
  
  // 2. Analyze requirements (STDIO MCP)
  const requirementsAnalysis = await req.mcpManager.callStdioMcp(
    'requirements-analyzer',
    { data: { storyId, storyContent: {...} } }
  );
  
  // 3. Generate test cases (STDIO MCP)
  const testCases = await req.mcpManager.callStdioMcp(
    'test-case-planner',
    { data: { storyId, requirements: ..., acceptanceCriteria: ... } }
  );
  
  // 4. Generate automation requirements (STDIO MCP)
  const automationReqs = await req.mcpManager.callStdioMcp(
    'automation-requirements',
    { data: { storyId, testCases: testCases.testCases, automationLevel: 'all' } }
  );
  
  res.json({
    storyId,
    workItem: story,
    requirementsAnalysis,
    testCases,
    automationRequirements: automationReqs
  });
});
```

**Response**:
```json
{
  "storyId": 12345,
  "workItem": {...},
  "requirementsAnalysis": {
    "completenessScore": 85,
    "testabilityScore": 78,
    "missingRequirements": [...],
    "recommendations": [...]
  },
  "testCases": {
    "testCases": [...]
  },
  "automationRequirements": {
    "feasibility": {...},
    "automationStrategy": {...}
  }
}
```

---

## 🔄 DATA TRANSFORMATION

### `transformCodeAnalysisForDashboard()`

**Purpose**: Converts MCP response to dashboard format

**Transforms**:
```javascript
// MCP returns:
{
  files: [{ name: 'UserService.cs', ... }],
  classes: [{ name: 'UserService', ... }]
}

// Dashboard needs:
{
  applications: [{ id: 'App1', name: 'App1' }],
  files: [
    {
      id: 'f1',  // ← Added
      name: 'UserService.cs',
      applicationId: 'App1',  // ← Added
      lineCoverage: 92.5,  // ← From coverage MCP
      uncoveredLines: [45, 67]  // ← From coverage MCP
    }
  ],
  classes: [
    {
      id: 'c1',  // ← Added
      fileId: 'f1',  // ← Added  
      applicationId: 'App1',  // ← Added
      properties: [...],  // ← From MCP
      methods: [...]  // ← From MCP with complexity
    }
  ]
}
```

### `transformAzureDevOpsForDashboard()`

**Purpose**: Converts Azure DevOps work items to dashboard format

**Transforms**:
```javascript
// Azure DevOps MCP returns:
{
  value: [
    {
      id: 1234,
      fields: {
        'System.Title': 'Implement feature',
        'System.State': 'Active',
        ...
      }
    }
  ]
}

// Dashboard needs:
{
  summary: {
    activeWorkItems: 24,  // ← Calculated
    activePipelines: 8,
    successRate: 92.5,
    openPRs: 12
  },
  workItems: {
    new: 5,  // ← Count by state
    active: 12,
    resolved: 4,
    closed: 3
  },
  workItemDetails: [
    {
      id: 1234,
      title: 'Implement feature',  // ← Extracted
      type: 'Feature',  // ← Extracted
      state: 'Active',  // ← Extracted
      assignedTo: 'John Doe',  // ← Extracted
      priority: '1'  // ← Extracted
    }
  ]
}
```

---

## 🧪 TESTING

### Test 1: Verify Route is Registered

```bash
# Start orchestrator
cd /qe-mcp-stack/orchestrator
npm start

# Check logs for:
# "Registered route: /api/dashboard"
# or similar message
```

### Test 2: Test Code Analysis Endpoint

```bash
curl "http://localhost:4000/api/dashboard/code-analysis?app=App1"

# Should return JSON with:
# - applications array
# - files array
# - classes array
# - coverage object
# - dependencies object
```

### Test 3: Test Azure DevOps Endpoint

```bash
curl "http://localhost:4000/api/dashboard/aod-summary"

# Should return JSON with:
# - summary object
# - sprint object
# - workItems object
# - workItemDetails array
```

### Test 4: Test Story Analysis

```bash
curl -X POST http://localhost:4000/api/dashboard/analyze-story \
  -H "Content-Type: application/json" \
  -d '{"storyId": 12345}'

# Should return JSON with:
# - workItem object
# - requirementsAnalysis object
# - testCases object
# - automationRequirements object
```

### Test 5: Test from Dashboard

```bash
# 1. Start Code Dashboard
cd /qe-mcp-stack/code-dashboard
node server.js

# 2. Open http://localhost:8081
# 3. Select "App1" from dropdown
# 4. Should see real data populate

# 5. Start AOD Dashboard
cd /qe-mcp-stack/ado-dashboard
node server.js

# 6. Open http://localhost:8082
# 7. Should see work items populate
```

---

## 🐛 TROUBLESHOOTING

### Route Not Found (404)

**Symptom**: Dashboard calls endpoint, gets 404

**Cause**: Route not registered in orchestrator

**Fix**:
1. Verify dashboard.js is in `/qe-mcp-stack/orchestrator/src/routes/`
2. Check orchestrator index.js has import and app.use()
3. Restart orchestrator
4. Check logs for route registration

---

### "mcpManager is not defined"

**Symptom**: Error in orchestrator logs

**Cause**: MCPManager not injected into request

**Fix**: Ensure middleware exists in index.js:
```javascript
app.use((req, res, next) => {
  req.mcpManager = mcpManager;
  next();
});
```

---

### "Cannot find module './utils/logger.js'"

**Symptom**: Import error when starting orchestrator

**Cause**: dashboard.js imports logger but path is wrong

**Fix**: Update import in dashboard.js to match your structure:
```javascript
// If your logger is at different path:
import { logger } from '../../utils/logger.js';

// Or if you don't have logger:
const logger = console;  // Simple fallback
```

---

### MCP Call Fails

**Symptom**: "Unknown MCP: dotnetCodeAnalyzer"

**Cause**: MCP not registered in MCPManager

**Fix**: Check `/qe-mcp-stack/orchestrator/src/services/mcpManager.js`:
```javascript
this.dockerMcps = {
  dotnetCodeAnalyzer: { url: 'http://dotnet-code-analyzer:3001', ... },
  dotnetCoverageAnalyzer: { url: 'http://dotnet-coverage-analyzer:3002', ... },
  azureDevOps: { url: 'http://azure-devops:3003', ... },
  // ... make sure all MCPs are listed
};
```

---

### STDIO MCP Fails

**Symptom**: "Failed to spawn MCP"

**Cause**: STDIO MCP path incorrect

**Fix**: Check mcpManager.js `callStdioMcp()` method:
```javascript
const mcpPath = `/app/mcps/${mcpName}/index.js`;
// Make sure this path matches your STDIO MCP location
```

---

## 📊 COMPLETE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    FINAL ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ Code Analysis│        │ Azure DevOps │                  │
│  │  Dashboard   │        │  Dashboard   │                  │
│  │ Port 8081    │        │  Port 8082   │                  │
│  └──────┬───────┘        └──────┬───────┘                  │
│         │                       │                           │
│         │ GET /api/dashboard/   │ GET /api/dashboard/      │
│         │     code-analysis     │     aod-summary          │
│         │                       │                           │
│         └───────────┬───────────┘                           │
│                     ▼                                        │
│         ┌───────────────────────┐                          │
│         │   QE Orchestrator     │                          │
│         │   Port 4000           │                          │
│         │                       │                          │
│         │ Routes:               │                          │
│         │ ├─ /api/ado/*         │ ← Existing               │
│         │ ├─ /api/analysis/*    │ ← Existing               │
│         │ ├─ /api/tests/*       │ ← Existing               │
│         │ └─ /api/dashboard/*   │ ← NEW (dashboard.js)     │
│         │                       │                          │
│         │ Middleware:           │                          │
│         │ └─ req.mcpManager     │ ← Injected               │
│         └──────────┬────────────┘                          │
│                    │                                         │
│            ┌───────┴────────┐                               │
│            ▼                ▼                                │
│    ┌──────────────┐  ┌─────────────┐                       │
│    │ Docker MCPs  │  │ STDIO MCPs  │                       │
│    ├──────────────┤  ├─────────────┤                       │
│    │ • Code       │  │ • Req       │                       │
│    │   Analyzer   │  │   Analyzer  │                       │
│    │ • Coverage   │  │ • Test Case │                       │
│    │ • ADO        │  │   Planner   │                       │
│    │ • Risk       │  │ • Automation│                       │
│    │ • ...13 more │  │   Reqs      │                       │
│    └──────┬───────┘  └──────┬──────┘                       │
│           │                 │                               │
│           ▼                 ▼                                │
│    ┌────────────────────────────┐                          │
│    │   External Services        │                          │
│    │ • Azure DevOps API         │                          │
│    │ • Anthropic Claude API     │                          │
│    │ • Your .NET Applications   │                          │
│    └────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ VERIFICATION CHECKLIST

After installation:

- [ ] dashboard.js file exists in `/qe-mcp-stack/orchestrator/src/routes/`
- [ ] orchestrator index.js imports dashboard.js
- [ ] orchestrator index.js has `app.use('/api/dashboard', dashboardRoutes)`
- [ ] Orchestrator starts without errors
- [ ] `curl http://localhost:4000/api/dashboard/code-analysis?app=App1` works
- [ ] `curl http://localhost:4000/api/dashboard/aod-summary` works
- [ ] Code dashboard (8081) shows real data
- [ ] AOD dashboard (8082) shows real data

---

## 📝 SUMMARY

### What This Package Adds:

✅ **6 new dashboard endpoints** to orchestrator
✅ **Connects both dashboards** to your MCPs
✅ **No separate API servers** needed
✅ **Unified architecture** - everything through orchestrator
✅ **Data transformation** - MCP format → Dashboard format
✅ **Error handling** - Graceful failures with logging

### Files Modified:
- **Added**: `/qe-mcp-stack/orchestrator/src/routes/dashboard.js` (NEW)
- **Modified**: `/qe-mcp-stack/orchestrator/index.js` (2 lines added)

### Result:
```
Dashboards → Orchestrator → MCPs → Real Data! 🎉
```

**No more dummy data! Everything connected! Complete QE stack operational! 🚀**
