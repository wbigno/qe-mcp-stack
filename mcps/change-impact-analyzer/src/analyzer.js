/**
 * Change Impact Analyzer
 * 
 * AI-powered deep analysis of code changes
 */

import { analyzeWithClaude } from './claudeClient.js';

/**
 * Analyze change impact
 * 
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Impact analysis with metadata
 */
export async function analyzeChangeImpact(params) {
  const {
    app,
    changes,
    context
  } = params;

  // Validate input
  validateInput(params);

  // Analyze with Claude
  const analysis = await analyzeWithClaude({
    changes,
    context
  });

  // Enrich with additional insights
  const enriched = enrichAnalysis(analysis, changes);

  // Generate action plan
  const actionPlan = generateActionPlan(enriched);

  return {
    summary: enriched.summary,
    impactAreas: enriched.impactAreas,
    breakingChanges: enriched.breakingChanges,
    securityImplications: enriched.securityImplications,
    performanceImplications: enriched.performanceImplications,
    testingRecommendations: enriched.testingRecommendations,
    deploymentConsiderations: enriched.deploymentConsiderations,
    dataImpact: enriched.dataImpact,
    apiChanges: enriched.apiChanges,
    recommendations: enriched.recommendations,
    riskAssessment: enriched.riskAssessment,
    actionPlan,
    metadata: {
      app,
      analyzedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { app, changes } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!changes || typeof changes !== 'object') {
    throw new Error('changes must be an object');
  }

  // Check if changes has meaningful content
  if (Object.keys(changes).length === 0) {
    throw new Error('changes object cannot be empty');
  }
}

/**
 * Enrich analysis with additional insights
 */
function enrichAnalysis(analysis, changes) {
  // Add change statistics
  const stats = calculateChangeStats(changes);
  
  // Sort recommendations by priority
  if (analysis.recommendations) {
    analysis.recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Add change stats to analysis
  analysis.changeStats = stats;

  return analysis;
}

/**
 * Calculate change statistics
 */
function calculateChangeStats(changes) {
  const stats = {
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
    changeTypes: []
  };

  if (changes.files) {
    stats.filesChanged = changes.files.length;
  }

  if (changes.diff) {
    // Simple line counting from diff
    const lines = changes.diff.split('\n');
    stats.linesAdded = lines.filter(l => l.startsWith('+')).length;
    stats.linesRemoved = lines.filter(l => l.startsWith('-')).length;
  }

  // Identify change types
  if (changes.description) {
    const desc = changes.description.toLowerCase();
    if (desc.includes('refactor')) stats.changeTypes.push('refactoring');
    if (desc.includes('fix') || desc.includes('bug')) stats.changeTypes.push('bugfix');
    if (desc.includes('feature') || desc.includes('new')) stats.changeTypes.push('feature');
    if (desc.includes('security')) stats.changeTypes.push('security');
    if (desc.includes('performance')) stats.changeTypes.push('performance');
  }

  return stats;
}

/**
 * Generate action plan from analysis
 */
function generateActionPlan(analysis) {
  const plan = {
    preDeployment: [],
    deployment: [],
    postDeployment: [],
    timeline: ''
  };

  // Pre-deployment actions
  plan.preDeployment.push({
    action: 'Code Review',
    owner: 'Senior Developer',
    duration: '2-4 hours',
    status: 'pending'
  });

  if (analysis.testingRecommendations.unitTests?.length > 0) {
    plan.preDeployment.push({
      action: 'Run Unit Tests',
      owner: 'QA Team',
      duration: '1 hour',
      tests: analysis.testingRecommendations.unitTests
    });
  }

  if (analysis.testingRecommendations.integrationTests?.length > 0) {
    plan.preDeployment.push({
      action: 'Run Integration Tests',
      owner: 'QA Team',
      duration: '2 hours',
      tests: analysis.testingRecommendations.integrationTests
    });
  }

  if (analysis.dataImpact?.backupRequired) {
    plan.preDeployment.push({
      action: 'Create Database Backup',
      owner: 'DevOps',
      duration: '30 minutes',
      critical: true
    });
  }

  // Deployment actions
  if (analysis.deploymentConsiderations.prerequisites) {
    analysis.deploymentConsiderations.prerequisites.forEach(prereq => {
      plan.deployment.push({
        action: prereq,
        owner: 'DevOps',
        duration: '15 minutes'
      });
    });
  }

  plan.deployment.push({
    action: 'Deploy Application',
    owner: 'DevOps',
    duration: analysis.dataImpact?.estimatedDowntime || '5 minutes'
  });

  // Post-deployment actions
  if (analysis.deploymentConsiderations.monitoring) {
    analysis.deploymentConsiderations.monitoring.forEach(item => {
      plan.postDeployment.push({
        action: `Monitor: ${item}`,
        owner: 'DevOps',
        duration: '1 hour'
      });
    });
  }

  if (analysis.testingRecommendations.e2eTests?.length > 0) {
    plan.postDeployment.push({
      action: 'Run E2E Smoke Tests',
      owner: 'QA Team',
      duration: '30 minutes',
      tests: analysis.testingRecommendations.e2eTests
    });
  }

  // Calculate timeline
  const preTime = plan.preDeployment.reduce((sum, item) => {
    const hours = parseFloat(item.duration) || 1;
    return sum + hours;
  }, 0);

  const deployTime = plan.deployment.reduce((sum, item) => {
    const mins = parseFloat(item.duration) || 15;
    return sum + (mins / 60);
  }, 0);

  const postTime = plan.postDeployment.reduce((sum, item) => {
    const mins = parseFloat(item.duration) || 30;
    return sum + (mins / 60);
  }, 0);

  const totalHours = Math.ceil(preTime + deployTime + postTime);
  plan.timeline = `Estimated ${totalHours} hours total`;

  return plan;
}

export default {
  analyzeChangeImpact
};
