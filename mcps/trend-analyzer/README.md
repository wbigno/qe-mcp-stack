# Trend Analyzer - STDIO MCP

**Type:** STDIO MCP (Statistical Analysis)  
**Location:** `mcps/trend-analyzer/`  
**Technology:** Node.js (No AI)  
**Status:** ✅ Production Ready

## Overview

Statistical analysis of historical metrics. Detects trends, anomalies, calculates forecasts, and generates insights.

## Input

```typescript
{
  data: {
    app: string;
    metricName?: string;
    metrics: Array<{
      timestamp: string;
      value: number;
    }>;
  }
}
```

## Output

- **statistics** - Mean, median, std dev, min, max
- **trend** - Direction, strength, slope, R²
- **anomalies** - Outliers with z-scores
- **movingAverages** - MA3, MA7, MA14
- **forecast** - 5-period linear forecast
- **insights** - Actionable recommendations

## Key Features

✅ NO AI - Pure statistical analysis  
✅ Linear regression trend detection  
✅ Anomaly detection (z-score)  
✅ Moving averages  
✅ Forecasting  
✅ Automated insights  
✅ Ultra-fast  

## Quick Start

```bash
cd mcps/trend-analyzer
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "metricName": "Test Coverage",
  "statistics": {
    "count": 20,
    "mean": 75.5,
    "median": 76.0,
    "stdDev": 8.3,
    "min": 60,
    "max": 92,
    "range": 32
  },
  "trend": {
    "direction": "increasing",
    "strength": "strong",
    "slope": 1.2,
    "rSquared": 0.85,
    "description": "Metric is moderately increasing with strong trend strength"
  },
  "anomalies": [
    {
      "index": 15,
      "timestamp": "2024-12-15",
      "value": 45,
      "zScore": 2.8,
      "severity": "high"
    }
  ],
  "movingAverages": {
    "ma3": [74, 75, 77, ...],
    "ma7": [73, 74, 76, ...]
  },
  "forecast": {
    "periods": 5,
    "method": "linear-regression",
    "predictions": [
      {"period": 1, "value": 93.5},
      {"period": 2, "value": 94.7}
    ],
    "confidence": "medium"
  },
  "insights": [
    {
      "type": "trend",
      "priority": "high",
      "message": "Metric showing strong upward trend",
      "recommendation": "Monitor for continued growth"
    }
  ]
}
```

## Use Cases

- Test coverage trends
- Performance metrics
- Error rates
- Build times
- Code quality scores

## Performance

- **Analysis Time:** <100ms
- **Memory:** ~10-20 MB
- **No AI:** Pure math

---

**Need help?** See `tests/test.js`
