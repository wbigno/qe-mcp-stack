# ADO Dashboard - Integration Status & Clarifications

## Current Tab Structure

### 1. **Story Analyzer Tab** (🤖 Analyze User Story)
- **Purpose**: Manual story analysis input form
- **Function**: Enter a Story ID and click "Analyze Story" or "Generate Tests"
- **API Called**: `/api/ado/analyze-requirements` (uses AI model to analyze requirements)
- **Output**: Analysis results displayed in the "Story Analysis" tab

### 2. **Story Analysis Tab** (🔍 Story Analysis)
- **Purpose**: Results viewer for analyzed stories
- **Function**: Displays detailed analysis from the Story Analyzer
- **Content**: Shows requirements, acceptance criteria, test suggestions, etc.
- **When Used**: Automatically shown when clicking "Analyze" buttons

**CONFUSION RESOLVED**: These are two parts of the same workflow:
- **Story Analyzer** = Input form (you type ID here)
- **Story Analysis** = Output viewer (results show here)

## MCP Integration Status

### ✅ **Currently Integrated MCPs**

1. **Azure DevOps MCP** (`azure-devops`)
   - Port: 3003
   - Used for: Fetching work items, sprints, defects
   - Endpoints: `/work-items/query`, `/pull-stories`

2. **DotNet Code Analyzer** (`dotnet-code-analyzer`)
   - Port: 3001
   - Used for: Code analysis (NOT used in ADO dashboard)

3. **DotNet Coverage Analyzer** (`dotnet-coverage-analyzer`)
   - Port: 3002
   - Used for: Test coverage (NOT used in ADO dashboard)

### ❌ **NOT Currently Integrated in ADO Dashboard**

1. **Risk Analyzer MCP** (`risk-analyzer`)
   - Port: 3009
   - Status: **Running but NOT called** from ADO dashboard
   - Purpose: Analyze risk and blast radius of changes
   - **ACTION NEEDED**: Not integrated yet

2. **Integration Mapper MCP** (`integration-mapper`)
   - Port: 3008
   - Status: **Running but NOT called** from ADO dashboard
   - Purpose: Map system integrations and dependencies
   - **ACTION NEEDED**: Not integrated yet

## API Response Analysis

### Current Work Item Fields Returned:
```json
{
  "id": 63019,
  "title": "Sprint 26.Q1.01 Release Ticket",
  "type": "Product Backlog Item",
  "state": "Committed",
  "assignedTo": "Unassigned",
  "priority": 2,
  "tags": "",
  "iterationPath": "Core\\Core Team\\2026\\Q1\\26.Q1.01",
  "areaPath": "Core",
  "createdDate": "2026-01-06T20:29:07.817Z",
  "changedDate": "2026-01-07T14:12:49.61Z",
  "parentId": null
}
```

### ❌ **Missing Fields** (Not Currently Fetched):
- **Description** - Story description/details
- **Acceptance Criteria** - AC text
- **Repro Steps** - For bugs
- **System.Description** field not requested from API

## Requested Changes

### 1. Work Items Tab - Button Changes
- ✅ **Keep**: "View" button on all tasks (drill into details)
- ❌ **Remove**: "Analyze" button from child tasks
- ✅ **Keep**: "Analyze" button only on parent items (PBIs, Features, Bugs)
- ✅ **Behavior**: Clicking "Analyze" should switch to Story Analyzer tab with that ID pre-filled

### 2. Show Descriptions
- **PBIs**: Show description field in parent card
- **Bugs**: Show description/repro steps in parent card
- **Tasks**: Show description in "View" detail panel
- **STATUS**: Description fields not currently fetched from API

### 3. Risk & Blast Radius Integration
- **Current State**: MCPs running but NOT integrated
- **Needed**:
  - Create endpoint to call Risk Analyzer MCP
  - Display risk score on parent cards
  - Show blast radius visualization
  - Add tab for Risk Analysis view

## Action Items

1. **Fetch Description Fields** from Azure DevOps API
2. **Remove "Analyze" buttons** from child tasks
3. **Update "Analyze" button** on parents to navigate to Story Analyzer tab
4. **Add description display** to parent cards (expandable section)
5. **Integrate Risk Analyzer MCP**
   - Create `/api/ado/analyze-risk` endpoint
   - Call risk-analyzer:3009
   - Display risk scores on cards
6. **Integrate Integration Mapper MCP**
   - Create `/api/ado/map-integrations` endpoint
   - Call integration-mapper:3008
   - Show dependency visualization

## Next Steps Priority

1. **HIGH**: Fix button layout (remove analyze from tasks)
2. **HIGH**: Add description fields to API response
3. **MEDIUM**: Integrate Risk Analyzer display
4. **MEDIUM**: Integrate Integration Mapper display
5. **LOW**: Add task detail view panel
