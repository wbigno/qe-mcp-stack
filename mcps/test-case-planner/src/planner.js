/**
 * Test Case Planner
 * 
 * Core logic for generating comprehensive test cases from requirements
 */

import { generateWithClaude } from './claudeClient.js';

/**
 * Generate test cases from requirements
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated test cases with summary
 */
export async function generateTestCases(params) {
  const { 
    storyId, 
    requirements, 
    acceptanceCriteria,
    includeNegative = true,
    includeEdgeCases = true 
  } = params;

  // Validate input
  validateInput(params);

  // Generate test cases with Claude
  const generated = await generateWithClaude({
    storyId,
    requirements,
    acceptanceCriteria,
    includeNegative,
    includeEdgeCases
  });

  // Enhance test cases with additional data
  const enhancedTestCases = enhanceTestCases(generated.testCases, storyId);

  // Generate summary
  const summary = generateSummary(enhancedTestCases);

  return {
    testCases: enhancedTestCases,
    summary,
    metadata: {
      storyId,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      includeNegative,
      includeEdgeCases
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { storyId, requirements, acceptanceCriteria } = params;

  if (!storyId || typeof storyId !== 'number') {
    throw new Error('storyId must be a number');
  }

  if (!requirements && !acceptanceCriteria) {
    throw new Error('At least one of requirements or acceptanceCriteria is required');
  }

  if (requirements && typeof requirements !== 'string') {
    throw new Error('requirements must be a string');
  }

  if (acceptanceCriteria && typeof acceptanceCriteria !== 'string') {
    throw new Error('acceptanceCriteria must be a string');
  }
}

/**
 * Enhance test cases with additional data
 */
function enhanceTestCases(testCases, storyId) {
  return testCases.map((tc, index) => {
    // Add story reference
    tc.storyId = storyId;

    // Ensure ID is formatted properly
    if (!tc.id.startsWith('TC')) {
      tc.id = `TC${String(index + 1).padStart(3, '0')}`;
    }

    // Add automation feasibility
    tc.automationFeasibility = assessAutomationFeasibility(tc);

    // Add risk level based on priority and category
    tc.riskLevel = calculateRiskLevel(tc);

    // Standardize category
    tc.category = standardizeCategory(tc.category);

    // Add traceability
    tc.traceability = {
      storyId,
      requirementsCoverage: identifyRequirementsCoverage(tc)
    };

    return tc;
  });
}

/**
 * Assess if test case is suitable for automation
 */
function assessAutomationFeasibility(testCase) {
  let score = 100;
  let reasons = [];

  // Check for manual verification steps
  const manualKeywords = ['verify visually', 'check appearance', 'ensure readable', 'look at'];
  const hasManualSteps = testCase.steps.some(step => 
    manualKeywords.some(keyword => 
      step.action.toLowerCase().includes(keyword) || 
      step.expectedResult.toLowerCase().includes(keyword)
    )
  );

  if (hasManualSteps) {
    score -= 30;
    reasons.push('Contains manual verification steps');
  }

  // Check complexity (number of steps)
  if (testCase.steps.length > 10) {
    score -= 20;
    reasons.push('High complexity (many steps)');
  }

  // Check for file uploads/downloads
  const fileKeywords = ['upload file', 'download file', 'attach document'];
  const hasFileOperations = testCase.steps.some(step =>
    fileKeywords.some(keyword => step.action.toLowerCase().includes(keyword))
  );

  if (hasFileOperations) {
    score -= 10;
    reasons.push('Requires file operations');
  }

  // Determine feasibility level
  let feasibility;
  if (score >= 80) {
    feasibility = 'high';
  } else if (score >= 50) {
    feasibility = 'medium';
  } else {
    feasibility = 'low';
  }

  return {
    feasibility,
    score,
    reasons: reasons.length > 0 ? reasons : ['Fully automatable']
  };
}

/**
 * Calculate risk level based on priority and category
 */
function calculateRiskLevel(testCase) {
  if (testCase.priority === 'high' && testCase.category === 'positive') {
    return 'critical';
  }

  if (testCase.priority === 'high') {
    return 'high';
  }

  if (testCase.priority === 'medium') {
    return 'medium';
  }

  return 'low';
}

/**
 * Standardize category names
 */
function standardizeCategory(category) {
  const normalized = category.toLowerCase().replace(/[_\s-]/g, '');
  
  if (normalized.includes('positive') || normalized.includes('happy')) {
    return 'positive';
  }
  
  if (normalized.includes('negative') || normalized.includes('error')) {
    return 'negative';
  }
  
  if (normalized.includes('edge') || normalized.includes('boundary')) {
    return 'edge-case';
  }

  return category;
}

/**
 * Identify which requirements this test case covers
 */
function identifyRequirementsCoverage(testCase) {
  // Extract key concepts from test case
  const concepts = extractKeyConcepts(testCase);
  
  return {
    concepts,
    fullCoverage: testCase.steps.length >= 3 // Simple heuristic
  };
}

/**
 * Extract key concepts from test case
 */
function extractKeyConcepts(testCase) {
  const text = `${testCase.title} ${testCase.description} ${testCase.steps.map(s => s.action).join(' ')}`;
  
  // Simple keyword extraction
  const keywords = [
    'login', 'logout', 'authentication', 'authorization',
    'create', 'read', 'update', 'delete', 'search', 'filter',
    'validation', 'error', 'success', 'notification',
    'payment', 'billing', 'appointment', 'schedule'
  ];

  return keywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  );
}

/**
 * Generate summary of test cases
 */
function generateSummary(testCases) {
  const totalTestCases = testCases.length;
  
  // Count by category
  const positiveTests = testCases.filter(tc => tc.category === 'positive').length;
  const negativeTests = testCases.filter(tc => tc.category === 'negative').length;
  const edgeCases = testCases.filter(tc => tc.category === 'edge-case').length;

  // Count by priority
  const highPriority = testCases.filter(tc => tc.priority === 'high').length;
  const mediumPriority = testCases.filter(tc => tc.priority === 'medium').length;
  const lowPriority = testCases.filter(tc => tc.priority === 'low').length;

  // Count by automation feasibility
  const highAutomation = testCases.filter(tc => tc.automationFeasibility.feasibility === 'high').length;
  const mediumAutomation = testCases.filter(tc => tc.automationFeasibility.feasibility === 'medium').length;
  const lowAutomation = testCases.filter(tc => tc.automationFeasibility.feasibility === 'low').length;

  // Calculate total estimated time
  const totalMinutes = testCases.reduce((sum, tc) => {
    const duration = tc.estimatedDuration || '5 minutes';
    const minutes = parseInt(duration.match(/\d+/)?.[0] || '5');
    return sum + minutes;
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return {
    totalTestCases,
    byCategory: {
      positive: positiveTests,
      negative: negativeTests,
      edgeCases
    },
    byPriority: {
      high: highPriority,
      medium: mediumPriority,
      low: lowPriority
    },
    automationFeasibility: {
      high: highAutomation,
      medium: mediumAutomation,
      low: lowAutomation
    },
    estimatedExecutionTime: totalHours > 0 
      ? `${totalHours}h ${remainingMinutes}m` 
      : `${totalMinutes}m`,
    coverage: {
      functionalScenarios: positiveTests,
      errorHandling: negativeTests,
      boundaryConditions: edgeCases
    }
  };
}

export default {
  generateTestCases
};
