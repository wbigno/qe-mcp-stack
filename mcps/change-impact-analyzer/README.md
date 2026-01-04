# Change Impact Analyzer - STDIO MCP

**Type:** STDIO MCP (AI-Powered)  
**Location:** `mcps/change-impact-analyzer/`  
**Technology:** Node.js + Claude API  
**Status:** ✅ Production Ready

## Overview

AI-powered deep analysis of code changes providing comprehensive impact assessment, security implications, testing recommendations, and deployment strategy.

## Input

```typescript
{
  data: {
    app: string;
    changes: {
      description?: string;
      files?: string[];
      diff?: string;
      breaking?: boolean;
      schemaChange?: boolean;
    };
    context?: string;
  }
}
```

## Output

Comprehensive impact analysis including:
- Impact areas with severity
- Breaking changes
- Security implications
- Performance concerns
- Testing recommendations (unit/integration/e2e/manual)
- Deployment plan with prerequisites
- Data impact and migrations
- API changes and versioning
- Risk assessment (0-100 score)
- Prioritized recommendations
- Action plan with timeline

## Key Features

✅ AI-powered deep analysis  
✅ Security implication assessment  
✅ Performance impact analysis  
✅ Breaking change detection  
✅ Test recommendations at all levels  
✅ Deployment strategy  
✅ Risk scoring (0-100)  
✅ Action plan generation  

## Quick Start

```bash
cd mcps/change-impact-analyzer
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "summary": "Authentication system changes with breaking API contract modifications. Requires database migration and client updates.",
  "impactAreas": [
    {
      "area": "Authentication",
      "severity": "high",
      "description": "Password validation logic changed",
      "affectedComponents": ["AuthService", "UserController"],
      "potentialIssues": ["Existing passwords may fail new validation"]
    }
  ],
  "breakingChanges": [
    {
      "change": "Removed User.middleName field",
      "impact": "API contract changed, database migration required",
      "severity": "critical",
      "mitigation": "Version API, create migration script"
    }
  ],
  "securityImplications": [
    {
      "concern": "Password validation weakened",
      "severity": "high",
      "recommendation": "Review password requirements"
    }
  ],
  "testingRecommendations": {
    "unitTests": [
      "Test new password validation regex",
      "Test User serialization without middleName"
    ],
    "integrationTests": [
      "Test login API with various passwords",
      "Test user CRUD with new model"
    ],
    "e2eTests": [
      "Test complete registration/login flow"
    ],
    "manualTests": [
      "Verify existing users can log in"
    ]
  },
  "deploymentConsiderations": {
    "prerequisites": [
      "Create database backup",
      "Run migration script",
      "Update API documentation"
    ],
    "rollbackPlan": "Revert migration, restore User model",
    "monitoring": [
      "Watch authentication failures",
      "Monitor API errors"
    ]
  },
  "riskAssessment": {
    "overallRisk": "high",
    "riskScore": 75,
    "factors": [
      "Breaking API changes",
      "Database schema modification",
      "Authentication system changes"
    ],
    "mitigations": [
      "Staged rollout",
      "Feature flagging",
      "Comprehensive testing"
    ]
  },
  "recommendations": [
    {
      "priority": "critical",
      "category": "deployment",
      "action": "Create database backup",
      "reason": "Data changes are irreversible"
    }
  ],
  "actionPlan": {
    "preDeployment": [
      {
        "action": "Code Review",
        "owner": "Senior Developer",
        "duration": "2-4 hours"
      },
      {
        "action": "Run Unit Tests",
        "owner": "QA Team",
        "duration": "1 hour"
      }
    ],
    "deployment": [
      {
        "action": "Create Database Backup",
        "owner": "DevOps",
        "duration": "30 minutes"
      },
      {
        "action": "Deploy Application",
        "owner": "DevOps",
        "duration": "5 minutes"
      }
    ],
    "postDeployment": [
      {
        "action": "Monitor: authentication failures",
        "owner": "DevOps",
        "duration": "1 hour"
      },
      {
        "action": "Run E2E Smoke Tests",
        "owner": "QA Team",
        "duration": "30 minutes"
      }
    ],
    "timeline": "Estimated 5 hours total"
  }
}
```

## Risk Levels

- **Low (0-29):** Minor changes, low impact
- **Medium (30-59):** Moderate changes, standard testing
- **High (60-79):** Significant changes, extensive testing
- **Critical (80-100):** Major changes, careful review required

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Integration

Complements blast-radius-analyzer:
1. **blast-radius-analyzer** → Fast static analysis
2. **change-impact-analyzer** → Deep AI analysis (this MCP)

## Performance

- **Analysis Time:** 10-20 seconds
- **Tokens:** ~4,000-7,000
- **Memory:** ~50-100 MB

---

**Need help?** See `tests/test.js`
