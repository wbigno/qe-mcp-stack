# Performance Analyzer - STDIO MCP

**Type:** STDIO MCP (Statistical Analysis)  
**Location:** `mcps/performance-analyzer/`  
**Technology:** Node.js (No AI)  
**Status:** ✅ Production Ready

## Overview

Analyzes performance metrics, identifies bottlenecks, and provides recommendations. Calculates response times, throughput, error rates, and performance scores.

## Input

```typescript
{
  data: {
    app: string;
    metrics: {
      responseTimes?: Array<{
        endpoint: string;
        duration: number;
        timestamp: string;
      }>;
      requests?: Array<{
        endpoint: string;
        status: number;
        timestamp: string;
      }>;
    };
  }
}
```

## Output

- **responseTime** - Mean, median, P95, slow requests
- **throughput** - Requests/second, top endpoints
- **errorRate** - Error percentage, breakdown by status
- **percentiles** - P50, P75, P90, P95, P99
- **bottlenecks** - Slow endpoints with severity
- **issues** - Detected problems
- **recommendations** - Prioritized actions
- **performanceScore** - 0-100 score with grade

## Quick Start

```bash
cd mcps/performance-analyzer
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "responseTime": {
    "mean": 450,
    "median": 420,
    "min": 100,
    "max": 2500,
    "p95": 850,
    "slowRequestsCount": 5
  },
  "throughput": {
    "totalRequests": 1000,
    "timespan": 60,
    "requestsPerSecond": 16.67,
    "topEndpoints": [
      {"endpoint": "/api/users", "count": 450}
    ]
  },
  "errorRate": {
    "total": 25,
    "rate": 2.5,
    "breakdown": [
      {"status": 500, "count": 15, "percentage": 60},
      {"status": 404, "count": 10, "percentage": 40}
    ]
  },
  "bottlenecks": [
    {
      "type": "slow-endpoint",
      "endpoint": "/api/reports",
      "avgDuration": 2100,
      "severity": "high"
    }
  ],
  "performanceScore": {
    "score": 75,
    "grade": "C",
    "status": "good"
  }
}
```

## Performance

- **Analysis Time:** <100ms
- **Memory:** ~20-50 MB
- **No AI:** Pure statistics

---

**Need help?** See `tests/test.js`
