# Enhanced Azure DevOps Dashboard

## 🎯 What's New

This enhanced version adds **interactive query controls** so you can:
- ✅ Enter specific Sprint names
- ✅ Enter Story IDs for AI analysis
- ✅ Filter by Project and State
- ✅ Generate test cases on demand
- ✅ Quick-analyze stories from the work items table

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

### 1. Query Work Items by Sprint

1. Go to `http://localhost:3000/ado-dashboard/`
2. At the top, enter:
   - **Project**: Your project name (optional)
   - **Sprint**: e.g., "Sprint 42" or "Sprint 2026-01"
   - **State**: Filter by New/Active/Resolved/Closed (optional)
3. Click **"Pull Work Items"**
4. Dashboard refreshes with filtered data

**Example**:
```
Sprint: Sprint 42
State: Active
[Pull Work Items] → Shows only active items from Sprint 42
```

---

### 2. Analyze a Story with AI

1. Click **"Story Analyzer"** tab
2. Enter **Story ID** (e.g., 12345)
3. Click **"Analyze Story"**
4. View results:
   - Requirements completeness score
   - Testability score
   - Missing requirements
   - Generated test cases
   - Automation feasibility

**API Called**:
```
POST /api/dashboard/analyze-story
Body: { "storyId": 12345 }
```

---

### 3. Generate Test Cases

1. In **Story Analyzer** tab
2. Enter **Story ID**
3. Click **"Generate Test Cases"**
4. View generated test cases with:
   - Test names
   - Descriptions
   - Steps
   - Expected results
   - Priority

**API Called**:
```
GET /api/dashboard/work-item/12345?generateTestCases=true
```

---

### 4. Quick Analyze from Work Items Table

1. Go to **"Work Items"** tab
2. Click **"Analyze"** button next to any work item
3. Automatically switches to Story Analyzer
4. Fills in the Story ID
5. Runs analysis

---

## 🎨 New Features

### Query Control Panel

```
┌─────────────────────────────────────────┐
│  🔍 Query Azure DevOps                  │
├─────────────────────────────────────────┤
│  Project: [YourProject      ]           │
│  Sprint:  [Sprint 42        ]           │
│  State:   [Active           ▼]          │
│                                         │
│  [Pull Work Items] [Clear Filters]      │
└─────────────────────────────────────────┘
```

### Story Analyzer Tab

```
┌─────────────────────────────────────────┐
│  🤖 Story Analyzer                      │
├─────────────────────────────────────────┤
│  Story ID: [12345]                      │
│                                         │
│  [Analyze Story] [Generate Test Cases]  │
│                                         │
│  📋 Requirements Analysis               │
│  ├─ Completeness: 85/100                │
│  ├─ Testability: 78/100                 │
│  └─ Missing Requirements: ...           │
│                                         │
│  ✅ Test Cases (12)                     │
│  └─ 1. Test user login                  │
│     2. Test invalid credentials         │
│     ...                                 │
└─────────────────────────────────────────┘
```

---

## 🔌 API Endpoints Used

### 1. Get Work Items (with filters)
```
GET /api/dashboard/aod-summary?project=MyProject&sprint=Sprint%2042&state=Active
```

### 2. Analyze Story
```
POST /api/dashboard/analyze-story
Content-Type: application/json

{
  "storyId": 12345
}

Response: {
  workItem: {...},
  requirementsAnalysis: {...},
  testCases: {...},
  automationRequirements: {...}
}
```

### 3. Get Work Item with Test Generation
```
GET /api/dashboard/work-item/12345?analyze=true&generateTestCases=true

Response: {
  workItem: {...},
  requirementsAnalysis: {...},
  testCases: [...]
}
```

---

## 🎯 Workflow Examples

### Example 1: Analyze Sprint 42

```
1. Enter "Sprint 42" in Sprint field
2. Click "Pull Work Items"
3. View all work items from Sprint 42
4. Click "Analyze" on Story #1234
5. View AI analysis results
```

### Example 2: Generate Tests for Story

```
1. Go to Story Analyzer tab
2. Enter Story ID: 5678
3. Click "Analyze Story"
4. Review requirements analysis
5. Click "Generate Test Cases"
6. Copy test cases for implementation
```

### Example 3: Filter by State

```
1. Select State: "Active"
2. Click "Pull Work Items"
3. View only active items
4. Analyze high-priority items
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

### Requirements Analysis
- ✅ Completeness Score (0-100)
- ✅ Testability Score (0-100)
- ✅ Missing Requirements list
- ✅ Recommendations

### Test Cases
- ✅ Test name
- ✅ Description
- ✅ Steps to reproduce
- ✅ Expected results
- ✅ Priority level

### Automation Assessment
- ✅ Automation feasibility score
- ✅ Recommended approach
- ✅ Suggested tools
- ✅ Complexity estimate

---

## 🎉 Benefits

**Before**: Static display, no filtering
**After**: 
- ✅ Filter by Sprint, Project, State
- ✅ AI-powered story analysis
- ✅ One-click test generation
- ✅ Interactive and responsive
- ✅ Real-time API integration

---

## 📝 Notes

- Sprint names must match Azure DevOps exactly (case-sensitive)
- Story IDs must be valid integer IDs from your ADO project
- All queries hit your orchestrator on port 3000
- Results are displayed in real-time
- Loading spinners show when operations are in progress
- Status messages appear at top for success/error feedback

---

**Enjoy your interactive ADO Dashboard! 🚀**
