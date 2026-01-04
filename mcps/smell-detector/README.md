# Smell Detector - STDIO MCP

**Type:** STDIO MCP (Static Analysis)  
**Location:** `mcps/smell-detector/`  
**Technology:** Node.js (No AI)  
**Status:** ✅ Production Ready

## Overview

Detects code smells using static analysis. Identifies quality issues and provides recommendations.

## Input

```typescript
{
  data: {
    app: string;
    sourceCode: string;
    fileName?: string;
    severity?: "all" | "critical" | "high" | "medium" | "low";
  }
}
```

## Detected Smells

1. **Long Method** - Methods > 30 lines
2. **Long Parameter List** - Methods with > 5 parameters
3. **Duplicate Code** - Repeated code blocks
4. **Large Class** - Classes > 300 lines
5. **Dead Code** - Commented-out code
6. **Magic Numbers** - Hardcoded numeric literals
7. **Deep Nesting** - Nesting > 3 levels
8. **Complex Conditions** - Conditions with > 3 operators
9. **God Class** - Classes with > 20 methods
10. **Feature Envy** - Methods calling other objects excessively

## Output

- Detected smells with severity
- Quality score (0-100) and grade (A-F)
- Recommendations by priority
- Summary by severity

## Quick Start

```bash
cd mcps/smell-detector
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "fileName": "UserService.cs",
  "smells": [
    {
      "type": "long-parameter-list",
      "severity": "medium",
      "location": "ProcessUserRegistration",
      "description": "Method has 8 parameters (threshold: 5)",
      "suggestion": "Introduce parameter object"
    },
    {
      "type": "deep-nesting",
      "severity": "high",
      "location": "Around line 15",
      "description": "Nesting depth reaches 5 levels",
      "suggestion": "Extract nested logic into separate methods"
    }
  ],
  "summary": {
    "total": 5,
    "critical": 0,
    "high": 2,
    "medium": 2,
    "low": 1
  },
  "qualityScore": {
    "score": 86,
    "grade": "B"
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "refactoring",
      "action": "Extract methods to improve readability"
    }
  ]
}
```

## Performance

- **Analysis Time:** <1 second
- **Memory:** ~20-50 MB
- **No AI:** Pure static analysis

---

**Need help?** See `tests/test.js`
