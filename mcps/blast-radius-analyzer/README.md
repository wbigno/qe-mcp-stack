# Blast Radius Analyzer - STDIO MCP

**Type:** STDIO MCP (Static Analysis)  
**Location:** `mcps/blast-radius-analyzer/`  
**Technology:** Node.js (No AI)  
**Status:** ✅ Production Ready

## Overview

Analyzes the blast radius of code changes using static analysis. Identifies impacted files, components, tests, and provides risk assessment.

## Input

```typescript
{
  data: {
    app: string;
    changedFiles: string[];  // Relative paths
    analysisDepth?: "shallow" | "moderate" | "deep";  // default: moderate
  }
}
```

## Output

```typescript
{
  success: boolean;
  result: {
    changedFiles: Array<{
      file: string;
      exists: boolean;
      type: "csharp" | "typescript" | "javascript";
      size: number;
      lines: number;
      classes: string[];
      methods: string[];
      dependencies: string[];
      exports: string[];
    }>;
    impact: {
      directImpact: Array<{
        file: string;
        type: string;
        reason: string;
        severity: "high" | "medium" | "low";
      }>;
      indirectImpact: any[];
      affectedComponents: string[];
      affectedTests: string[];
      criticalPaths: Array<{
        file: string;
        reason: string;
      }>;
    };
    risk: {
      score: number;
      level: "low" | "medium" | "high" | "critical";
      factors: string[];
      description: string;
    };
    recommendations: Array<{
      priority: "high" | "medium" | "low";
      category: "testing" | "review" | "deployment";
      recommendation: string;
      reason: string;
      files?: string[];
      tests?: string[];
      components?: string[];
    }>;
  }
}
```

## Key Features

✅ Static code analysis (no AI, fast)  
✅ Risk scoring (0-100+)  
✅ Critical path detection  
✅ Test file identification  
✅ Component impact analysis  
✅ Actionable recommendations  

## Risk Levels

- **Low (<30):** Isolated changes
- **Medium (30-59):** Multiple components
- **High (60-99):** Critical systems
- **Critical (100+):** Widespread impact

## Quick Start

```bash
cd mcps/blast-radius-analyzer
npm install
cat sample-input.json | node index.js
npm test
```

## Example

```json
{
  "changedFiles": [
    {
      "file": "Services/UserService.cs",
      "type": "csharp",
      "classes": ["UserService"],
      "methods": ["GetUserById", "CreateUser"],
      "dependencies": ["System.Linq", "Microsoft.EntityFrameworkCore"]
    }
  ],
  "impact": {
    "directImpact": [
      {
        "file": "Services/UserService.cs",
        "reason": "File was modified",
        "severity": "high"
      }
    ],
    "affectedComponents": ["UserService"],
    "affectedTests": ["UserServiceTests.cs"],
    "criticalPaths": [
      {
        "file": "Services/UserService.cs",
        "reason": "Business logic service"
      }
    ]
  },
  "risk": {
    "score": 55,
    "level": "medium",
    "factors": [
      "Direct impact: 1 files (+10)",
      "Critical files: 1 (+20)",
      "Affected components: 1 (+5)"
    ],
    "description": "Changes affect multiple components, test thoroughly"
  },
  "recommendations": [
    {
      "priority": "medium",
      "category": "testing",
      "recommendation": "Run associated unit tests",
      "tests": ["UserServiceTests.cs"]
    },
    {
      "priority": "medium",
      "category": "testing",
      "recommendation": "Run smoke tests before deployment"
    }
  ]
}
```

## Critical File Patterns

- Controllers/ - API endpoints
- Services/ - Business logic
- Repositories/ - Data access
- Program.cs - App entry point
- Startup.cs - Configuration
- appsettings.* - Config files

## Analysis Depth

- **shallow:** Basic file analysis only
- **moderate:** Include dependencies (default)
- **deep:** Full dependency tree

## Performance

- **Analysis Time:** <1 second per file
- **Memory:** ~20-50 MB
- **No AI:** Pure static analysis

## Integration

```bash
# Via orchestrator
curl -X POST http://localhost:3000/api/analyze/blast-radius \
  -d '{"app": "App1", "changedFiles": ["UserService.cs"]}'
```

---

**Need help?** See `tests/test.js`
