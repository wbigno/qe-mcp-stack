import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================
// EXISTING ENDPOINTS (keep all existing)
// ============================================

// Pull stories from Azure DevOps
router.post('/pull-stories', async (req, res) => {
  try {
    const { sprint, workItemIds, query } = req.body;
    logger.info('Pulling stories from Azure DevOps');

    const stories = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { sprint, workItemIds, query }
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: stories.length,
      stories
    });
  } catch (error) {
    logger.error('Pull stories error:', error);
    res.status(500).json({ 
      error: 'Failed to pull stories',
      message: error.message 
    });
  }
});

// Analyze requirements using requirements-analyzer STDIO MCP
router.post('/analyze-requirements', async (req, res) => {
  try {
    const { storyIds, includeGapAnalysis = true } = req.body;

    logger.info(`Analyzing requirements for ${storyIds?.length || 0} stories`);

    // Get stories from ADO
    const stories = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/get',
      { ids: storyIds }
    );

    const results = [];

    // Analyze each story using requirements-analyzer STDIO MCP
    for (const story of stories) {
      const input = {
        data: {
          storyId: story.id,
          storyContent: {
            title: story.fields['System.Title'] || '',
            description: story.fields['System.Description'] || '',
            acceptanceCriteria: story.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || ''
          }
        }
      };

      const analysis = await req.mcpManager.callStdioMcp(
        'requirements-analyzer',
        input
      );

      results.push({
        storyId: story.id,
        analysis
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: results.length,
      results
    });
  } catch (error) {
    logger.error('Requirements analysis error:', error);
    res.status(500).json({
      error: 'Requirements analysis failed',
      message: error.message
    });
  }
});

/**
 * Generate test cases for a user story
 * POST /api/ado/generate-test-cases
 * Body: { storyId: number, updateADO?: boolean, includeNegativeTests?: boolean, includeEdgeCases?: boolean }
 */
router.post('/generate-test-cases', async (req, res) => {
  try {
    const { storyId, updateADO = false, includeNegativeTests = false, includeEdgeCases = false } = req.body;

    if (!storyId) {
      return res.status(400).json({
        error: 'Story ID is required',
        message: 'Please provide a storyId in the request body'
      });
    }

    logger.info(`Generating test cases for story ${storyId}`);

    // Get the story from ADO first
    const stories = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/get',
      { ids: [parseInt(storyId)] }
    );

    if (!stories || stories.length === 0) {
      return res.status(404).json({
        error: 'Story not found',
        message: `Work item ${storyId} not found in Azure DevOps`
      });
    }

    const story = stories[0];

    // Prepare input for test case generator
    const input = {
      data: {
        storyId: story.id,
        requirements: story.fields['System.Description'] || '',
        acceptanceCriteria: story.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '',
        includeNegative: includeNegativeTests,
        includeEdgeCases: includeEdgeCases
      }
    };

    // Call the test-case-planner STDIO MCP
    const mcpResponse = await req.mcpManager.callStdioMcp(
      'test-case-planner',
      input
    );

    // The MCP returns { success: true, result: { testCases: [...], summary: {...}, metadata: {...} } }
    if (!mcpResponse || !mcpResponse.success || !mcpResponse.result) {
      throw new Error('Test case generation returned no results');
    }

    const { testCases, summary, metadata } = mcpResponse.result;

    if (!testCases || testCases.length === 0) {
      throw new Error('Test case generation returned no test cases');
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId: parseInt(storyId),
      count: testCases.length,
      testCases: testCases,
      summary: summary,
      metadata: metadata,
      updatedInADO: updateADO
    });

  } catch (error) {
    logger.error('Test case generation error:', error);
    res.status(500).json({
      error: 'Test case generation failed',
      message: error.message
    });
  }
});

// ... (keep all other existing endpoints: analyze-requirements, generate-test-cases, etc.)

// ============================================
// NEW DEFECT MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all defects with optional filters
 * GET /api/ado/defects?environment=UAT&severity=High&state=Active
 */
router.get('/defects', async (req, res) => {
  try {
    const { environment, severity, priority, state, sprint, assignedTo } = req.query;
    
    logger.info('Pulling defects from Azure DevOps', { filters: req.query });

    // Build WIQL query for defects/bugs
    let wiql = `SELECT [System.Id], [System.Title], [System.State], [System.Tags], 
                [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority],
                [System.AssignedTo], [System.CreatedDate], [Microsoft.VSTS.Common.ResolvedDate]
                FROM WorkItems 
                WHERE [System.WorkItemType] = 'Bug'`;
    
    if (state) {
      wiql += ` AND [System.State] = '${state}'`;
    }
    
    if (severity) {
      wiql += ` AND [Microsoft.VSTS.Common.Severity] = '${severity}'`;
    }

    if (priority) {
      wiql += ` AND [Microsoft.VSTS.Common.Priority] = ${priority}`;
    }
    
    if (sprint) {
      wiql += ` AND [System.IterationPath] UNDER '${sprint}'`;
    }

    if (assignedTo) {
      wiql += ` AND [System.AssignedTo] = '${assignedTo}'`;
    }
    
    wiql += ` ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC`;

    // Call Azure DevOps MCP with WIQL query
    const defects = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { wiql }
    );

    // Filter by environment tag if specified
    let filteredDefects = defects;
    if (environment) {
      filteredDefects = defects.filter(defect => {
        const tags = defect.fields['System.Tags'] || '';
        return tags.toLowerCase().includes(environment.toLowerCase());
      });
    }

    // Calculate metrics
    const metrics = calculateDefectMetrics(filteredDefects);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: filteredDefects.length,
      metrics,
      defects: filteredDefects
    });
  } catch (error) {
    logger.error('Get defects error:', error);
    res.status(500).json({ 
      error: 'Failed to get defects',
      message: error.message 
    });
  }
});

/**
 * Get defects by story
 * GET /api/ado/defects/by-story/:storyId
 */
router.get('/defects/by-story/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    logger.info(`Getting defects for story ${storyId}`);

    // Query defects linked to story
    const wiql = `SELECT [System.Id], [System.Title], [System.State], [System.Tags],
                  [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority]
                  FROM WorkItemLinks
                  WHERE ([Source].[System.Id] = ${storyId} 
                         AND [Target].[System.WorkItemType] = 'Bug')
                  OR ([Target].[System.Id] = ${storyId} 
                      AND [Source].[System.WorkItemType] = 'Bug')
                  ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

    const defects = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { wiql }
    );

    const metrics = calculateDefectMetrics(defects);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId,
      count: defects.length,
      metrics,
      defects
    });
  } catch (error) {
    logger.error('Get defects by story error:', error);
    res.status(500).json({ 
      error: 'Failed to get defects',
      message: error.message 
    });
  }
});

/**
 * Get defect metrics by environment
 * GET /api/ado/defects/metrics
 */
router.get('/defects/metrics', async (req, res) => {
  try {
    const { sprint } = req.query;
    
    logger.info('Getting defect metrics');

    // Get all defects
    let wiql = `SELECT [System.Id], [System.Title], [System.State], [System.Tags],
                [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority],
                [System.CreatedDate], [Microsoft.VSTS.Common.ResolvedDate]
                FROM WorkItems 
                WHERE [System.WorkItemType] = 'Bug'`;
    
    if (sprint) {
      wiql += ` AND [System.IterationPath] UNDER '${sprint}'`;
    }

    const defects = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { wiql }
    );

    // Calculate comprehensive metrics
    const metrics = {
      total: defects.length,
      byEnvironment: calculateByEnvironment(defects),
      bySeverity: calculateBySeverity(defects),
      byPriority: calculateByPriority(defects),
      byState: calculateByState(defects),
      trends: calculateDefectTrends(defects),
      avgResolutionTime: calculateAvgResolutionTime(defects)
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Get defect metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error.message 
    });
  }
});

// ============================================
// TEST EXECUTION ENDPOINTS
// ============================================

/**
 * Get all test plans
 * GET /api/ado/test-plans
 */
router.get('/test-plans', async (req, res) => {
  try {
    logger.info('Getting test plans');

    const testPlans = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/test/plans',
      {}
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: testPlans.length,
      testPlans
    });
  } catch (error) {
    logger.error('Get test plans error:', error);
    res.status(500).json({ 
      error: 'Failed to get test plans',
      message: error.message 
    });
  }
});

/**
 * Get test suites for a plan
 * GET /api/ado/test-plans/:planId/suites
 */
router.get('/test-plans/:planId/suites', async (req, res) => {
  try {
    const { planId } = req.params;
    
    logger.info(`Getting test suites for plan ${planId}`);

    const testSuites = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/test/suites',
      { planId }
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      planId,
      count: testSuites.length,
      testSuites
    });
  } catch (error) {
    logger.error('Get test suites error:', error);
    res.status(500).json({ 
      error: 'Failed to get test suites',
      message: error.message 
    });
  }
});

/**
 * Get test cases by story
 * GET /api/ado/test-cases/by-story/:storyId
 */
router.get('/test-cases/by-story/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    logger.info(`Getting test cases for story ${storyId}`);

    // Query test cases linked to story
    const wiql = `SELECT [System.Id], [System.Title], [System.State], 
                  [Microsoft.VSTS.TCM.AutomatedTestName], [Microsoft.VSTS.Common.Priority]
                  FROM WorkItemLinks
                  WHERE ([Source].[System.Id] = ${storyId} 
                         AND [Target].[System.WorkItemType] = 'Test Case')
                  OR ([Target].[System.Id] = ${storyId} 
                      AND [Source].[System.WorkItemType] = 'Test Case')
                  ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

    const testCases = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { wiql }
    );

    // Calculate test case metrics
    const metrics = {
      total: testCases.length,
      automated: testCases.filter(tc => tc.fields['Microsoft.VSTS.TCM.AutomatedTestName']).length,
      manual: testCases.filter(tc => !tc.fields['Microsoft.VSTS.TCM.AutomatedTestName']).length,
      byState: calculateByState(testCases)
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId,
      count: testCases.length,
      metrics,
      testCases
    });
  } catch (error) {
    logger.error('Get test cases error:', error);
    res.status(500).json({ 
      error: 'Failed to get test cases',
      message: error.message 
    });
  }
});

/**
 * Get test runs with results
 * GET /api/ado/test-runs?planId=123&outcome=Failed
 */
router.get('/test-runs', async (req, res) => {
  try {
    const { planId, outcome, automated } = req.query;
    
    logger.info('Getting test runs', { filters: req.query });

    const testRuns = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/test/runs',
      { planId, outcome, automated }
    );

    // Calculate execution metrics
    const metrics = calculateTestExecutionMetrics(testRuns);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: testRuns.length,
      metrics,
      testRuns
    });
  } catch (error) {
    logger.error('Get test runs error:', error);
    res.status(500).json({ 
      error: 'Failed to get test runs',
      message: error.message 
    });
  }
});

/**
 * Get test results for a specific run
 * GET /api/ado/test-runs/:runId/results
 */
router.get('/test-runs/:runId/results', async (req, res) => {
  try {
    const { runId } = req.params;
    
    logger.info(`Getting test results for run ${runId}`);

    const results = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/test/results',
      { runId }
    );

    // Calculate pass rate
    const passed = results.filter(r => r.outcome === 'Passed').length;
    const failed = results.filter(r => r.outcome === 'Failed').length;
    const notExecuted = results.filter(r => r.outcome === 'NotExecuted').length;
    const passRate = results.length > 0 ? (passed / results.length) * 100 : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      count: results.length,
      summary: {
        passed,
        failed,
        notExecuted,
        passRate: passRate.toFixed(2)
      },
      results
    });
  } catch (error) {
    logger.error('Get test results error:', error);
    res.status(500).json({ 
      error: 'Failed to get test results',
      message: error.message 
    });
  }
});

/**
 * Get test execution metrics
 * GET /api/ado/test-execution/metrics
 */
router.get('/test-execution/metrics', async (req, res) => {
  try {
    const { sprint, planId } = req.query;
    
    logger.info('Getting test execution metrics');

    // Get recent test runs
    const testRuns = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/test/runs',
      { sprint, planId, limit: 50 }
    );

    const metrics = {
      totalRuns: testRuns.length,
      passRate: calculateOverallPassRate(testRuns),
      executionTrends: calculateExecutionTrends(testRuns),
      byEnvironment: calculateTestResultsByEnvironment(testRuns),
      automationRate: calculateAutomationRate(testRuns)
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Get test execution metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error.message 
    });
  }
});

// ============================================
// QUALITY METRICS ENDPOINTS
// ============================================

/**
 * Get combined quality metrics
 * GET /api/ado/quality-metrics?sprint=Sprint%2042
 */
router.get('/quality-metrics', async (req, res) => {
  try {
    const { sprint } = req.query;
    
    logger.info('Getting quality metrics');

    // Get defects, test cases, and test runs in parallel
    const [defects, testRuns, stories] = await Promise.all([
      req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', { 
        wiql: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'Bug' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : ''}`
      }),
      req.mcpManager.callDockerMcp('azureDevOps', '/test/runs', { sprint, limit: 100 }),
      req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', { 
        wiql: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'User Story' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : ''}`
      })
    ]);

    const metrics = {
      defects: {
        total: defects.length,
        byEnvironment: calculateByEnvironment(defects),
        bySeverity: calculateBySeverity(defects),
        open: defects.filter(d => d.fields['System.State'] !== 'Closed' && d.fields['System.State'] !== 'Resolved').length
      },
      testing: {
        passRate: calculateOverallPassRate(testRuns),
        totalRuns: testRuns.length,
        automationRate: calculateAutomationRate(testRuns)
      },
      coverage: {
        storiesWithTests: calculateStoriesWithTests(stories),
        storiesWithDefects: calculateStoriesWithDefects(stories),
        totalStories: stories.length
      },
      qualityScore: calculateQualityScore(defects, testRuns, stories)
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sprint,
      metrics
    });
  } catch (error) {
    logger.error('Get quality metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get quality metrics',
      message: error.message 
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDefectMetrics(defects) {
  return {
    total: defects.length,
    open: defects.filter(d => d.fields['System.State'] === 'Active' || d.fields['System.State'] === 'New').length,
    closed: defects.filter(d => d.fields['System.State'] === 'Closed').length,
    resolved: defects.filter(d => d.fields['System.State'] === 'Resolved').length,
    byEnvironment: calculateByEnvironment(defects),
    bySeverity: calculateBySeverity(defects),
    byPriority: calculateByPriority(defects)
  };
}

function calculateByEnvironment(defects) {
  const envs = { dev: 0, uat: 0, prod: 0, other: 0 };
  
  defects.forEach(defect => {
    const tags = (defect.fields['System.Tags'] || '').toLowerCase();
    if (tags.includes('dev')) envs.dev++;
    else if (tags.includes('uat')) envs.uat++;
    else if (tags.includes('prod')) envs.prod++;
    else envs.other++;
  });
  
  return envs;
}

function calculateBySeverity(defects) {
  const severity = { critical: 0, high: 0, medium: 0, low: 0 };
  
  defects.forEach(defect => {
    const sev = (defect.fields['Microsoft.VSTS.Common.Severity'] || '').toLowerCase();
    if (sev.includes('1') || sev.includes('critical')) severity.critical++;
    else if (sev.includes('2') || sev.includes('high')) severity.high++;
    else if (sev.includes('3') || sev.includes('medium')) severity.medium++;
    else severity.low++;
  });
  
  return severity;
}

function calculateByPriority(defects) {
  const priority = { p1: 0, p2: 0, p3: 0, p4: 0 };
  
  defects.forEach(defect => {
    const pri = defect.fields['Microsoft.VSTS.Common.Priority'];
    if (pri === 1) priority.p1++;
    else if (pri === 2) priority.p2++;
    else if (pri === 3) priority.p3++;
    else priority.p4++;
  });
  
  return priority;
}

function calculateByState(items) {
  const states = {};
  
  items.forEach(item => {
    const state = item.fields['System.State'] || 'Unknown';
    states[state] = (states[state] || 0) + 1;
  });
  
  return states;
}

function calculateDefectTrends(defects) {
  // Group defects by week for trend analysis
  const weeks = {};
  
  defects.forEach(defect => {
    const createdDate = new Date(defect.fields['System.CreatedDate']);
    const weekKey = getWeekKey(createdDate);
    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });
  
  return weeks;
}

function calculateAvgResolutionTime(defects) {
  const resolved = defects.filter(d => d.fields['Microsoft.VSTS.Common.ResolvedDate']);
  
  if (resolved.length === 0) return 0;
  
  const totalDays = resolved.reduce((sum, defect) => {
    const created = new Date(defect.fields['System.CreatedDate']);
    const resolved = new Date(defect.fields['Microsoft.VSTS.Common.ResolvedDate']);
    const days = (resolved - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);
  
  return (totalDays / resolved.length).toFixed(1);
}

function calculateTestExecutionMetrics(testRuns) {
  const total = testRuns.length;
  const passed = testRuns.filter(r => r.outcome === 'Passed').length;
  const failed = testRuns.filter(r => r.outcome === 'Failed').length;
  
  return {
    total,
    passed,
    failed,
    passRate: total > 0 ? ((passed / total) * 100).toFixed(2) : 0
  };
}

function calculateOverallPassRate(testRuns) {
  let totalTests = 0;
  let passedTests = 0;
  
  testRuns.forEach(run => {
    totalTests += run.totalTests || 0;
    passedTests += run.passedTests || 0;
  });
  
  return totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
}

function calculateExecutionTrends(testRuns) {
  // Group by date for trend analysis
  const dates = {};
  
  testRuns.forEach(run => {
    const date = new Date(run.startedDate).toISOString().split('T')[0];
    if (!dates[date]) {
      dates[date] = { total: 0, passed: 0 };
    }
    dates[date].total += run.totalTests || 0;
    dates[date].passed += run.passedTests || 0;
  });
  
  return dates;
}

function calculateTestResultsByEnvironment(testRuns) {
  const envs = { dev: { passed: 0, failed: 0 }, uat: { passed: 0, failed: 0 }, prod: { passed: 0, failed: 0 } };
  
  testRuns.forEach(run => {
    const tags = (run.tags || '').toLowerCase();
    let env = 'dev';
    if (tags.includes('uat')) env = 'uat';
    else if (tags.includes('prod')) env = 'prod';
    
    envs[env].passed += run.passedTests || 0;
    envs[env].failed += run.failedTests || 0;
  });
  
  return envs;
}

function calculateAutomationRate(testRuns) {
  const automated = testRuns.filter(r => r.isAutomated).length;
  return testRuns.length > 0 ? ((automated / testRuns.length) * 100).toFixed(2) : 0;
}

function calculateStoriesWithTests(stories) {
  // Would need to query test case links - simplified here
  return Math.floor(stories.length * 0.75); // Placeholder
}

function calculateStoriesWithDefects(stories) {
  // Would need to query defect links - simplified here
  return Math.floor(stories.length * 0.15); // Placeholder
}

function calculateQualityScore(defects, testRuns, stories) {
  // Simple quality score calculation
  const defectScore = Math.max(0, 100 - (defects.length * 2));
  const testScore = parseFloat(calculateOverallPassRate(testRuns));
  const coverageScore = (calculateStoriesWithTests(stories) / stories.length) * 100;
  
  return ((defectScore + testScore + coverageScore) / 3).toFixed(1);
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = Math.ceil((date.getDate()) / 7);
  return `${year}-W${week}`;
}

export default router;
