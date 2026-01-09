import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Full Automation Workflow
 * POST /api/playwright/full-automation
 *
 * Chains analyzer → generator to discover paths and create tests
 */
router.post('/full-automation', async (req, res) => {
  try {
    const { app, maxPaths = 5, depth = 'deep', model } = req.body;

    if (!app) {
      return res.status(400).json({
        error: 'Application name is required',
        usage: 'POST /api/playwright/full-automation with body: { app: "AppName", maxPaths?: 5, depth?: "deep" }'
      });
    }

    logger.info(`Starting full automation workflow for ${app}`);

    const startTime = Date.now();
    const workflow = {
      app,
      maxPaths,
      depth,
      steps: []
    };

    // Step 1: Analyze app for critical paths
    logger.info(`Step 1: Analyzing ${app} for UI paths (depth: ${depth})...`);
    let pathsResult;
    try {
      pathsResult = await req.mcpManager.callDockerMcp(
        'playwrightAnalyzer',
        '/analyze',
        { app, depth, model }
      );

      workflow.steps.push({
        step: 1,
        name: 'analyze',
        status: 'success',
        pathsFound: pathsResult.totalPaths,
        duration: Date.now() - startTime
      });

      logger.info(`✓ Found ${pathsResult.totalPaths} paths`);
    } catch (error) {
      logger.error('Analyzer failed:', error.message);
      workflow.steps.push({
        step: 1,
        name: 'analyze',
        status: 'failed',
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Path analysis failed',
        details: error.message,
        workflow
      });
    }

    if (pathsResult.totalPaths === 0) {
      logger.warn('No paths found to test');
      return res.json({
        success: true,
        message: 'No UI paths found to test',
        workflow
      });
    }

    // Step 2: Prioritize top N paths
    logger.info(`Step 2: Prioritizing top ${maxPaths} paths...`);
    let prioritizedPaths;
    try {
      const prioritizeStart = Date.now();
      const prioritizationResult = await req.mcpManager.callDockerMcp(
        'playwrightAnalyzer',
        '/prioritize',
        { app, maxResults: maxPaths, model }
      );

      prioritizedPaths = prioritizationResult.paths;

      workflow.steps.push({
        step: 2,
        name: 'prioritize',
        status: 'success',
        pathsPrioritized: prioritizedPaths.length,
        reasoning: prioritizationResult.reasoning,
        duration: Date.now() - prioritizeStart
      });

      logger.info(`✓ Prioritized ${prioritizedPaths.length} paths`);
    } catch (error) {
      logger.error('Prioritization failed:', error.message);
      workflow.steps.push({
        step: 2,
        name: 'prioritize',
        status: 'failed',
        error: error.message
      });

      // Fall back to using all paths (up to maxPaths)
      prioritizedPaths = pathsResult.paths.slice(0, maxPaths);
      logger.warn(`Using first ${prioritizedPaths.length} paths without prioritization`);
    }

    // Step 3: Generate tests for prioritized paths
    logger.info(`Step 3: Generating Playwright tests for ${prioritizedPaths.length} paths...`);
    let testsResult;
    try {
      const generateStart = Date.now();
      testsResult = await req.mcpManager.callDockerMcp(
        'playwrightGenerator',
        '/generate',
        {
          app,
          paths: prioritizedPaths,
          includePageObjects: true,
          includeFixtures: true,
          model
        }
      );

      workflow.steps.push({
        step: 3,
        name: 'generate',
        status: 'success',
        testsGenerated: testsResult.generated,
        filesCreated: testsResult.files.length,
        duration: Date.now() - generateStart
      });

      logger.info(`✓ Generated ${testsResult.generated} test files`);
    } catch (error) {
      logger.error('Test generation failed:', error.message);
      workflow.steps.push({
        step: 3,
        name: 'generate',
        status: 'failed',
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Test generation failed',
        details: error.message,
        workflow
      });
    }

    // Success response
    const totalDuration = Date.now() - startTime;

    logger.info(`Full automation complete in ${totalDuration}ms`);

    res.json({
      success: true,
      app,
      pathsAnalyzed: pathsResult.totalPaths,
      pathsPrioritized: prioritizedPaths.length,
      testsGenerated: testsResult.generated,
      files: testsResult.files,
      defaultPath: testsResult.defaultPath,
      workflow,
      totalDuration
    });
  } catch (error) {
    logger.error('Full automation workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Heal Tests Workflow
 * POST /api/playwright/heal-tests
 *
 * Analyzes test failures and generates fixes
 */
router.post('/heal-tests', async (req, res) => {
  try {
    const {
      testFile,
      testCode,
      errorLog,
      screenshot,
      model
    } = req.body;

    if (!testFile || !testCode || !errorLog) {
      return res.status(400).json({
        error: 'testFile, testCode, and errorLog are required',
        usage: 'POST /api/playwright/heal-tests with body: { testFile: "test.spec.ts", testCode: "...", errorLog: "..." }'
      });
    }

    logger.info(`Starting heal workflow for ${testFile}`);

    const startTime = Date.now();
    const workflow = {
      testFile,
      steps: []
    };

    // Step 1: Analyze failure
    logger.info(`Step 1: Analyzing test failure...`);
    let analysis;
    try {
      const analysisResult = await req.mcpManager.callDockerMcp(
        'playwrightHealer',
        '/analyze-failures',
        { testFile, errorLog, screenshot, model }
      );

      analysis = analysisResult.failureAnalysis;

      workflow.steps.push({
        step: 1,
        name: 'analyze-failure',
        status: 'success',
        failureType: analysis.failureType,
        confidence: analysis.confidence,
        duration: Date.now() - startTime
      });

      logger.info(`✓ Failure analyzed: ${analysis.failureType} (${analysis.confidence} confidence)`);
    } catch (error) {
      logger.error('Failure analysis failed:', error.message);
      workflow.steps.push({
        step: 1,
        name: 'analyze-failure',
        status: 'failed',
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Failure analysis failed',
        details: error.message,
        workflow
      });
    }

    // Step 2: Generate fix
    logger.info(`Step 2: Generating fix for ${analysis.failureType}...`);
    let healResult;
    try {
      const healStart = Date.now();
      healResult = await req.mcpManager.callDockerMcp(
        'playwrightHealer',
        '/heal',
        { testFile, testCode, errorLog, model }
      );

      workflow.steps.push({
        step: 2,
        name: 'generate-fix',
        status: 'success',
        changesCount: healResult.changes.length,
        confidence: healResult.confidence,
        duration: Date.now() - healStart
      });

      logger.info(`✓ Generated fix with ${healResult.changes.length} changes`);
    } catch (error) {
      logger.error('Fix generation failed:', error.message);
      workflow.steps.push({
        step: 2,
        name: 'generate-fix',
        status: 'failed',
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Fix generation failed',
        details: error.message,
        workflow,
        analysis // Include analysis even if fix failed
      });
    }

    // Success response
    const totalDuration = Date.now() - startTime;

    logger.info(`Heal workflow complete in ${totalDuration}ms`);

    res.json({
      success: true,
      testFile,
      analysis: {
        failureType: analysis.failureType,
        rootCause: analysis.rootCause,
        confidence: analysis.confidence,
        isFlaky: analysis.isFlaky,
        suggestedFix: analysis.suggestedFix
      },
      fix: {
        fixedCode: healResult.fixedCode,
        changes: healResult.changes,
        confidence: healResult.confidence,
        additionalNotes: healResult.additionalNotes,
        testabilityImprovements: healResult.testabilityImprovements
      },
      workflow,
      totalDuration
    });
  } catch (error) {
    logger.error('Heal workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Detect Flaky Tests
 * POST /api/playwright/detect-flaky
 *
 * Analyze test results to identify flaky tests
 */
router.post('/detect-flaky', async (req, res) => {
  try {
    const { testResults, model } = req.body;

    if (!testResults || !Array.isArray(testResults)) {
      return res.status(400).json({
        error: 'testResults array is required',
        usage: 'POST /api/playwright/detect-flaky with body: { testResults: [{ testName, testFile, status, ... }] }'
      });
    }

    logger.info(`Detecting flaky tests from ${testResults.length} results`);

    const detectionResult = await req.mcpManager.callDockerMcp(
      'playwrightHealer',
      '/detect-flaky',
      { testResults, model }
    );

    logger.info(`Found ${detectionResult.flakyTests.length} flaky tests`);

    res.json({
      success: true,
      flakyTests: detectionResult.flakyTests,
      summary: detectionResult.summary
    });
  } catch (error) {
    logger.error('Flaky detection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
