# State Machine Analyzer - STDIO MCP

**Type:** STDIO MCP (Static Analysis)  
**Location:** `mcps/state-machine-analyzer/`  
**Technology:** Node.js (No AI)  
**Status:** ✅ Production Ready

## Overview

Static analysis of state machines and workflows in code. Extracts states, transitions, detects issues, and generates recommendations.

## Input

```typescript
{
  data: {
    app: string;
    sourceCode: string;
    entityName?: string;
  }
}
```

## Output

- **states** - Extracted states with terminal flags
- **transitions** - State transitions with conditions
- **graph** - State graph with nodes and edges
- **paths** - Complete, incomplete, and circular paths
- **issues** - Detected problems (unreachable states, dead-ends, etc.)
- **recommendations** - Actionable fixes

## Key Features

✅ NO AI - Pure static analysis  
✅ Extracts states from enums, consts, switches  
✅ Identifies transitions  
✅ Builds state graph  
✅ Detects unreachable states  
✅ Finds dead-end states  
✅ Identifies circular paths  
✅ Checks for terminal states  

## Detected Issues

- **Unreachable States** - States with no incoming transitions
- **Dead-End States** - Non-terminal states with no outgoing transitions
- **Circular Paths** - Loops in state transitions
- **No Terminal States** - Missing final states

## Quick Start

```bash
cd mcps/state-machine-analyzer
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "entity": "Appointment",
  "states": [
    {"name": "Scheduled", "type": "enum", "terminal": false},
    {"name": "Confirmed", "type": "enum", "terminal": false},
    {"name": "InProgress", "type": "enum", "terminal": false},
    {"name": "Completed", "type": "enum", "terminal": true},
    {"name": "Cancelled", "type": "enum", "terminal": true}
  ],
  "transitions": [
    {"from": "Scheduled", "to": "Confirmed", "type": "switch"},
    {"from": "Scheduled", "to": "Cancelled", "type": "switch"},
    {"from": "Confirmed", "to": "InProgress", "type": "switch"},
    {"from": "Confirmed", "to": "Cancelled", "type": "switch"},
    {"from": "InProgress", "to": "Completed", "type": "switch"}
  ],
  "graph": {
    "nodes": [...],
    "edges": [...]
  },
  "paths": {
    "complete": [
      ["Scheduled", "Confirmed", "InProgress", "Completed"],
      ["Scheduled", "Cancelled"]
    ],
    "incomplete": [],
    "circular": []
  },
  "issues": [],
  "recommendations": []
}
```

## Performance

- **Analysis Time:** <1 second
- **Memory:** ~20-50 MB
- **No AI:** Pure static analysis

## Integration

```bash
curl -X POST http://localhost:3000/api/analyze/state-machine \
  -d '{"app": "App1", "sourceCode": "..."}'
```

---

**Need help?** See `tests/test.js`
