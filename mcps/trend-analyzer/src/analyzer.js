/**
 * Trend Analyzer
 * 
 * Statistical analysis of historical metrics
 */

/**
 * Analyze trends in metrics
 */
export async function analyzeTrends(params) {
  const { app, metrics, metricName = 'Metric' } = params;

  validateInput(params);

  // Calculate statistics
  const stats = calculateStatistics(metrics);

  // Detect trend
  const trend = detectTrend(metrics);

  // Detect anomalies
  const anomalies = detectAnomalies(metrics, stats);

  // Calculate moving averages
  const movingAverages = calculateMovingAverages(metrics);

  // Calculate forecast
  const forecast = calculateForecast(metrics, trend);

  // Generate insights
  const insights = generateInsights(stats, trend, anomalies);

  return {
    metricName,
    statistics: stats,
    trend,
    anomalies,
    movingAverages,
    forecast,
    insights,
    metadata: {
      app,
      dataPoints: metrics.length,
      analyzedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Validate input
 */
function validateInput(params) {
  const { app, metrics } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!Array.isArray(metrics)) {
    throw new Error('metrics must be an array');
  }

  if (metrics.length === 0) {
    throw new Error('metrics array cannot be empty');
  }

  // Validate metric structure
  metrics.forEach((m, idx) => {
    if (!m.timestamp) {
      throw new Error(`Metric ${idx} missing timestamp`);
    }
    if (m.value === undefined || m.value === null) {
      throw new Error(`Metric ${idx} missing value`);
    }
  });
}

/**
 * Calculate statistics
 */
function calculateStatistics(metrics) {
  const values = metrics.map(m => m.value);
  
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return {
    count: values.length,
    sum,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    min,
    max,
    range
  };
}

/**
 * Detect trend
 */
function detectTrend(metrics) {
  const values = metrics.map(m => m.value);
  const n = values.length;
  
  // Calculate linear regression
  const indices = Array.from({ length: n }, (_, i) => i);
  const meanX = indices.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (indices[i] - meanX) * (values[i] - meanY);
    denominator += Math.pow(indices[i] - meanX, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  
  // Determine trend direction
  let direction;
  if (Math.abs(slope) < 0.01) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  // Calculate trend strength (R-squared)
  const predictions = indices.map(x => slope * x + intercept);
  const ssRes = values.reduce((sum, val, i) => sum + Math.pow(val - predictions[i], 2), 0);
  const ssTot = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  let strength;
  if (rSquared > 0.7) strength = 'strong';
  else if (rSquared > 0.4) strength = 'moderate';
  else strength = 'weak';
  
  return {
    direction,
    strength,
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    rSquared: Math.round(rSquared * 100) / 100,
    description: getTrendDescription(direction, strength, slope)
  };
}

/**
 * Get trend description
 */
function getTrendDescription(direction, strength, slope) {
  if (direction === 'stable') {
    return 'Metric remains relatively stable with no significant trend';
  }
  
  const slopeAbs = Math.abs(slope);
  const rate = slopeAbs < 1 ? 'slowly' : slopeAbs < 5 ? 'moderately' : 'rapidly';
  
  return `Metric is ${rate} ${direction} with ${strength} trend strength`;
}

/**
 * Detect anomalies
 */
function detectAnomalies(metrics, stats) {
  const anomalies = [];
  const threshold = 2; // Standard deviations
  
  metrics.forEach((metric, idx) => {
    const zScore = Math.abs((metric.value - stats.mean) / stats.stdDev);
    
    if (zScore > threshold) {
      anomalies.push({
        index: idx,
        timestamp: metric.timestamp,
        value: metric.value,
        zScore: Math.round(zScore * 100) / 100,
        deviation: Math.round((metric.value - stats.mean) * 100) / 100,
        severity: zScore > 3 ? 'high' : 'medium'
      });
    }
  });
  
  return anomalies;
}

/**
 * Calculate moving averages
 */
function calculateMovingAverages(metrics) {
  const values = metrics.map(m => m.value);
  const windows = [3, 7, 14];
  const averages = {};
  
  windows.forEach(window => {
    if (values.length >= window) {
      const ma = [];
      for (let i = 0; i <= values.length - window; i++) {
        const windowValues = values.slice(i, i + window);
        const avg = windowValues.reduce((a, b) => a + b, 0) / window;
        ma.push(Math.round(avg * 100) / 100);
      }
      averages[`ma${window}`] = ma;
    }
  });
  
  return averages;
}

/**
 * Calculate forecast
 */
function calculateForecast(metrics, trend) {
  const lastIndex = metrics.length - 1;
  const forecastPeriods = 5;
  const predictions = [];
  
  for (let i = 1; i <= forecastPeriods; i++) {
    const x = lastIndex + i;
    const predicted = trend.slope * x + trend.intercept;
    predictions.push({
      period: i,
      value: Math.round(predicted * 100) / 100
    });
  }
  
  return {
    periods: forecastPeriods,
    method: 'linear-regression',
    predictions,
    confidence: trend.rSquared > 0.5 ? 'medium' : 'low'
  };
}

/**
 * Generate insights
 */
function generateInsights(stats, trend, anomalies) {
  const insights = [];
  
  // Trend insight
  if (trend.direction === 'increasing') {
    insights.push({
      type: 'trend',
      priority: trend.strength === 'strong' ? 'high' : 'medium',
      message: `Metric showing ${trend.strength} upward trend`,
      recommendation: 'Monitor for continued growth or potential issues'
    });
  } else if (trend.direction === 'decreasing') {
    insights.push({
      type: 'trend',
      priority: trend.strength === 'strong' ? 'high' : 'medium',
      message: `Metric showing ${trend.strength} downward trend`,
      recommendation: 'Investigate potential causes of decline'
    });
  }
  
  // Variability insight
  const cv = stats.stdDev / stats.mean; // Coefficient of variation
  if (cv > 0.5) {
    insights.push({
      type: 'variability',
      priority: 'medium',
      message: 'High variability detected in metric',
      recommendation: 'Investigate sources of inconsistency'
    });
  }
  
  // Anomaly insight
  if (anomalies.length > 0) {
    const highSeverity = anomalies.filter(a => a.severity === 'high').length;
    insights.push({
      type: 'anomaly',
      priority: highSeverity > 0 ? 'high' : 'medium',
      message: `Found ${anomalies.length} anomalies (${highSeverity} high severity)`,
      recommendation: 'Review anomalous data points for errors or significant events'
    });
  }
  
  // Recent performance insight
  const recentCount = Math.min(5, stats.count);
  const recentValues = metrics.slice(-recentCount).map(m => m.value);
  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  
  if (recentAvg > stats.mean * 1.2) {
    insights.push({
      type: 'performance',
      priority: 'medium',
      message: 'Recent values 20% above historical average',
      recommendation: 'Performance improvement detected - identify contributing factors'
    });
  } else if (recentAvg < stats.mean * 0.8) {
    insights.push({
      type: 'performance',
      priority: 'high',
      message: 'Recent values 20% below historical average',
      recommendation: 'Performance decline detected - immediate investigation recommended'
    });
  }
  
  return insights;
}

export default {
  analyzeTrends
};
