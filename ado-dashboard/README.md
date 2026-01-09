# Azure DevOps Dashboard

## 🎯 Overview

This dashboard provides comprehensive tools for analyzing Azure DevOps work items with two specialized tabs:

**🔍 Story Analysis Tab** - Technical Code Analysis:
- ✅ Blast Radius Analysis (identify affected components from code changes)
- ✅ Risk Assessment (technical risk scoring based on complexity)
- ✅ Integration Impact (discover integration points)
- Note: Does NOT include test case generation

**🤖 Story Analyzer Tab** - AI-Powered Requirements & Test Planning:
- ✅ Requirements Analysis (AI parses acceptance criteria, identifies gaps)
- ✅ Risk Analysis (using risk-analyzer MCP)
- ✅ Manual Test Case Generation (AI generates detailed manual test cases with steps, preconditions, expected results)
- ✅ AI Model Selector (choose Claude model)

Additional Features:
- ✅ Work Items listing with sprint/project filtering
- ✅ Integration with Azure DevOps API
- ✅ Real-time analysis results

---

## 📋 Installation

### Replace Your Existing ADO Dashboard

```bash
# Backup current dashboard
cd /Users/williambigno/dev/git/qe-mcp-stack
cp -r ado-dashboard ado-dashboard-backup

# Copy new files
cp ado-dashboard-enhanced/index.html ado-dashboard/index.html
cp ado-dashboard-enhanced/script.js ado-dashboard/script.js

# Keep your existing styles.css (no changes needed)

# Restart Docker (files are mounted, so no rebuild needed)
docker-compose restart orchestrator
```

---

## 🚀 How to Use

### 1. Browse Work Items

1. Go to `http://localhost:5173`
2. Navigate to **"Work Items"** tab
3. Use filters:
   - **Application**: Select from dropdown
   - **Sprint**: Select current or past sprints
   - **State**: Filter by Active/New/Resolved/Closed
4. View list of work items with details

---

### 2. Technical Analysis (🔍 Story Analysis Tab)

Use this tab for **code-level impact analysis**:

1. Click **"🔍 Story Analysis"** tab from a work item
2. Enter **Changed Files** (the files this story will modify):
   ```
   Services/BillingService.cs
   Controllers/BillingController.cs
   Models/Invoice.cs
   ```
3. Run analyses:
   - **Blast Radius**: Click "Run Analysis" to see affected components and tests
   - **Risk Assessment**: Click "Run Analysis" for technical risk scoring
   - **Integration Impact**: Click "Run Analysis" to discover integration points

4. View results for each analysis type
5. Optionally push results to Azure DevOps

**APIs Used**:
```
POST /api/analysis/blast-radius/analyze
POST /api/analysis/risk/analyze-story
POST /api/analysis/integrations/map
```

---

### 3. AI Requirements Analysis & Test Planning (🤖 Story Analyzer Tab)

Use this tab for **AI-powered requirements review and manual test case generation**:

1. Click **"🤖 Story Analyzer"** tab
2. Enter **Story ID** (e.g., 63019)
3. Select AI model from dropdown (Claude Opus, Sonnet, or Haiku)
4. Click **"Analyze Requirements"**
   - View AI-parsed acceptance criteria
   - See requirement gaps and ambiguities
   - Review suggested edge cases
   - Get test coverage recommendations

5. Click **"Generate Test Cases"**
   - AI generates comprehensive manual test cases
   - Each test case includes:
     - Title and type (Functional, Integration, Negative, Edge Case)
     - Priority (High/Medium/Low)
     - Preconditions
     - Step-by-step instructions
     - Expected results
     - Test data requirements

6. Optionally push test cases to Azure DevOps

**APIs Used**:
```
POST /api/ado/analyze-requirements
Body: { "storyIds": [63019], "model": "claude-sonnet-4-20250514" }

POST /api/ado/generate-test-cases
Body: { "storyId": 63019, "includeNegativeTests": true, "includeEdgeCases": true }
```

---

### 4. Quick Navigation from Work Items

1. Go to **"Work Items"** tab
2. Find a parent work item (PBI, Feature, Bug)
3. Click **"📊 View Analysis"** button
4. Automatically navigates to Story Analysis tab with story selected

---

## 🎨 Key Features

### Two Specialized Analysis Tabs

**🔍 Story Analysis** - For Developers/Tech Leads:
- Blast Radius: See which components are affected by code changes
- Risk Assessment: Get technical risk scores based on complexity, coverage, and change scope
- Integration Impact: Discover all integration points and external dependencies
- Push results back to Azure DevOps work item

**🤖 Story Analyzer** - For QA/Test Planners:
- Requirements Analysis: AI parses acceptance criteria and identifies gaps
- Risk Analysis: Assess story complexity and testing needs
- Manual Test Case Generation: AI creates detailed test cases ready for execution
- Push test cases back to Azure DevOps

### AI Model Selection

Choose from multiple Claude models based on your needs:
- **Claude Opus 4.5**: Highest quality, best for complex stories
- **Claude Sonnet 4.5**: Balanced quality and speed (default)
- **Claude Haiku**: Fast and cost-effective for simple stories

---

## 🔌 API Endpoints Used

### Story Analysis Tab (Technical Analysis)

#### 1. Blast Radius Analysis
```
POST /api/analysis/blast-radius/analyze
Content-Type: application/json

{
  "app": "Payments",
  "changedFiles": ["Services/BillingService.cs", "Controllers/BillingController.cs"],
  "analysisDepth": "moderate"
}

Response: {
  success: true,
  result: {
    risk: { level: "medium", score: 65, description: "..." },
    changedFiles: [...],
    impact: { affectedComponents: [...], affectedTests: [...] },
    recommendations: [...]
  }
}
```

#### 2. Risk Assessment
```
POST /api/analysis/risk/analyze-story
Content-Type: application/json

{
  "app": "Payments",
  "story": {
    "id": 63019,
    "title": "...",
    "description": "...",
    "acceptanceCriteria": "..."
  }
}

Response: {
  success: true,
  result: {
    risk: {
      level: "medium",
      score: 43,
      factors: {...},
      recommendations: [...]
    }
  }
}
```

#### 3. Integration Impact
```
POST /api/analysis/integrations/map
Content-Type: application/json

{
  "app": "Payments",
  "integrationType": "all",
  "includeDiagram": false
}

Response: {
  success: true,
  result: {
    summary: { total: 25, byType: {...} },
    integrations: [...]
  }
}
```

### Story Analyzer Tab (AI-Powered Analysis)

#### 4. Requirements Analysis
```
POST /api/ado/analyze-requirements
Content-Type: application/json

{
  "storyIds": [63019],
  "includeGapAnalysis": true,
  "model": "claude-sonnet-4-20250514"
}

Response: {
  success: true,
  count: 1,
  results: [
    {
      storyId: 63019,
      title: "...",
      requirementsAnalysis: {
        acceptanceCriteria: [...],
        requirementGaps: [...],
        suggestedEdgeCases: [...],
        integrationPoints: [...],
        testCoverageRecommendation: {...},
        prioritizedTestAreas: [...]
      },
      riskAnalysis: {
        riskLevel: "medium",
        riskScore: 43,
        recommendations: [...]
      }
    }
  ]
}
```

#### 5. Generate Manual Test Cases
```
POST /api/ado/generate-test-cases
Content-Type: application/json

{
  "storyId": 63019,
  "includeNegativeTests": true,
  "includeEdgeCases": true,
  "model": "claude-sonnet-4-20250514"
}

Response: {
  success: true,
  storyId: 63019,
  storyTitle: "...",
  testCases: [
    {
      id: 1,
      title: "Verify successful deployment...",
      type: "Functional",
      priority: 1,
      automated: false,
      preconditions: ["..."],
      steps: ["..."],
      expectedResults: ["..."],
      testData: {...},
      notes: "..."
    }
  ],
  summary: {
    totalTestCases: 9,
    functionalTests: 3,
    integrationTests: 1,
    negativeTests: 2,
    edgeCaseTests: 3,
    highPriority: 3,
    mediumPriority: 5,
    lowPriority: 1
  }
}
```

---

## 🎯 Workflow Examples

### Example 1: Assess Code Impact Before Development

**Scenario**: Developer wants to understand blast radius before making changes

```
1. Navigate to Work Items tab
2. Find the story you're working on (e.g., #63019)
3. Click "📊 View Analysis" button
4. In Story Analysis tab, enter changed files:
   - Services/PaymentService.cs
   - Controllers/PaymentController.cs
5. Run Blast Radius Analysis
6. Review affected components and tests
7. Run Risk Assessment to see technical risk score
8. Run Integration Impact to find external dependencies
9. Push results to ADO work item for team visibility
```

### Example 2: Generate Manual Test Cases for QA

**Scenario**: QA needs manual test cases for a new feature

```
1. Navigate to Work Items tab
2. Find the feature story (e.g., #63020 "Add payment refund flow")
3. Go to Story Analyzer tab
4. Enter Story ID: 63020
5. Select AI Model: Claude Sonnet 4.5 (default)
6. Click "Analyze Requirements"
   - Review acceptance criteria parsing
   - Check requirement gaps identified by AI
   - Note suggested edge cases
7. Click "Generate Test Cases"
8. Review 9 generated test cases with:
   - 3 functional tests (happy path)
   - 2 negative tests (error handling)
   - 3 edge case tests (boundary conditions)
   - 1 integration test
9. Push test cases to ADO for execution
```

### Example 3: Complete Analysis Workflow

**Scenario**: Tech lead wants full analysis before sprint starts

```
1. Open Story Analysis tab for technical impact
   - Enter all files to be modified
   - Run all 3 analyses (Blast Radius, Risk, Integration)
   - Save technical findings

2. Switch to Story Analyzer tab for test planning
   - Analyze requirements with AI
   - Generate comprehensive test cases
   - Review test coverage recommendations

3. Push all results to ADO work item
4. Share with team for sprint planning
```

---

## 🐛 Troubleshooting

### "Failed to load data"
- **Check**: Orchestrator is running (`docker ps | grep orchestrator`)
- **Check**: Port 3000 is accessible (`curl http://localhost:3000/health`)
- **Check**: Azure DevOps MCP is healthy

### Story analysis returns error
- **Check**: Story ID is valid
- **Check**: Azure DevOps MCP can access the work item
- **Check**: STDIO MCPs are configured (requirements-analyzer, test-case-planner)

### No data appears
- **Check**: Browser console (F12) for errors
- **Check**: API endpoint is correct (should be port 3000)
- **Try**: Hard refresh (Cmd+Shift+R)

---

## 📊 What Gets Displayed

### Story Analysis Tab (Technical)

**Blast Radius Analysis**:
- ✅ Risk Level (Low/Medium/High) with risk score
- ✅ Changed files with existence check
- ✅ Affected components list
- ✅ Affected test files
- ✅ Recommendations by category (Testing, Documentation, Monitoring)

**Risk Assessment**:
- ✅ Overall risk score (0-100)
- ✅ Risk level badge (Low/Medium/High)
- ✅ Risk factors breakdown (complexity, coverage, integration risk)
- ✅ Recommendations with priority levels

**Integration Impact**:
- ✅ Total integration count
- ✅ Integration types breakdown (REST, GraphQL, Database, etc.)
- ✅ Detailed integration points with URLs/details
- ✅ File locations for each integration

### Story Analyzer Tab (AI-Powered)

**Requirements Analysis**:
- ✅ Parsed acceptance criteria with testability assessment
- ✅ Requirement gaps identified by AI
- ✅ Suggested edge cases
- ✅ Integration points discovered from description
- ✅ Test coverage recommendation (functional, integration, negative, edge case counts)
- ✅ Prioritized test areas with reasoning

**Manual Test Cases**:
- ✅ Test case title and type (Functional/Integration/Negative/EdgeCase)
- ✅ Priority level (1=High, 2=Medium, 3=Low)
- ✅ Preconditions (what must be true before test)
- ✅ Step-by-step test instructions
- ✅ Expected results for each step
- ✅ Test data requirements
- ✅ Additional notes and context
- ✅ Summary statistics (total, by type, by priority)

---

## 🎉 Benefits

### For Developers
- ✅ **Blast Radius Visibility**: Know exactly which components your changes affect
- ✅ **Risk Assessment**: Understand technical risk before coding
- ✅ **Integration Discovery**: Find all integration points automatically
- ✅ **Proactive Planning**: Catch issues before they reach production

### For QA/Test Engineers
- ✅ **AI-Generated Test Cases**: Save hours creating manual test cases
- ✅ **Comprehensive Coverage**: Get functional, negative, and edge case tests
- ✅ **Requirements Gap Detection**: AI identifies missing acceptance criteria
- ✅ **Structured Test Plans**: Ready-to-execute test cases with steps and expected results

### For Team Leads
- ✅ **Data-Driven Decisions**: Quantified risk scores for sprint planning
- ✅ **Complete Visibility**: Technical and QA analysis in one place
- ✅ **Push to ADO**: Share results directly in work items
- ✅ **Consistent Quality**: Standardized analysis across all stories

---

## 📝 Important Notes

### Technical Requirements
- Dashboard runs on port 5173 (Vite dev server)
- Orchestrator must be running on port 3000
- ANTHROPIC_API_KEY must be configured for AI features
- Azure DevOps MCP must be healthy for work item retrieval

### Usage Notes
- Story IDs must be valid integer IDs from your ADO project
- Changed files should use relative paths from repository root
- AI model selection affects response quality and cost
- Results can be pushed back to Azure DevOps work items
- Loading spinners show when AI is processing requests

### AI Model Selection
- **Claude Opus 4.5**: Best quality, higher cost (~15-30 seconds)
- **Claude Sonnet 4.5**: Balanced, recommended default (~10-15 seconds)
- **Claude Haiku**: Fast and cheap, good for simple stories (~5-8 seconds)

---

**Ready to analyze your stories! 🚀**
