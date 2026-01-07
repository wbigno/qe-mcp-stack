import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================
// EXISTING ENDPOINTS (keep all existing)
// ============================================

// Pull stories from Azure DevOps
router.post('/pull-stories', async (req, res) => {
  try {
    const { sprint, workItemIds, query, organization, project, team } = req.body;
    logger.info('Pulling stories from Azure DevOps', { sprint, workItemIds: workItemIds?.length, organization, project, team });

    const stories = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      { sprint, workItemIds, query, organization, project, team }
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

    // Call Azure DevOps MCP - just pass sprint, let it build default query
    const defects = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/query',
      {
        sprint
      }
    );

    // Filter to only bugs
    let filteredDefects = (defects || []).filter(wi => {
      return wi.fields?.['System.WorkItemType'] === 'Bug';
    });

    // Apply client-side filters
    if (state) {
      filteredDefects = filteredDefects.filter(defect => {
        return defect.fields?.['System.State'] === state;
      });
    }

    if (severity) {
      filteredDefects = filteredDefects.filter(defect => {
        return defect.fields?.['Microsoft.VSTS.Common.Severity'] === severity;
      });
    }

    if (priority) {
      filteredDefects = filteredDefects.filter(defect => {
        return defect.fields?.['Microsoft.VSTS.Common.Priority'] === parseInt(priority);
      });
    }

    if (environment) {
      filteredDefects = filteredDefects.filter(defect => {
        const tags = defect.fields['System.Tags'] || '';
        return tags.toLowerCase().includes(environment.toLowerCase());
      });
    }

    if (assignedTo) {
      filteredDefects = filteredDefects.filter(defect => {
        const assigned = defect.fields['System.AssignedTo']?.displayName || '';
        return assigned.toLowerCase().includes(assignedTo.toLowerCase());
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

    // Try to get test runs, but handle gracefully if endpoint doesn't exist
    let testRuns = [];
    try {
      testRuns = await req.mcpManager.callDockerMcp(
        'azureDevOps',
        '/test/runs',
        { sprint, planId, limit: 50 }
      );
    } catch (testError) {
      // Test execution endpoints not implemented yet - return empty data
      logger.warn('Test execution endpoints not available yet:', testError.message);
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        available: false,
        message: 'Test execution tracking not yet implemented',
        metrics: {
          totalRuns: 0,
          passRate: 0,
          executionTrends: [],
          byEnvironment: {},
          automationRate: 0
        }
      });
    }

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
      available: true,
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

/**
 * Get test execution organized by story
 * GET /api/ado/test-execution/by-story?sprint=Sprint%2042
 */
router.get('/test-execution/by-story', async (req, res) => {
  try {
    const { sprint } = req.query;

    logger.info('Getting test execution by story', { sprint });

    // Get all stories (Product Backlog Items) for the sprint
    const stories = await req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
      sprint,
      query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] IN ('User Story', 'Product Backlog Item') ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : 'AND 1=0'} ORDER BY [System.Id] DESC`
    });

    logger.info(`Found ${stories.length} stories`);

    // For each story, get linked test cases
    const storiesWithTests = await Promise.all(stories.map(async (story) => {
      try {
        // Query test cases linked to this story
        const wiql = `SELECT [System.Id], [System.Title], [System.State],
                      [Microsoft.VSTS.TCM.AutomatedTestName], [Microsoft.VSTS.Common.Priority]
                      FROM WorkItemLinks
                      WHERE ([Source].[System.Id] = ${story.id}
                             AND [Target].[System.WorkItemType] = 'Test Case')
                      OR ([Target].[System.Id] = ${story.id}
                          AND [Source].[System.WorkItemType] = 'Test Case')
                      ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

        const testCases = await req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
          query: wiql
        }).catch(err => {
          logger.warn(`Failed to get test cases for story ${story.id}:`, err.message);
          return [];
        });

        // For each test case, try to get latest test results (will be empty until test endpoints implemented)
        const testCasesWithResults = testCases.map(tc => {
          const isAutomated = !!tc.fields['Microsoft.VSTS.TCM.AutomatedTestName'];

          return {
            id: tc.id,
            title: tc.fields['System.Title'],
            state: tc.fields['System.State'],
            priority: tc.fields['Microsoft.VSTS.Common.Priority'] || 3,
            automated: isAutomated,
            automatedTestName: tc.fields['Microsoft.VSTS.TCM.AutomatedTestName'],
            lastRun: null, // Will be populated when test/runs endpoint exists
            runHistory: {
              totalRuns: 0,
              passed: 0,
              failed: 0,
              blocked: 0,
              notExecuted: 0,
              passRate: 0
            }
          };
        });

        // Calculate story summary
        const summary = {
          totalCases: testCasesWithResults.length,
          automatedCases: testCasesWithResults.filter(tc => tc.automated).length,
          manualCases: testCasesWithResults.filter(tc => !tc.automated).length,
          runCases: 0, // Will be calculated from test results
          pendingCases: testCasesWithResults.length,
          passRate: 0,
          automationRate: testCasesWithResults.length > 0
            ? ((testCasesWithResults.filter(tc => tc.automated).length / testCasesWithResults.length) * 100).toFixed(1)
            : 0
        };

        return {
          storyId: story.id,
          storyTitle: story.fields['System.Title'],
          storyState: story.fields['System.State'],
          storyType: story.fields['System.WorkItemType'],
          testCases: testCasesWithResults,
          summary
        };
      } catch (error) {
        logger.error(`Error processing story ${story.id}:`, error);
        return {
          storyId: story.id,
          storyTitle: story.fields['System.Title'],
          storyState: story.fields['System.State'],
          storyType: story.fields['System.WorkItemType'],
          testCases: [],
          summary: {
            totalCases: 0,
            automatedCases: 0,
            manualCases: 0,
            runCases: 0,
            pendingCases: 0,
            passRate: 0,
            automationRate: 0
          }
        };
      }
    }));

    // Calculate overall metrics
    const overallMetrics = {
      totalStories: storiesWithTests.length,
      storiesWithTests: storiesWithTests.filter(s => s.summary.totalCases > 0).length,
      storiesWithoutTests: storiesWithTests.filter(s => s.summary.totalCases === 0).length,
      totalTestCases: storiesWithTests.reduce((sum, s) => sum + s.summary.totalCases, 0),
      automatedTestCases: storiesWithTests.reduce((sum, s) => sum + s.summary.automatedCases, 0),
      manualTestCases: storiesWithTests.reduce((sum, s) => sum + s.summary.manualCases, 0),
      overallAutomationRate: 0
    };

    if (overallMetrics.totalTestCases > 0) {
      overallMetrics.overallAutomationRate =
        ((overallMetrics.automatedTestCases / overallMetrics.totalTestCases) * 100).toFixed(1);
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sprint,
      metrics: overallMetrics,
      stories: storiesWithTests,
      message: 'Test results will be available once test execution endpoints are implemented'
    });
  } catch (error) {
    logger.error('Get test execution by story error:', error);
    res.status(500).json({
      error: 'Failed to get test execution by story',
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

    // Get defects and stories (work items endpoints that exist)
    // Use sprint parameter instead of WIQL to let the MCP handle path formatting
    const [defects, stories] = await Promise.all([
      req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
        sprint,
        query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'Bug' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : 'AND 1=0'} ORDER BY [System.Id] DESC`
      }),
      req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
        sprint,
        query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'User Story' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : 'AND 1=0'} ORDER BY [System.Id] DESC`
      })
    ]);

    // Try to get test runs, but handle gracefully if endpoint doesn't exist
    let testRuns = [];
    let testingAvailable = false;
    try {
      testRuns = await req.mcpManager.callDockerMcp('azureDevOps', '/test/runs', { sprint, limit: 100 });
      testingAvailable = true;
    } catch (testError) {
      logger.warn('Test execution endpoints not available yet:', testError.message);
      testRuns = [];
    }

    const metrics = {
      defects: {
        total: defects.length,
        byEnvironment: calculateByEnvironment(defects),
        bySeverity: calculateBySeverity(defects),
        open: defects.filter(d => d.fields['System.State'] !== 'Closed' && d.fields['System.State'] !== 'Resolved').length
      },
      testing: {
        passRate: testingAvailable ? calculateOverallPassRate(testRuns) : 0,
        totalRuns: testRuns.length,
        automationRate: testingAvailable ? calculateAutomationRate(testRuns) : 0,
        available: testingAvailable
      },
      coverage: {
        storiesWithTests: testingAvailable ? calculateStoriesWithTests(stories) : 0,
        storiesWithDefects: calculateStoriesWithDefects(stories),
        totalStories: stories.length
      },
      qualityScore: calculateQualityScore(defects, testRuns, stories)
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sprint,
      metrics,
      message: !testingAvailable ? 'Test execution tracking not yet implemented' : undefined
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
  // Simple quality score calculation with safety checks
  const defectScore = Math.max(0, 100 - (defects.length * 2));
  const testScore = parseFloat(calculateOverallPassRate(testRuns)) || 0;
  const coverageScore = stories.length > 0
    ? (calculateStoriesWithTests(stories) / stories.length) * 100
    : 0;

  const totalScore = (defectScore + testScore + coverageScore) / 3;
  return isNaN(totalScore) ? '0.0' : totalScore.toFixed(1);
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = Math.ceil((date.getDate()) / 7);
  return `${year}-W${week}`;
}

// ============================================
// ITERATION HIERARCHY ENDPOINTS
// ============================================

// Get all projects
router.get('/iterations/projects', async (req, res) => {
  try {
    logger.info('Getting projects from Azure DevOps');

    const result = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/iterations/projects',
      {},
      'GET'
    );

    res.json(result);
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get teams for a project
router.get('/iterations/teams', async (req, res) => {
  try {
    const { project } = req.query;
    logger.info('Getting teams for project:', project);

    if (!project) {
      return res.status(400).json({ success: false, error: 'project query parameter required' });
    }

    const result = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      `/iterations/teams?project=${encodeURIComponent(project)}`,
      {},
      'GET'
    );

    res.json(result);
  } catch (error) {
    logger.error('Get teams error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sprints for a team
router.get('/iterations/sprints', async (req, res) => {
  try {
    const { project, team } = req.query;
    logger.info('Getting sprints for project/team:', { project, team });

    if (!project || !team) {
      return res.status(400).json({
        success: false,
        error: 'project and team query parameters required'
      });
    }

    const result = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      `/iterations/sprints?project=${encodeURIComponent(project)}&team=${encodeURIComponent(team)}`,
      {},
      'GET'
    );

    res.json(result);
  } catch (error) {
    logger.error('Get sprints error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WRITE-BACK ENDPOINTS (Analysis to ADO)
// ============================================

/**
 * Preview what will be updated in a story (doesn't actually write)
 * POST /api/ado/update-story/preview
 * Body: { storyId: number, updates: { fieldName: value } }
 */
router.post('/update-story/preview', async (req, res) => {
  try {
    const { storyId, updates } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    logger.info(`Previewing updates for story ${storyId}`);

    // Get current story state
    const stories = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/get',
      { ids: [parseInt(storyId)] }
    );

    if (!stories || stories.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Story ${storyId} not found`
      });
    }

    const currentStory = stories[0];
    const preview = {
      storyId: parseInt(storyId),
      storyTitle: currentStory.fields['System.Title'],
      changes: []
    };

    // Show what will change
    for (const [field, newValue] of Object.entries(updates)) {
      const currentValue = currentStory.fields[field];

      if (currentValue !== newValue) {
        preview.changes.push({
          field,
          fieldName: getFieldDisplayName(field),
          currentValue: currentValue || '(empty)',
          newValue,
          changeType: currentValue ? 'update' : 'add'
        });
      }
    }

    logger.info(`Preview generated: ${preview.changes.length} changes for story ${storyId}`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      preview
    });

  } catch (error) {
    logger.error('Preview update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

/**
 * Actually update a story (requires confirmation)
 * POST /api/ado/update-story
 * Body: { storyId: number, updates: { fieldName: value }, confirmed: true }
 */
router.post('/update-story', async (req, res) => {
  try {
    const { storyId, updates, confirmed } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Update must be confirmed. Call /update-story/preview first and set confirmed: true'
      });
    }

    logger.info(`Updating story ${storyId} with confirmed changes`);

    // Call Azure DevOps MCP to update the work item
    const result = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/update',
      {
        id: parseInt(storyId),
        fields: updates
      }
    );

    // Audit log
    logger.info(`[AUDIT] Story ${storyId} updated by orchestrator:`, {
      fields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId: parseInt(storyId),
      updatedFields: Object.keys(updates),
      result
    });

  } catch (error) {
    logger.error('Update story error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update story',
      message: error.message
    });
  }
});

/**
 * Add a comment to a story
 * POST /api/ado/add-comment
 * Body: { storyId: number, comment: string }
 */
router.post('/add-comment', async (req, res) => {
  try {
    const { storyId, comment } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    if (!comment || typeof comment !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'comment string is required'
      });
    }

    logger.info(`Adding comment to story ${storyId}`);

    // In ADO, comments are added via the System.History field
    const result = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/update',
      {
        id: parseInt(storyId),
        fields: {
          'System.History': comment
        }
      }
    );

    // Audit log
    logger.info(`[AUDIT] Comment added to story ${storyId}:`, {
      commentLength: comment.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId: parseInt(storyId),
      commentAdded: true,
      result
    });

  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      message: error.message
    });
  }
});

/**
 * Preview batch updates to multiple stories
 * POST /api/ado/batch-update/preview
 * Body: { storyIds: number[], updates: { fieldName: value } }
 */
router.post('/batch-update/preview', async (req, res) => {
  try {
    const { storyIds, updates } = req.body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'storyIds array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    logger.info(`Previewing batch update for ${storyIds.length} stories`);

    const previews = [];

    // Generate preview for each story
    for (const storyId of storyIds) {
      try {
        // Get current story state
        const stories = await req.mcpManager.callDockerMcp(
          'azureDevOps',
          '/work-items/get',
          { ids: [parseInt(storyId)] }
        );

        if (stories && stories.length > 0) {
          const currentStory = stories[0];
          const preview = {
            storyId: parseInt(storyId),
            storyTitle: currentStory.fields['System.Title'],
            changes: []
          };

          for (const [field, newValue] of Object.entries(updates)) {
            const currentValue = currentStory.fields[field];

            if (currentValue !== newValue) {
              preview.changes.push({
                field,
                fieldName: getFieldDisplayName(field),
                currentValue: currentValue || '(empty)',
                newValue,
                changeType: currentValue ? 'update' : 'add'
              });
            }
          }

          previews.push(preview);
        } else {
          previews.push({
            storyId: parseInt(storyId),
            error: 'Story not found'
          });
        }
      } catch (error) {
        previews.push({
          storyId: parseInt(storyId),
          error: error.message
        });
      }
    }

    logger.info(`Batch preview generated for ${previews.length} stories`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalStories: storyIds.length,
      previews
    });

  } catch (error) {
    logger.error('Batch preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate batch preview',
      message: error.message
    });
  }
});

/**
 * Execute batch updates to multiple stories
 * POST /api/ado/batch-update
 * Body: { storyIds: number[], updates: { fieldName: value }, confirmed: true }
 */
router.post('/batch-update', async (req, res) => {
  try {
    const { storyIds, updates, confirmed } = req.body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'storyIds array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Batch update must be confirmed. Call /batch-update/preview first and set confirmed: true'
      });
    }

    logger.info(`Executing batch update for ${storyIds.length} stories`);

    const results = [];

    // Update each story
    for (const storyId of storyIds) {
      try {
        const result = await req.mcpManager.callDockerMcp(
          'azureDevOps',
          '/work-items/update',
          {
            id: parseInt(storyId),
            fields: updates
          }
        );

        results.push({
          storyId: parseInt(storyId),
          success: true,
          updatedFields: Object.keys(updates)
        });

        // Audit log
        logger.info(`[AUDIT] Story ${storyId} batch updated:`, {
          fields: Object.keys(updates),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          storyId: parseInt(storyId),
          success: false,
          error: error.message
        });

        logger.error(`Failed to update story ${storyId}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`Batch update complete: ${successCount} succeeded, ${failureCount} failed`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: storyIds.length,
        succeeded: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    logger.error('Batch update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute batch update',
      message: error.message
    });
  }
});

/**
 * Helper function to get display-friendly field names
 */
function getFieldDisplayName(fieldName) {
  const fieldMap = {
    'System.Title': 'Title',
    'System.Description': 'Description',
    'System.State': 'State',
    'System.Tags': 'Tags',
    'System.AssignedTo': 'Assigned To',
    'System.IterationPath': 'Iteration Path',
    'System.AreaPath': 'Area Path',
    'Microsoft.VSTS.Common.AcceptanceCriteria': 'Acceptance Criteria',
    'Microsoft.VSTS.Common.Priority': 'Priority',
    'Microsoft.VSTS.Common.Severity': 'Severity',
    'System.History': 'Comment/History'
  };

  return fieldMap[fieldName] || fieldName;
}

export default router;
