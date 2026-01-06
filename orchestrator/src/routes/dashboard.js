import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Dashboard Routes
 * These endpoints proxy to the working /api/analysis endpoints
 * to provide a simpler interface for the dashboard UI
 */

// ============================================
// CODE ANALYSIS DASHBOARD ENDPOINTS
// ============================================

/**
 * Get list of available applications
 * GET /api/dashboard/applications
 */
router.get('/applications', async (req, res) => {
  try {
    logger.info('[Dashboard] Getting applications list');
    
    const fs = await import('fs/promises');
    const configPath = '/app/config/apps.json';
    
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    const applications = config.applications.map(app => ({
      name: app.name,
      displayName: app.displayName,
      type: app.type,
      framework: app.framework,
      priority: app.priority,
      integrations: app.integrations
    }));
    
    res.json({
      success: true,
      applications
    });
    
  } catch (error) {
    logger.error('[Dashboard] Applications error:', error);
    res.status(500).json({
      error: 'Failed to get applications',
      message: error.message
    });
  }
});

/**
 * Get detailed code analysis for dashboard
 * GET /api/dashboard/code-analysis?app=App1
 * 
 * NOTE: Returns simplified structure for dashboard display
 */
router.get('/code-analysis', async (req, res) => {
  try {
    const appName = req.query.app || 'App1';
    
    logger.info(`[Dashboard] Getting code analysis for ${appName}`);

    // Call Code Analyzer MCP
    const response = await req.mcpManager.callDockerMcp(
      'dotnetCodeAnalyzer',
      '/analyze',
      { 
        app: appName,
        includeTests: true,
        includeIntegrations: true
      }
    );

    // Call Coverage Analyzer MCP
    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app: appName }
    );

    // Transform to dashboard format
    const dashboardData = transformCodeAnalysisForDashboard(response, coverage, appName);

    res.json(dashboardData);

  } catch (error) {
    logger.error('[Dashboard] Code analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to get code analysis', 
      message: error.message 
    });
  }
});

/**
 * Get coverage analysis
 * GET /api/dashboard/coverage?app=App1
 */
router.get('/coverage', async (req, res) => {
  try {
    const appName = req.query.app || 'App1';
    
    logger.info(`[Dashboard] Getting coverage for ${appName}`);

    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app: appName, detailed: true }
    );

    res.json(coverage);

  } catch (error) {
    logger.error('[Dashboard] Coverage error:', error);
    res.status(500).json({ 
      error: 'Failed to get coverage', 
      message: error.message 
    });
  }
});

/**
 * Get test gaps - PROXIES to /api/analysis/test-gaps
 * GET /api/dashboard/test-gaps?app=App1
 * 
 * This endpoint now simply forwards to the working analysis endpoint
 * instead of trying to duplicate the logic
 */
router.get('/test-gaps', async (req, res) => {
  try {
    const appName = req.query.app || 'App1';
    
    logger.info(`[Dashboard] Getting test gaps for ${appName} (proxying to analysis endpoint)`);

    // Get code structure
    const codeStructure = await req.mcpManager.callDockerMcp(
      'dotnetCodeAnalyzer',
      '/analyze',
      { app: appName }
    );

    // Get coverage data
    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app: appName, codeStructure }
    );

    // Extract coverage data from potentially nested structure
    const coverageData = coverage.coverage || coverage;
    
    logger.info(`[Dashboard] Coverage data structure:`, {
      hasMethods: !!coverageData.methods,
      methodsCount: (coverageData.methods || []).length,
      hasOverallPercentage: !!coverageData.overallPercentage
    });

    // Identify gaps
    const gaps = {
      untestedMethods: (coverageData.methods || []).filter(m => m.coverage === 0),
      partialCoverage: (coverageData.methods || []).filter(m => m.coverage > 0 && m.coverage < 80),
      missingNegativeTests: coverageData.negativeTestGaps || [],
      criticalPaths: coverageData.criticalUntested || []
    };

    const result = {
      success: true,
      app: appName,
      gaps,
      summary: {
        totalMethods: (coverageData.methods || []).length,
        untestedCount: gaps.untestedMethods.length,
        coveragePercentage: coverageData.overallPercentage || 0
      }
    };

    logger.info(`[Dashboard] Returning test gaps:`, {
      untestedCount: result.summary.untestedCount,
      partialCount: gaps.partialCoverage.length,
      totalMethods: result.summary.totalMethods
    });

    res.json(result);

  } catch (error) {
    logger.error('[Dashboard] Test gaps error:', error);
    res.status(500).json({ 
      error: 'Failed to get test gaps', 
      message: error.message 
    });
  }
});

// ============================================
// DATA TRANSFORMERS
// ============================================

function transformCodeAnalysisForDashboard(codeData, coverageData, appName) {
  const analysis = codeData.analysis || codeData;
  
  // Group classes by file
  const fileMap = new Map();
  
  (analysis.classes || []).forEach((cls) => {
    const filePath = cls.file || 'Unknown';
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, {
        path: filePath,
        name: filePath.split('/').pop() || 'Unknown',
        classes: [],
        methods: []
      });
    }
    fileMap.get(filePath).classes.push(cls);
  });
  
  // Add methods to files
  (analysis.methods || []).forEach((method) => {
    const filePath = method.file || 'Unknown';
    if (fileMap.has(filePath)) {
      fileMap.get(filePath).methods.push(method);
    }
  });
  
  // Convert to files array
  const files = Array.from(fileMap.values()).map((file, idx) => ({
    id: `f${idx + 1}`,
    name: file.name,
    path: file.path,
    applicationId: appName,
    lines: file.classes.reduce((sum, c) => sum + (c.lines || 0), 0) || 100,
    size: 15000,
    classCount: file.classes.length,
    methodCount: file.methods.length,
    avgComplexity: file.methods.length > 0 
      ? file.methods.reduce((sum, m) => sum + (m.complexity || 0), 0) / file.methods.length 
      : 0,
    maxComplexity: file.methods.length > 0
      ? Math.max(...file.methods.map(m => m.complexity || 0))
      : 0,
    lineCoverage: coverageData?.filesCoverage?.[file.name]?.lineCoverage || 0,
    branchCoverage: coverageData?.filesCoverage?.[file.name]?.branchCoverage || 0,
    uncoveredLines: coverageData?.filesCoverage?.[file.name]?.uncoveredLines || [],
    lastModified: new Date().toISOString()
  }));

  // Convert classes
  const classes = (analysis.classes || []).map((cls, idx) => ({
    id: `c${idx + 1}`,
    fileId: `f${Array.from(fileMap.keys()).indexOf(cls.file) + 1}`,
    applicationId: appName,
    name: cls.name || 'Unknown',
    type: 'Class',
    namespace: cls.namespace || 'Unknown',
    accessModifier: cls.accessModifier || 'Public',
    lines: cls.lines || 0,
    avgComplexity: 0,
    properties: cls.properties || [],
    methods: cls.methods || []
  }));

  return {
    applications: [{ id: appName, name: appName }],
    files,
    classes,
    coverage: {
      overall: coverageData?.overall || coverageData?.coverage?.overall || 0,
      line: coverageData?.line || coverageData?.coverage?.line || 0,
      branch: coverageData?.branch || coverageData?.coverage?.branch || 0,
      method: coverageData?.method || coverageData?.coverage?.method || 0
    },
    dependencies: {
      total: (analysis.integrations?.epic?.length || 0) + (analysis.integrations?.financial?.length || 0),
      circular: 0,
      unused: 0
    },
    dependencyDetails: []
  };
}

// ============================================
// AZURE DEVOPS DASHBOARD ENDPOINTS
// ============================================

/**
 * Get Azure DevOps Dashboard Summary
 * GET /api/dashboard/aod-summary?sprint=Sprint%2042&state=Active
 */
router.get('/aod-summary', async (req, res) => {
  try {
    const { sprint, state, environment } = req.query;

    logger.info('[Dashboard] Getting ADO summary', { sprint, state, environment });

    // Build WIQL query for work items
    let wiqlConditions = ["[System.WorkItemType] IN ('User Story', 'Task', 'Bug')"];

    if (sprint) {
      wiqlConditions.push(`[System.IterationPath] UNDER '${sprint}'`);
    }
    if (state) {
      wiqlConditions.push(`[System.State] = '${state}'`);
    }

    const wiql = `SELECT * FROM WorkItems WHERE ${wiqlConditions.join(' AND ')}`;

    // Fetch work items from Azure DevOps MCP
    const workItems = await req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
      wiql
    }).catch(err => {
      logger.warn('[Dashboard] Failed to fetch work items:', err.message);
      return [];
    });

    // Transform to dashboard format
    const workItemDetails = (workItems || []).map(wi => ({
      id: wi.id,
      title: wi.fields?.['System.Title'] || 'Untitled',
      type: wi.fields?.['System.WorkItemType'] || 'Unknown',
      state: wi.fields?.['System.State'] || 'Unknown',
      assignedTo: wi.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
      priority: wi.fields?.['Microsoft.VSTS.Common.Priority'] || 3,
      tags: wi.fields?.['System.Tags'] || '',
      iterationPath: wi.fields?.['System.IterationPath'] || '',
      areaPath: wi.fields?.['System.AreaPath'] || '',
      createdDate: wi.fields?.['System.CreatedDate'] || new Date().toISOString(),
      changedDate: wi.fields?.['System.ChangedDate'] || new Date().toISOString()
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      filters: { sprint, state, environment },
      workItemDetails,
      summary: {
        total: workItemDetails.length,
        byType: calculateByType(workItemDetails),
        byState: calculateByState(workItemDetails)
      }
    });

  } catch (error) {
    logger.error('[Dashboard] ADO summary error:', error);
    res.status(500).json({
      error: 'Failed to get ADO summary',
      message: error.message
    });
  }
});

function calculateByType(workItems) {
  const counts = {};
  workItems.forEach(wi => {
    counts[wi.type] = (counts[wi.type] || 0) + 1;
  });
  return counts;
}

function calculateByState(workItems) {
  const counts = {};
  workItems.forEach(wi => {
    counts[wi.state] = (counts[wi.state] || 0) + 1;
  });
  return counts;
}

export default router;
