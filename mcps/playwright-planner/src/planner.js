/**
 * Playwright Architecture Planner
 * 
 * Core logic for planning Playwright test architecture
 */

import { generateWithClaude } from './claudeClient.js';

/**
 * Plan Playwright architecture from user flows
 * 
 * @param {Object} params - Planning parameters
 * @returns {Promise<Object>} Playwright architecture plan
 */
export async function planPlaywrightArchitecture(params) {
  const {
    app,
    userFlows,
    includeFixtures = true,
    includeHelpers = true
  } = params;

  // Validate input
  validateInput(params);

  // Analyze user flows
  const analysis = analyzeUserFlows(userFlows);

  // Generate plan with Claude
  const generated = await generateWithClaude({
    app,
    userFlows,
    includeFixtures,
    includeHelpers
  });

  // Enhance plan with additional guidance
  const enhanced = enhancePlan(generated, analysis);

  // Generate setup guide
  const setupGuide = generateSetupGuide(enhanced);

  // Calculate implementation estimate
  const estimate = calculateImplementationEstimate(enhanced, analysis);

  return {
    projectStructure: enhanced.projectStructure,
    pageObjectModel: enhanced.pageObjectModel,
    testFiles: enhanced.testFiles,
    fixtures: enhanced.fixtures,
    helpers: enhanced.helpers,
    configuration: enhanced.configuration,
    bestPractices: enhanced.bestPractices,
    cicdIntegration: enhanced.cicdIntegration,
    setupGuide,
    implementationEstimate: estimate,
    flowAnalysis: analysis,
    metadata: {
      app,
      flowsCount: userFlows.length,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      includeFixtures,
      includeHelpers
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { app, userFlows } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!Array.isArray(userFlows)) {
    throw new Error('userFlows must be an array');
  }

  if (userFlows.length === 0) {
    throw new Error('userFlows array cannot be empty');
  }

  // Validate each flow
  userFlows.forEach((flow, index) => {
    if (!flow.name) {
      throw new Error(`Flow ${index} missing name`);
    }
  });
}

/**
 * Analyze user flows to extract patterns
 */
function analyzeUserFlows(userFlows) {
  const totalFlows = userFlows.length;

  // Extract all unique pages
  const allPages = new Set();
  userFlows.forEach(flow => {
    if (flow.pages && Array.isArray(flow.pages)) {
      flow.pages.forEach(page => allPages.add(page));
    }
  });

  // Identify common flows
  const hasAuthFlow = userFlows.some(flow => 
    flow.name.toLowerCase().includes('login') || 
    flow.name.toLowerCase().includes('auth')
  );

  // Estimate test count
  const estimatedTests = userFlows.reduce((sum, flow) => {
    // Estimate 3-5 tests per flow
    return sum + (flow.testCount || 4);
  }, 0);

  // Complexity assessment
  const complexity = assessComplexity(userFlows);

  return {
    totalFlows,
    uniquePages: Array.from(allPages),
    pagesCount: allPages.size,
    hasAuthFlow,
    estimatedTests,
    complexity
  };
}

/**
 * Assess complexity of user flows
 */
function assessComplexity(userFlows) {
  let score = 0;
  
  // More flows = more complexity
  score += userFlows.length * 10;

  // Count unique pages
  const allPages = new Set();
  userFlows.forEach(flow => {
    if (flow.pages) {
      flow.pages.forEach(page => allPages.add(page));
    }
  });
  score += allPages.size * 5;

  // Check for complex flows
  userFlows.forEach(flow => {
    if (flow.steps && flow.steps.length > 5) score += 10;
    if (flow.requiresAuth) score += 5;
    if (flow.apiInteractions) score += 10;
  });

  // Determine complexity level
  if (score < 50) return { level: 'low', score, description: 'Simple flows, straightforward implementation' };
  if (score < 100) return { level: 'medium', score, description: 'Moderate complexity, requires planning' };
  return { level: 'high', score, description: 'Complex flows, extensive implementation needed' };
}

/**
 * Enhance plan with additional guidance
 */
function enhancePlan(generated, analysis) {
  // Add discovered pages to Page Object Model if missing
  if (analysis.uniquePages.length > 0 && generated.pageObjectModel) {
    const existingPages = generated.pageObjectModel.pages.map(p => p.pageName);
    
    analysis.uniquePages.forEach(pageName => {
      if (!existingPages.includes(pageName)) {
        generated.pageObjectModel.pages.push({
          pageName,
          path: `pages/${pageName}.ts`,
          selectors: {},
          methods: [],
          discovered: true,
          note: 'Identified from flow analysis, needs implementation'
        });
      }
    });
  }

  return generated;
}

/**
 * Generate setup guide
 */
function generateSetupGuide(plan) {
  return {
    prerequisites: [
      'Node.js 18 or higher',
      'npm or yarn package manager',
      'VS Code (recommended) with Playwright extension'
    ],
    installation: [
      '1. Initialize project: npm init playwright@latest',
      '2. Install dependencies: npm install',
      '3. Install browsers: npx playwright install',
      '4. Verify installation: npx playwright test --list'
    ],
    projectSetup: [
      '1. Create directory structure (tests/, pages/, fixtures/, helpers/)',
      '2. Copy playwright.config.ts to project root',
      '3. Implement BasePage class',
      '4. Create Page Object classes',
      '5. Set up test fixtures',
      '6. Write first test',
      '7. Run tests: npx playwright test'
    ],
    developmentWorkflow: [
      '1. Write Page Object for new page',
      '2. Create test file',
      '3. Implement test using Page Objects',
      '4. Run test: npx playwright test filename.spec.ts',
      '5. Debug with UI mode: npx playwright test --ui',
      '6. Generate code: npx playwright codegen <url>'
    ],
    commonCommands: {
      runAllTests: 'npx playwright test',
      runSpecificTest: 'npx playwright test login.spec.ts',
      runInUIMode: 'npx playwright test --ui',
      runInHeaded: 'npx playwright test --headed',
      runInDebug: 'npx playwright test --debug',
      generateCode: 'npx playwright codegen',
      showReport: 'npx playwright show-report',
      runInChrome: 'npx playwright test --project=chromium'
    }
  };
}

/**
 * Calculate implementation estimate
 */
function calculateImplementationEstimate(plan, analysis) {
  const pagesCount = plan.pageObjectModel?.pages?.length || 0;
  const componentsCount = plan.pageObjectModel?.components?.length || 0;
  const testsCount = analysis.estimatedTests || 0;
  const fixturesCount = plan.fixtures?.length || 0;
  const helpersCount = plan.helpers?.length || 0;

  // Effort estimates (hours)
  const setupEffort = 4; // Initial setup
  const pageEffort = pagesCount * 2; // 2 hours per page
  const componentEffort = componentsCount * 1; // 1 hour per component
  const testEffort = testsCount * 1.5; // 1.5 hours per test
  const fixtureEffort = fixturesCount * 1; // 1 hour per fixture
  const helperEffort = helpersCount * 2; // 2 hours per helper
  const documentationEffort = 4; // Documentation

  const totalEffort = setupEffort + pageEffort + componentEffort + 
                     testEffort + fixtureEffort + helperEffort + 
                     documentationEffort;

  const durationWeeks = Math.ceil(totalEffort / 40); // Assuming 40 hours/week

  return {
    breakdown: {
      setup: `${setupEffort}h`,
      pages: `${pageEffort}h (${pagesCount} pages)`,
      components: `${componentEffort}h (${componentsCount} components)`,
      tests: `${testEffort}h (${testsCount} tests)`,
      fixtures: `${fixtureEffort}h (${fixturesCount} fixtures)`,
      helpers: `${helperEffort}h (${helpersCount} helpers)`,
      documentation: `${documentationEffort}h`
    },
    total: `${totalEffort} hours`,
    duration: `${durationWeeks} week${durationWeeks > 1 ? 's' : ''}`,
    team: durationWeeks > 4 ? '2-3 people recommended' : '1 person sufficient',
    phases: [
      {
        phase: 1,
        name: 'Foundation',
        duration: '1 week',
        deliverables: ['Project setup', 'BasePage', 'Configuration']
      },
      {
        phase: 2,
        name: 'Page Objects',
        duration: `${Math.ceil(pagesCount / 5)} week(s)`,
        deliverables: ['All Page Objects', 'Components', 'Helpers']
      },
      {
        phase: 3,
        name: 'Tests',
        duration: `${Math.ceil(testsCount / 10)} week(s)`,
        deliverables: ['All test cases', 'Fixtures', 'CI/CD integration']
      }
    ]
  };
}

export default {
  planPlaywrightArchitecture
};
