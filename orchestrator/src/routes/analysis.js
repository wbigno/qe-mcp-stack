import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Analyze code coverage for an application
router.post('/coverage', async (req, res) => {
  try {
    const { app, detailed = false } = req.body;

    if (!app) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    logger.info(`Starting coverage analysis for ${app}`);

    // Call Code Analyzer MCP
    const codeStructure = await req.mcpManager.callDockerMcp(
      'dotnetCodeAnalyzer',
      '/analyze',
      { app, includeTests: true }
    );

    // Call Coverage Analyzer MCP
    const coverageReport = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app, codeStructure, detailed }
    );

    // Emit real-time update
    req.io.to('analysis').emit('coverage-complete', { app, coverageReport });

    res.json({
      success: true,
      app,
      timestamp: new Date().toISOString(),
      data: {
        structure: codeStructure,
        coverage: coverageReport
      }
    });
  } catch (error) {
    logger.error('Coverage analysis error:', error);
    res.status(500).json({ 
      error: 'Coverage analysis failed',
      message: error.message 
    });
  }
});

// Analyze code structure for all applications
router.post('/code-scan', async (req, res) => {
  try {
    const { apps = ['App1', 'App2', 'App3', 'App4'] } = req.body;

    logger.info(`Starting code scan for applications: ${apps.join(', ')}`);

    const results = {};

    for (const app of apps) {
      try {
        const analysis = await req.mcpManager.callDockerMcp(
          'dotnetCodeAnalyzer',
          '/analyze',
          { 
            app,
            includeIntegrations: true,
            findEpicReferences: true,
            findFinancialReferences: true
          }
        );
        results[app] = analysis;
        
        // Real-time update
        req.io.to('analysis').emit('app-scanned', { app, analysis });
      } catch (error) {
        logger.error(`Error scanning ${app}:`, error);
        results[app] = { error: error.message };
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    logger.error('Code scan error:', error);
    res.status(500).json({ 
      error: 'Code scan failed',
      message: error.message 
    });
  }
});

// Get test gaps - combines code analysis and coverage
router.post('/test-gaps', async (req, res) => {
  try {
    const { app } = req.body;

    if (!app) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    logger.info(`Identifying test gaps for ${app}`);

    // Get code structure
    const codeStructure = await req.mcpManager.callDockerMcp(
      'dotnetCodeAnalyzer',
      '/analyze',
      { app }
    );

    // Get coverage data
    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app, codeStructure }
    );

    // Identify gaps (methods without tests, missing negative tests, etc.)
    const coverageData = coverage.coverage || coverage;
    const gaps = {
      untestedMethods: (coverageData.methods || []).filter(m => m.coverage === 0),
      partialCoverage: (coverageData.methods || []).filter(m => m.coverage > 0 && m.coverage < 80),
      missingNegativeTests: coverageData.negativeTestGaps || [],
      criticalPaths: coverageData.criticalUntested || []
    };

    res.json({
      success: true,
      app,
      timestamp: new Date().toISOString(),
      gaps,
      summary: {
        totalMethods: (coverageData.methods || []).length,
        untestedCount: gaps.untestedMethods.length,
        coveragePercentage: coverageData.overallPercentage || 0
      }
    });
  } catch (error) {
    logger.error('Test gaps analysis error:', error);
    res.status(500).json({ 
      error: 'Test gaps analysis failed',
      message: error.message 
    });
  }
});

export default router;
