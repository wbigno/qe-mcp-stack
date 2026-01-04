/**
 * Automation Requirements Planner
 * 
 * Core logic for generating automation requirements and strategies
 */

import { generateWithClaude } from './claudeClient.js';

/**
 * Generate automation requirements from test cases
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Automation requirements with metadata
 */
export async function generateAutomationRequirements(params) {
  const {
    storyId,
    testCases,
    automationLevel = 'all'
  } = params;

  // Validate input
  validateInput(params);

  // Analyze test cases
  const analysis = analyzeTestCases(testCases);

  // Generate requirements with Claude
  const generated = await generateWithClaude({
    storyId,
    testCases,
    automationLevel
  });

  // Enhance with additional analysis
  const enhanced = enhanceRequirements(generated, analysis, automationLevel);

  // Generate implementation guide
  const implementationGuide = generateImplementationGuide(enhanced);

  // Calculate ROI
  const roi = calculateROI(testCases, enhanced);

  return {
    feasibility: enhanced.feasibility,
    automationStrategy: enhanced.automationStrategy,
    technicalRequirements: enhanced.technicalRequirements,
    automationPlan: enhanced.automationPlan,
    pageObjectModel: enhanced.pageObjectModel,
    testDataStrategy: enhanced.testDataStrategy,
    cicdIntegration: enhanced.cicdIntegration,
    risksMitigations: enhanced.risksMitigations,
    maintenanceStrategy: enhanced.maintenanceStrategy,
    successMetrics: enhanced.successMetrics,
    implementationGuide,
    roi,
    testCaseAnalysis: analysis,
    metadata: {
      storyId,
      testCasesCount: testCases.length,
      automationLevel,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { storyId, testCases, automationLevel } = params;

  if (!storyId || typeof storyId !== 'number') {
    throw new Error('storyId must be a number');
  }

  if (!Array.isArray(testCases)) {
    throw new Error('testCases must be an array');
  }

  if (testCases.length === 0) {
    throw new Error('testCases array cannot be empty');
  }

  if (automationLevel && !['unit', 'integration', 'e2e', 'all'].includes(automationLevel)) {
    throw new Error('automationLevel must be one of: unit, integration, e2e, all');
  }
}

/**
 * Analyze test cases to extract patterns
 */
function analyzeTestCases(testCases) {
  const totalTests = testCases.length;

  // Count by category
  const byCategory = testCases.reduce((acc, tc) => {
    const category = tc.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Count by priority
  const byPriority = testCases.reduce((acc, tc) => {
    const priority = tc.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Identify automation suitability
  const highAutomation = testCases.filter(tc => 
    tc.automationFeasibility?.feasibility === 'high' ||
    (tc.category === 'positive' && tc.priority === 'high')
  ).length;

  const mediumAutomation = testCases.filter(tc =>
    tc.automationFeasibility?.feasibility === 'medium' ||
    tc.category === 'negative'
  ).length;

  const lowAutomation = totalTests - highAutomation - mediumAutomation;

  // Extract unique pages/components
  const pages = extractPages(testCases);
  const apiEndpoints = extractApiEndpoints(testCases);

  return {
    totalTests,
    byCategory,
    byPriority,
    automationSuitability: {
      high: highAutomation,
      medium: mediumAutomation,
      low: lowAutomation
    },
    estimatedManualEffort: calculateManualEffort(testCases),
    estimatedAutomationEffort: calculateAutomationEffort(testCases),
    identifiedPages: pages,
    identifiedApiEndpoints: apiEndpoints
  };
}

/**
 * Extract page names from test cases
 */
function extractPages(testCases) {
  const pages = new Set();
  
  testCases.forEach(tc => {
    // Look for page references in steps
    if (tc.steps) {
      tc.steps.forEach(step => {
        const text = step.action + ' ' + step.expectedResult;
        
        // Common page patterns
        if (text.match(/login page/i)) pages.add('LoginPage');
        if (text.match(/home page|dashboard/i)) pages.add('HomePage');
        if (text.match(/profile page/i)) pages.add('ProfilePage');
        if (text.match(/appointment.*page/i)) pages.add('AppointmentPage');
        if (text.match(/user.*page/i)) pages.add('UserPage');
      });
    }
  });

  return Array.from(pages);
}

/**
 * Extract API endpoints from test cases
 */
function extractApiEndpoints(testCases) {
  const endpoints = new Set();
  
  testCases.forEach(tc => {
    if (tc.endpoint) {
      endpoints.add(tc.endpoint);
    }
    
    // Look for API mentions in description
    if (tc.description) {
      const apiMatch = tc.description.match(/\/api\/[a-z-]+/gi);
      if (apiMatch) {
        apiMatch.forEach(endpoint => endpoints.add(endpoint));
      }
    }
  });

  return Array.from(endpoints);
}

/**
 * Calculate manual testing effort
 */
function calculateManualEffort(testCases) {
  const totalMinutes = testCases.reduce((sum, tc) => {
    const duration = tc.estimatedDuration || '5 minutes';
    const minutes = parseInt(duration.match(/\d+/)?.[0] || '5');
    return sum + minutes;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    perIteration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    perYear: `${Math.round(totalMinutes * 26 / 60)}h` // Assuming bi-weekly sprints
  };
}

/**
 * Calculate automation development effort
 */
function calculateAutomationEffort(testCases) {
  // Estimate: 2-4 hours per automated test initially
  const avgHoursPerTest = 3;
  const setupHours = 40; // Framework setup
  
  const developmentHours = testCases.length * avgHoursPerTest;
  const totalHours = setupHours + developmentHours;

  return {
    setup: `${setupHours}h`,
    development: `${developmentHours}h`,
    total: `${totalHours}h`,
    maintenance: '10h/month'
  };
}

/**
 * Enhance requirements with additional analysis
 */
function enhanceRequirements(generated, analysis, automationLevel) {
  // Add identified pages to POM if not already there
  if (analysis.identifiedPages.length > 0 && generated.pageObjectModel) {
    const existingPages = generated.pageObjectModel.pages.map(p => p.pageName);
    analysis.identifiedPages.forEach(pageName => {
      if (!existingPages.includes(pageName)) {
        generated.pageObjectModel.pages.push({
          pageName,
          elements: [],
          methods: [],
          discovered: true
        });
      }
    });
  }

  return generated;
}

/**
 * Generate implementation guide
 */
function generateImplementationGuide(requirements) {
  return {
    gettingStarted: [
      '1. Review the automation strategy and feasibility assessment',
      '2. Set up the required frameworks and infrastructure',
      '3. Create the Page Object Model classes',
      '4. Implement test data factories and fixtures',
      '5. Write automated tests following the prioritization plan',
      '6. Integrate with CI/CD pipeline',
      '7. Establish maintenance and monitoring processes'
    ],
    frameworkSetup: {
      playwright: 'npm install @playwright/test',
      xunit: 'dotnet add package xunit',
      moq: 'dotnet add package Moq'
    },
    quickStart: `// Quick Start Example
// 1. Install dependencies
// 2. Create Page Object
// 3. Write first test
// 4. Run: npx playwright test`,
    bestPractices: [
      'Use Page Object Model for maintainability',
      'Implement test data builders for flexibility',
      'Use explicit waits instead of hard-coded delays',
      'Clean up test data after each test',
      'Run tests in parallel where possible',
      'Monitor test execution times and flakiness'
    ]
  };
}

/**
 * Calculate ROI for automation
 */
function calculateROI(testCases, requirements) {
  const manualEffortPerYear = parseFloat(requirements.testCaseAnalysis?.estimatedManualEffort?.perYear || '0');
  const automationSetup = parseFloat(requirements.automationPlan?.estimatedEffort?.setup || '40');
  const automationDev = parseFloat(requirements.automationPlan?.estimatedEffort?.testDevelopment || '80');
  const maintenancePerMonth = 10;

  const totalAutomationCost = automationSetup + automationDev;
  const annualMaintenanceCost = maintenancePerMonth * 12;
  
  const annualSavings = manualEffortPerYear - annualMaintenanceCost;
  const breakEvenMonths = annualSavings > 0 ? Math.ceil(totalAutomationCost / (annualSavings / 12)) : 999;
  
  const threeYearSavings = (annualSavings * 3) - totalAutomationCost;

  return {
    initialInvestment: `${totalAutomationCost}h`,
    annualManualCost: `${manualEffortPerYear}h`,
    annualMaintenanceCost: `${annualMaintenanceCost}h`,
    annualSavings: `${Math.max(0, annualSavings)}h`,
    breakEvenPeriod: breakEvenMonths < 999 ? `${breakEvenMonths} months` : 'Not cost effective',
    threeYearROI: threeYearSavings > 0 ? `${Math.round(threeYearSavings)}h saved` : 'Negative ROI',
    recommendation: annualSavings > 0 ? 'Automation recommended' : 'Review automation value'
  };
}

export default {
  generateAutomationRequirements
};
