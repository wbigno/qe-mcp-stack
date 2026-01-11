# Code Analysis Dashboard - Complete Documentation

**Version**: 3.0 Enhanced with Filters, Priority Scoring, and Class Grouping
**Last Updated**: January 8, 2026

---

## 📋 Table of Contents

- [Overview](#overview)
- [Recent Updates (v3.0)](#recent-updates-v30)
- [Architecture](#architecture)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [User Guide](#user-guide)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Code Analysis Dashboard is a real-time web-based interface for analyzing .NET codebases. It provides comprehensive insights into code quality, test coverage, complexity, and test gaps.

**Key Capabilities**:
- Real-time code analysis for multiple .NET applications
- Test coverage tracking with gap identification
- Priority-based test recommendation system
- Multi-class file support with visual grouping
- Advanced filtering (complexity, coverage thresholds)
- Automated test generation integration

---

## 🆕 Recent Updates

### v3.1 - False Positive Test Detection (January 8, 2026)

#### 1. **False Positive Test Detection & Highlighting**
- **Automated Detection**: Identifies test methods that exist but never execute (0% coverage)
- **Summary Card**: New "🚨 FALSE POSITIVE TESTS" card in Test Gaps tab with red gradient styling
- **Visual Distinction**: False positive rows highlighted with:
  - 🚨 Warning icon instead of standard test icon
  - Red gradient background with border
  - "⚠️ FALSE POSITIVE" badge
  - Hover effects for emphasis
- **Why It Matters**: False positives give false confidence, waste CI/CD resources, and clutter test suites

#### 2. **Gap Type Filter**
New filter dropdown to focus on specific test gap categories:
- **🚨 False Positive Tests**: Tests that never execute
- **❌ Missing Unit Tests**: Production code with no tests
- **⚠️ Partial Coverage**: Methods needing more test cases
- **🔸 Missing Negative Tests**: Methods without error scenario tests
- **All Test Gaps** (default): Show everything

#### 3. **Enhanced Test Method Discovery**
- **Scans ALL `.cs` files**: Previously only searched files with "Test" in filename
- **Detects tests anywhere**: Finds test methods in:
  - Non-standard file names (e.g., `UserValidation.cs` with `[Fact]` methods)
  - Helper files without "Test" in name
  - Partial class files
  - Any file with `[Test]`, `[Fact]`, `[Theory]`, or `[TestMethod]` attributes
- **Partial Class Support**: Now detects `public partial class` declarations

#### 4. **Categorized Gap Analysis**
Backend now categorizes all test gaps into:
- `falsePositiveTests`: Test methods with 0% coverage in test files
- `productionWithoutTests`: Production methods with no tests
- `needsMoreTests`: Methods with partial coverage
- `missingNegativeTests`: Methods without error tests

### v3.0 - Major Feature Release (January 8, 2026)

#### 1. **Enhanced Filter System**
- **Apply Button**: Filters no longer auto-trigger on selection
- **Complexity Filter**: Filter methods by cyclomatic complexity (Low <5, Medium 5-10, High >10)
- **Coverage Threshold Filter**: Filter by coverage level (≥80%, 50-80%, <50%)
- **Clear Button**: Reset all filters to default state

#### 2. **Priority Scoring Algorithm**
Multi-factor weighted scoring system for test prioritization:
- **Test Coverage Status (40%)**: No tests = 40pts, Has tests but no negative = 20pts
- **Method Complexity (25%)**: High (>10) = 25pts, Medium (5-10) = 15pts, Low (<5) = 5pts
- **Visibility Level (20%)**: Public = 20pts, Internal/Protected = 10pts, Private = 5pts
- **File Type/Role (10%)**: Controller = 10pts, Service/Repository = 8pts, Utility = 5pts
- **Call Frequency (5%)**: Reserved for future enhancement

**Priority Levels**:
- **CRITICAL** (70-100 points): Urgent attention required
- **HIGH** (50-69 points): High priority
- **MEDIUM** (30-49 points): Medium priority
- **LOW** (0-29 points): Low priority

#### 3. **Multi-Class File Support**
- Automatic detection of files with multiple classes
- Visual grouping with class headers (`📦 Class: ClassName`)
- Method count badges per class
- Alphabetical sorting of classes within files
- Smart display (class headers only shown for multi-class files)

#### 4. **Enhanced API Responses**
Backend now returns comprehensive method metadata:
- `className`: Parent class name for grouping
- `lineNumber`: Source code line number
- `visibility`: public/private/protected/internal
- `complexity`: Cyclomatic complexity score
- `fileType`: Controller/Service/Repository/Model/Utility
- `isPublic`: Boolean flag for quick filtering

#### 5. **Smart Button Logic**
Test generation buttons now follow priority rules:
- If file has ANY untested methods → Show "Generate Unit Tests" ONLY
- Else if file ONLY has methods missing negative tests → Show "Generate Negative Tests" ONLY
- Else if file needs integration tests → Show "Generate Integration Tests"
- Else → Show "✅ Fully Covered"

#### 6. **Priority Explanation Panel**
New educational section in Test Gaps tab explaining:
- How priority scores are calculated
- Visual priority level cards with color coding
- Detailed scoring breakdown table
- Example calculations
- Best practices recommendations

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│ Code Dashboard (Browser - Port 3000)                   │
│                                                         │
│ User opens: http://localhost:3000                      │
│ ├─ Loads: index.html                                   │
│ ├─ Loads: styles.css                                   │
│ └─ Loads: script.js                                    │
│           │                                             │
│           │ JavaScript makes API calls to:             │
│           • GET /api/dashboard/applications            │
│           • POST /api/analysis/test-gaps               │
│           • POST /api/tests/generate-for-file          │
│           │                                             │
└───────────┼─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│ QE Orchestrator (Port 3000)                            │
│                                                         │
│ Routes:                                                 │
│ ├─ /api/dashboard/* - Dashboard data endpoints         │
│ ├─ /api/analysis/* - Analysis endpoints                │
│ └─ /api/tests/* - Test generation endpoints            │
│           │                                             │
│           │ Coordinates calls to MCPs:                  │
│           ├─ dotnetCodeAnalyzer (Port 3001)            │
│           ├─ dotnetCoverageAnalyzer (Port 3002)        │
│           ├─ riskAnalyzer                              │
│           ├─ integrationMapper                         │
│           └─ dotnet-unit-test-generator                │
│           │                                             │
└───────────┼─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│ MCP Services (Docker Containers)                       │
│                                                         │
│ Code Analyzer (Port 3001):                             │
│   • Scans C# files                                     │
│   • Extracts classes, methods, properties              │
│   • Calculates cyclomatic complexity                   │
│   • Returns: className, visibility, lineNumber, etc.   │
│                                                         │
│ Coverage Analyzer (Port 3002):                         │
│   • Parses Cobertura XML coverage reports              │
│   • Detects test methods in test files                 │
│   • Matches tests to source methods                    │
│   • Returns: hasTests, hasNegativeTests, coverage%     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Docker Compose Setup

All services run via Docker Compose:
```yaml
services:
  orchestrator:          # Port 3000
  code-dashboard:        # Port 3000 (served by orchestrator)
  dotnet-code-analyzer:  # Port 3001
  dotnet-coverage-analyzer: # Port 3002
  # ... additional MCPs
```

---

## ✨ Features

### 1. Overview Tab
- Total files, classes, methods analyzed
- Overall code coverage percentage
- High complexity file count
- Test gaps summary

### 2. Coverage Tab
- Line, branch, and method coverage metrics
- Coverage visualization
- Detailed coverage breakdown by file

### 3. Complexity Tab
- Method-level complexity analysis
- Risk indicators
- Filtering by complexity thresholds

### 4. Test Gaps Tab (★ PRIMARY FEATURE)

**Display Structure**:
```
📄 HealthService.cs (3 gaps)
  [🧪 Generate Unit Tests] [▼ Show Methods]

  When expanded:

  📦 Class: HealthService     [2 methods]
  ┌─────────────────────────────────────────────────┐
  │ Method        | Coverage | Tests | Priority    │
  │ DatabaseAsync | N/A      | ❌    | 🔥 CRITICAL │
  │ HealthService | N/A      | ❌    | 🔴 HIGH     │
  └─────────────────────────────────────────────────┘

  📦 Class: HealthResults     [1 method]
  ┌─────────────────────────────────────────────────┐
  │ Method   | Coverage | Tests | Priority          │
  │ ...      | ...      | ...   | ...               │
  └─────────────────────────────────────────────────┘
```

**Features**:
- File-level grouping with gap counts
- Class-level sub-grouping (for multi-class files)
- Priority scoring with color-coded badges
- Smart test generation buttons
- Expandable method details
- Real-time filtering

**Statistics Shown**:
- Total Methods: All methods analyzed
- Files with Gaps: Files needing tests
- Untested Methods: Methods with no tests at all
- Partial Coverage: Methods with some tests but low coverage
- Missing Negative Tests: Methods with tests but no error scenario coverage
- **🚨 False Positive Tests**: Test methods that exist but never execute (0% coverage) - NEW in v3.1

**Gap Type Filter**:
Use the "Gap Type" dropdown to focus on specific issues:
- **All Test Gaps** (default): Show everything
- **🚨 False Positive Tests**: Tests that pass but don't execute (highest priority - fix immediately!)
- **❌ Missing Unit Tests**: Production code with no test coverage
- **⚠️ Partial Coverage**: Methods needing additional test cases
- **🔸 Missing Negative Tests**: Methods missing error scenario tests

**False Positive Visual Indicators**:
- 🚨 Red warning icon instead of standard test icon
- Red gradient background with left border
- "⚠️ FALSE POSITIVE" badge next to method name
- Separate summary card with warning styling

**Priority System**:
- 🔥 **CRITICAL**: 70-100 points (public, complex, no tests)
- 🔴 **HIGH**: 50-69 points (public or complex, needs tests)
- 🟡 **MEDIUM**: 30-49 points (moderate priority)
- ⚪ **LOW**: 0-29 points (low priority)

---

## 🚀 Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned
- Applications configured in `config/apps.json`

### Step 1: Start All Services

```bash
cd /Users/williambigno/dev/git/qe-mcp-stack

# Start all services
docker compose up -d

# Verify services are running
docker compose ps
```

Expected output:
```
NAME                           STATUS
qe-orchestrator                Up (healthy)
qe-code-dashboard              Up
qe-dotnet-code-analyzer        Up
qe-dotnet-coverage-analyzer    Up
```

### Step 2: Verify Orchestrator

```bash
curl http://localhost:3000/api/mcp/status
```

Should return MCP health status.

### Step 3: Open Dashboard

Navigate to: `http://localhost:3000`

### Step 4: Select Application

1. Click the "Application" dropdown in the filter bar
2. Select an application (e.g., "Payments")
3. Optionally select Complexity and Coverage filters
4. Click **"Apply"** button
5. Navigate to "Test Gaps" tab to see results

---

## 📖 User Guide

### Using the Filter System

#### Application Filter
**Purpose**: Select which application to analyze

**Steps**:
1. Click "Application" dropdown
2. Select application (Payments, Core, Core.Common, etc.)
3. Click "Apply" to load data

#### Complexity Filter
**Purpose**: Filter test gaps by method complexity

**Options**:
- **All** (default): Show all methods
- **Low**: Methods with complexity < 5
- **Medium**: Methods with complexity 5-10
- **High**: Methods with complexity > 10

**Use Case**: Select "High" to focus on the most complex, error-prone methods first.

#### Coverage Threshold Filter
**Purpose**: Filter test gaps by existing coverage level

**Options**:
- **All** (default): Show all methods
- **≥ 80%**: Well-tested methods
- **50-80%**: Partially tested methods
- **< 50%**: Poorly tested or untested methods

**Use Case**: Select "< 50%" to focus on methods with worst coverage.

#### Gap Type Filter (NEW in v3.1)
**Purpose**: Filter test gaps by specific issue category

**Options**:
- **All Test Gaps** (default): Show all issues
- **🚨 False Positive Tests**: Test methods that exist but never run (0% coverage)
- **❌ Missing Unit Tests**: Production methods with no tests
- **⚠️ Partial Coverage**: Methods needing more test cases
- **🔸 Missing Negative Tests**: Methods without error scenario tests

**Use Cases**:
- **False Positives** (⚠️ HIGHEST PRIORITY): These tests give false confidence and should be fixed immediately. They exist in test files, have test attributes, but never execute.
- **Missing Unit Tests**: Focus on production code that has zero test coverage
- **Partial Coverage**: Improve existing test coverage
- **Missing Negative Tests**: Add error scenario tests to methods that only have happy path tests

**Example - Finding False Positives**:
1. Application: "Core"
2. Gap Type: "🚨 False Positive Tests"
3. Click "Apply"

**Result**: Shows only test methods that exist but never run, such as:
- `TestMethod1` in `UnitTest1.cs` - empty placeholder test
- Tests with incorrect attributes
- Tests that are never called by test runners

**Visual Indicators**:
- False positive rows have 🚨 icon
- Red gradient background
- "⚠️ FALSE POSITIVE" badge
- Summary card shows total count

#### Combined Filtering Example

To find your highest priority items:
1. Application: "Payments"
2. Complexity: "High"
3. Coverage: "< 50%"
4. Click "Apply"

**Result**: Shows only high-complexity methods with poor coverage - your absolute highest priority gaps.

### Understanding Priority Scores

Each method is scored 0-100 based on 5 factors:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Test Coverage Status | 40% | No tests = 40pts<br>Has tests but no negative = 20pts<br>Fully covered = 0pts |
| Method Complexity | 25% | High (>10) = 25pts<br>Medium (5-10) = 15pts<br>Low (<5) = 5pts |
| Visibility Level | 20% | Public = 20pts<br>Internal/Protected = 10pts<br>Private = 5pts |
| File Type/Role | 10% | Controller = 10pts<br>Service/Repository = 8pts<br>Utility = 5pts<br>Model = 2pts |
| Call Frequency | 5% | Future enhancement |

**Example Calculation**:
```
Public CreatePayment() method in PaymentService.cs:
• No tests: +40 points
• Complexity 12 (high): +25 points
• Public visibility: +20 points
• Service file type: +8 points
= 93 points → CRITICAL priority 🔥
```

### Multi-Class File Handling

**Files with 1 class**: Methods listed directly (no class headers)

**Files with 2+ classes**: Methods grouped under class headers

Example - `HealthService.cs` with 3 classes:
```
📦 Class: HealthService
  └─ DatabaseAsync() method
📦 Class: HealthResults
  └─ (properties only, no methods)
📦 Class: HealthInfo
  └─ (properties only, no methods)
```

Only classes with methods needing tests will appear.

### Test Generation

**Smart Button Logic**:

1. **File has untested methods** → Shows "🧪 Generate Unit Tests"
   - Generates tests for ALL untested methods in the file

2. **File only needs negative tests** → Shows "❌ Generate Negative Tests"
   - Generates only negative/error scenario tests

3. **File needs integration tests** → Shows "🔗 Generate Integration Tests"
   - Generates integration tests for external dependencies

4. **File fully covered** → Shows "✅ Fully Covered"
   - No action needed

**Generation Process**:
1. Click appropriate button
2. Modal opens showing file analysis
3. Select AI model (Sonnet/Opus/Haiku)
4. Review generation plan
5. Click "Generate Tests"
6. Tests are created using xUnit framework
7. Review generated test code

---

## 🔌 API Integration

### Key Endpoints

#### 1. Get Applications
```
GET /api/dashboard/applications
```

**Response**:
```json
{
  "success": true,
  "applications": [
    {
      "name": "Payments",
      "displayName": "Payments System",
      "framework": "net8.0"
    }
  ]
}
```

#### 2. Get Test Gaps
```
POST /api/analysis/test-gaps
Content-Type: application/json

{
  "app": "Payments"
}
```

**Response**:
```json
{
  "success": true,
  "app": "Payments",
  "gaps": {
    "untestedMethods": [
      {
        "name": "CreatePayment",
        "className": "PaymentService",
        "file": "/mnt/apps/Payments/Services/PaymentService.cs",
        "lineNumber": 45,
        "visibility": "public",
        "complexity": 12,
        "fileType": "Service",
        "coverage": null,
        "hasTests": false,
        "hasNegativeTests": false
      }
    ],
    "partialCoverage": [...],
    "missingNegativeTests": [...]
  },
  "summary": {
    "totalMethods": 293,
    "untestedCount": 142,
    "coveragePercentage": 52.3
  }
}
```

#### 3. Generate Tests
```
POST /api/tests/generate-for-file
Content-Type: application/json

{
  "app": "Payments",
  "file": "/mnt/apps/Payments/Services/PaymentService.cs",
  "className": "PaymentService",
  "includeNegativeTests": true,
  "onlyNegativeTests": false,
  "model": "sonnet"
}
```

---

## 🐛 Troubleshooting

### Dashboard Shows "Failed to load data"

**Symptoms**: Error in browser console, no data loads

**Causes & Fixes**:

1. **Orchestrator not running**
   ```bash
   docker compose ps | grep orchestrator
   # If not running:
   docker compose up -d orchestrator
   ```

2. **MCP services not healthy**
   ```bash
   curl http://localhost:3000/api/mcp/status
   # Check each MCP status
   ```

3. **Application not configured**
   - Check `config/apps.json` has application entry
   - Verify `path` and `localPath` are correct

### Filters Don't Work

**Symptoms**: Selecting filters doesn't change displayed results

**Causes & Fixes**:

1. **Forgot to click Apply**
   - Filters require clicking "Apply" button to take effect

2. **No methods match filter criteria**
   - Try "All" filters to see if data loads
   - Check browser console for JavaScript errors

3. **JavaScript not loaded**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Check Network tab in DevTools for `script.js`

### No Class Headers Showing

**Symptoms**: Methods listed without class grouping

**Expected Behavior**:
- Single-class files: No class headers (intentional)
- Multi-class files: Should show class headers

**Causes & Fixes**:

1. **File only has 1 class**
   - This is normal behavior
   - Try files known to have multiple classes (e.g., `HealthService.cs`)

2. **className not in API response**
   ```bash
   # Test API directly:
   curl -X POST http://localhost:3000/api/analysis/test-gaps \
     -H "Content-Type: application/json" \
     -d '{"app":"Payments"}' | jq '.gaps.untestedMethods[0]'

   # Should include "className" field
   ```

3. **Code analyzer needs rebuild**
   ```bash
   docker compose stop dotnet-code-analyzer
   docker compose build --no-cache dotnet-code-analyzer
   docker compose up -d dotnet-code-analyzer
   ```

### Priority Scores Seem Wrong

**Symptoms**: Methods have unexpected priority levels

**Verify Calculation**:

Check method properties:
- `complexity`: Should be cyclomatic complexity score
- `isPublic`: Should be boolean
- `fileType`: Should be Controller/Service/Repository/Utility/Model
- `hasTests`: Should reflect actual test existence

If properties are correct but priority seems wrong, verify scoring formula in `script.js` function `calculatePriorityScore()`.

### Test Generation Fails

**Symptoms**: Clicking generate button shows error

**Causes & Fixes**:

1. **MCP not responding**
   ```bash
   docker logs qe-dotnet-unit-test-generator --tail 50
   ```

2. **File path incorrect**
   - Verify path matches what's in `/mnt/apps/` inside containers
   - Check `apps.json` configuration

3. **Source file has syntax errors**
   - Code analyzer may fail on invalid C# syntax
   - Check orchestrator logs for parsing errors

---

## 📊 File Structure

```
/qe-mcp-stack/code-dashboard/
├── index.html      # Dashboard HTML structure
├── styles.css      # Styling (gradients, accordions, modals)
├── script.js       # Frontend logic (1800+ lines)
├── server.js       # Simple HTTP server (not used in Docker)
├── modelSelector.js # AI model selection component
└── README.md       # This file
```

**Note**: In Docker deployment, the dashboard is served by the orchestrator container, not `server.js`.

---

## 🎉 Summary

The Code Analysis Dashboard provides:

✅ **Real-time code analysis** of .NET applications
✅ **Test gap identification** with priority scoring
✅ **Multi-class file support** with visual grouping
✅ **Advanced filtering** by complexity and coverage
✅ **Automated test generation** with AI assistance
✅ **Comprehensive metadata** (className, complexity, visibility)
✅ **Smart recommendations** based on weighted scoring

**Dashboard is production-ready and fully integrated with the QE MCP Stack!** 🚀
