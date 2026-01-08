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
    const { apps = ['App1'] } = req.body;

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

    // Extract only the methods array to reduce payload size
    const methods = codeStructure?.analysis?.methods || codeStructure?.methods || [];
    logger.info(`[Analysis] Sending ${methods.length} methods to coverage analyzer`);

    // DEBUG: Check if className is present
    if (methods.length > 0) {
      const sampleMethod = methods[0];
      logger.info(`[Analysis] Sample method keys: ${Object.keys(sampleMethod).join(', ')}`);
      logger.info(`[Analysis] Sample className: ${sampleMethod.className || 'MISSING'}`);
    }

    // Get coverage data - pass only methods array, not entire codeStructure
    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app, codeStructure: { methods } }
    );

    // Identify gaps (methods without tests, missing negative tests, etc.)
    const coverageData = coverage.coverage || coverage;
    const allMethods = coverageData.methods || [];

    // ✅ FIX: Methods with tests but missing negative tests should NOT be in untestedMethods
    const gaps = {
      untestedMethods: allMethods.filter(m =>
        !m.hasTests && (m.coverage === 0 || m.coverage === null)
      ),
      partialCoverage: allMethods.filter(m =>
        m.coverage !== null && m.coverage > 0 && m.coverage < 80
      ),
      missingNegativeTests: allMethods.filter(m =>
        m.hasTests && !m.hasNegativeTests
      ),
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

// ============================================
// RISK ANALYSIS
// ============================================

// Analyze risk for a story
router.post('/risk/analyze-story', async (req, res) => {
  try {
    const { app, story } = req.body;

    if (!app) {
      return res.status(400).json({ error: 'app parameter required' });
    }

    if (!story) {
      return res.status(400).json({ error: 'story parameter required' });
    }

    logger.info(`Analyzing risk for story ${story.id} in app ${app}`);

    const result = await req.mcpManager.callDockerMcp(
      'riskAnalyzer',
      '/analyze-risk',
      { app, story }
    );

    res.json(result);
  } catch (error) {
    logger.error('Risk analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Risk analysis failed',
      message: error.message
    });
  }
});

// ============================================
// INTEGRATION MAPPING
// ============================================

// Map integrations for an application
router.post('/integrations/map', async (req, res) => {
  try {
    const { app, integrationType, includeDiagram } = req.body;

    if (!app) {
      return res.status(400).json({ error: 'app parameter required' });
    }

    logger.info(`Mapping integrations for app ${app}, type: ${integrationType || 'all'}`);

    const result = await req.mcpManager.callDockerMcp(
      'integrationMapper',
      '/map-integrations',
      { app, integrationType, includeDiagram }
    );

    res.json(result);
  } catch (error) {
    logger.error('Integration mapping error:', error);
    res.status(500).json({
      success: false,
      error: 'Integration mapping failed',
      message: error.message
    });
  }
});

// ============================================
// BLAST RADIUS ANALYSIS
// ============================================

// Analyze blast radius for changed files
router.post('/blast-radius/analyze', async (req, res) => {
  try {
    const { app, changedFiles, analysisDepth } = req.body;

    if (!app) {
      return res.status(400).json({ error: 'app parameter required' });
    }

    if (!changedFiles || changedFiles.length === 0) {
      return res.status(400).json({ error: 'changedFiles array required' });
    }

    logger.info(`Analyzing blast radius for ${changedFiles.length} files in app ${app}`);

    const result = await req.mcpManager.callStdioMcp(
      'blast-radius-analyzer',
      {
        data: {
          app,
          changedFiles,
          analysisDepth: analysisDepth || 'moderate'
        }
      }
    );

    res.json(result);
  } catch (error) {
    logger.error('Blast radius analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Blast radius analysis failed',
      message: error.message
    });
  }
});

export default router;
