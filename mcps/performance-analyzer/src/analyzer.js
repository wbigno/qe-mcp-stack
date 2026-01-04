/**
 * Performance Analyzer
 * 
 * Statistical analysis of performance metrics
 */

/**
 * Analyze performance metrics
 */
export async function analyzePerformance(params) {
  const { app, metrics } = params;

  validateInput(params);

  // Analyze response times
  const responseTime = analyzeResponseTime(metrics);

  // Analyze throughput
  const throughput = analyzeThroughput(metrics);

  // Analyze error rates
  const errorRate = analyzeErrorRate(metrics);

  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(metrics, responseTime);

  // Calculate percentiles
  const percentiles = calculatePercentiles(metrics);

  // Detect performance issues
  const issues = detectIssues(responseTime, throughput, errorRate, percentiles);

  // Generate recommendations
  const recommendations = generateRecommendations(issues, bottlenecks);

  // Calculate overall score
  const performanceScore = calculatePerformanceScore(responseTime, throughput, errorRate);

  return {
    responseTime,
    throughput,
    errorRate,
    percentiles,
    bottlenecks,
    issues,
    recommendations,
    performanceScore,
    metadata: {
      app,
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

  if (!metrics || typeof metrics !== 'object') {
    throw new Error('metrics must be an object');
  }
}

/**
 * Analyze response time
 */
function analyzeResponseTime(metrics) {
  if (!metrics.responseTimes || !Array.isArray(metrics.responseTimes)) {
    return null;
  }

  const times = metrics.responseTimes.map(r => r.duration);
  
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(times.length / 2)];
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  // Identify slow requests (> 95th percentile)
  const p95 = sorted[Math.floor(times.length * 0.95)];
  const slowRequests = metrics.responseTimes.filter(r => r.duration > p95);

  return {
    mean: Math.round(mean),
    median: Math.round(median),
    min,
    max,
    p95: Math.round(p95),
    slowRequestsCount: slowRequests.length,
    slowRequests: slowRequests.slice(0, 10).map(r => ({
      endpoint: r.endpoint,
      duration: r.duration,
      timestamp: r.timestamp
    }))
  };
}

/**
 * Analyze throughput
 */
function analyzeThroughput(metrics) {
  if (!metrics.requests || !Array.isArray(metrics.requests)) {
    return null;
  }

  const total = metrics.requests.length;
  const timespan = calculateTimespan(metrics.requests);
  const requestsPerSecond = timespan > 0 ? total / timespan : 0;

  // Group by endpoint
  const byEndpoint = {};
  metrics.requests.forEach(req => {
    const endpoint = req.endpoint || 'unknown';
    byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
  });

  const topEndpoints = Object.entries(byEndpoint)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalRequests: total,
    timespan: Math.round(timespan),
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    topEndpoints
  };
}

/**
 * Analyze error rate
 */
function analyzeErrorRate(metrics) {
  if (!metrics.requests || !Array.isArray(metrics.requests)) {
    return null;
  }

  const total = metrics.requests.length;
  const errors = metrics.requests.filter(r => r.status >= 400);
  const errorRate = total > 0 ? (errors.length / total) * 100 : 0;

  // Group errors by status code
  const byStatus = {};
  errors.forEach(err => {
    const status = err.status || 500;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  const errorBreakdown = Object.entries(byStatus)
    .map(([status, count]) => ({ 
      status: parseInt(status), 
      count,
      percentage: Math.round((count / errors.length) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: errors.length,
    rate: Math.round(errorRate * 100) / 100,
    breakdown: errorBreakdown,
    recentErrors: errors.slice(-5).map(e => ({
      endpoint: e.endpoint,
      status: e.status,
      timestamp: e.timestamp
    }))
  };
}

/**
 * Calculate timespan
 */
function calculateTimespan(requests) {
  if (requests.length === 0) return 0;
  
  const timestamps = requests
    .map(r => new Date(r.timestamp).getTime())
    .filter(t => !isNaN(t));
  
  if (timestamps.length === 0) return 0;
  
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  
  return (max - min) / 1000; // seconds
}

/**
 * Identify bottlenecks
 */
function identifyBottlenecks(metrics, responseTime) {
  const bottlenecks = [];

  if (!metrics.responseTimes) return bottlenecks;

  // Group by endpoint
  const byEndpoint = {};
  metrics.responseTimes.forEach(r => {
    const endpoint = r.endpoint || 'unknown';
    if (!byEndpoint[endpoint]) {
      byEndpoint[endpoint] = [];
    }
    byEndpoint[endpoint].push(r.duration);
  });

  // Find slow endpoints
  Object.entries(byEndpoint).forEach(([endpoint, durations]) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    if (avg > 1000) { // > 1 second average
      bottlenecks.push({
        type: 'slow-endpoint',
        endpoint,
        avgDuration: Math.round(avg),
        requestCount: durations.length,
        severity: avg > 3000 ? 'critical' : avg > 2000 ? 'high' : 'medium'
      });
    }
  });

  return bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Calculate percentiles
 */
function calculatePercentiles(metrics) {
  if (!metrics.responseTimes || metrics.responseTimes.length === 0) {
    return null;
  }

  const times = metrics.responseTimes.map(r => r.duration).sort((a, b) => a - b);
  
  const getPercentile = (p) => {
    const index = Math.floor(times.length * p);
    return times[index];
  };

  return {
    p50: getPercentile(0.50),
    p75: getPercentile(0.75),
    p90: getPercentile(0.90),
    p95: getPercentile(0.95),
    p99: getPercentile(0.99)
  };
}

/**
 * Detect performance issues
 */
function detectIssues(responseTime, throughput, errorRate, percentiles) {
  const issues = [];

  // Response time issues
  if (responseTime && responseTime.mean > 500) {
    issues.push({
      type: 'high-response-time',
      severity: responseTime.mean > 1000 ? 'critical' : 'high',
      metric: `${responseTime.mean}ms average`,
      threshold: '500ms',
      impact: 'Poor user experience, potential timeouts'
    });
  }

  if (responseTime && responseTime.p95 > 2000) {
    issues.push({
      type: 'high-p95',
      severity: 'high',
      metric: `${responseTime.p95}ms at P95`,
      threshold: '2000ms',
      impact: '5% of users experiencing slow responses'
    });
  }

  // Throughput issues
  if (throughput && throughput.requestsPerSecond < 10) {
    issues.push({
      type: 'low-throughput',
      severity: 'medium',
      metric: `${throughput.requestsPerSecond} req/s`,
      threshold: '10 req/s',
      impact: 'Limited capacity to handle traffic'
    });
  }

  // Error rate issues
  if (errorRate && errorRate.rate > 5) {
    issues.push({
      type: 'high-error-rate',
      severity: errorRate.rate > 10 ? 'critical' : 'high',
      metric: `${errorRate.rate}% errors`,
      threshold: '5%',
      impact: 'High failure rate affecting reliability'
    });
  }

  if (errorRate && errorRate.rate > 1) {
    issues.push({
      type: 'elevated-error-rate',
      severity: 'medium',
      metric: `${errorRate.rate}% errors`,
      threshold: '1%',
      impact: 'Elevated error rate may indicate instability'
    });
  }

  return issues;
}

/**
 * Generate recommendations
 */
function generateRecommendations(issues, bottlenecks) {
  const recommendations = [];

  // Response time recommendations
  if (issues.some(i => i.type === 'high-response-time')) {
    recommendations.push({
      priority: 'high',
      category: 'optimization',
      action: 'Optimize slow database queries and add caching',
      reason: 'High average response time degrades user experience'
    });
  }

  // Bottleneck recommendations
  if (bottlenecks.length > 0) {
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'bottleneck',
        action: `Investigate endpoints: ${criticalBottlenecks.map(b => b.endpoint).join(', ')}`,
        reason: 'Critical bottlenecks causing severe performance degradation'
      });
    }
  }

  // Error rate recommendations
  if (issues.some(i => i.type === 'high-error-rate')) {
    recommendations.push({
      priority: 'critical',
      category: 'reliability',
      action: 'Investigate error logs and implement better error handling',
      reason: 'High error rate indicates system instability'
    });
  }

  // Throughput recommendations
  if (issues.some(i => i.type === 'low-throughput')) {
    recommendations.push({
      priority: 'medium',
      category: 'scalability',
      action: 'Consider horizontal scaling or load balancing',
      reason: 'Low throughput limits ability to handle traffic spikes'
    });
  }

  // General recommendations
  recommendations.push({
    priority: 'low',
    category: 'monitoring',
    action: 'Set up performance monitoring and alerting',
    reason: 'Proactive monitoring prevents issues from escalating'
  });

  return recommendations;
}

/**
 * Calculate performance score
 */
function calculatePerformanceScore(responseTime, throughput, errorRate) {
  let score = 100;

  // Response time scoring (max -40 points)
  if (responseTime) {
    if (responseTime.mean > 2000) score -= 40;
    else if (responseTime.mean > 1000) score -= 30;
    else if (responseTime.mean > 500) score -= 20;
    else if (responseTime.mean > 250) score -= 10;
  }

  // Error rate scoring (max -30 points)
  if (errorRate) {
    if (errorRate.rate > 10) score -= 30;
    else if (errorRate.rate > 5) score -= 20;
    else if (errorRate.rate > 1) score -= 10;
  }

  // Throughput scoring (max -10 points)
  if (throughput) {
    if (throughput.requestsPerSecond < 5) score -= 10;
    else if (throughput.requestsPerSecond < 10) score -= 5;
  }

  score = Math.max(0, score);

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  let status;
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else status = 'poor';

  return { score, grade, status };
}

export default {
  analyzePerformance
};
