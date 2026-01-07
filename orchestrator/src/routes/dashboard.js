import express from 'express';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Config directory is volume-mounted at /app/config in Docker
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

// REMOVED: GET /test-gaps endpoint - DUPLICATE of POST /api/analysis/test-gaps
// Frontend uses POST /api/analysis/test-gaps instead
// Removed on 2026-01-07 during API consolidation

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

    // Fetch work items from Azure DevOps MCP (includes relations now)
    const workItems = await req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
      sprint
    }).catch(err => {
      logger.warn('[Dashboard] Failed to fetch work items:', err.message);
      return [];
    });

    // Extract parent IDs from work item relations
    const parentIds = new Set();
    logger.info(`[Dashboard] Checking ${(workItems || []).length} work items for parent relations`);

    (workItems || []).forEach(wi => {
      if (wi.relations) {
        logger.info(`[Dashboard] Work item ${wi.id} has ${wi.relations.length} relations`);
        wi.relations.forEach(relation => {
          logger.info(`[Dashboard] Relation type: ${relation.rel}`);
          // Look for parent relationships
          if (relation.rel === 'System.LinkTypes.Hierarchy-Reverse') {
            // Extract work item ID from URL (e.g., .../workItems/12345)
            const match = relation.url.match(/workItems\/(\d+)/);
            if (match) {
              parentIds.add(parseInt(match[1]));
              logger.info(`[Dashboard] Found parent ID: ${match[1]}`);
            }
          }
        });
      }
    });

    logger.info(`[Dashboard] Total unique parent IDs found: ${parentIds.size}`);

    // Fetch parent work items if any were found
    let parentWorkItems = [];
    if (parentIds.size > 0) {
      logger.info(`[Dashboard] Fetching ${parentIds.size} parent work items`);
      parentWorkItems = await req.mcpManager.callDockerMcp('azureDevOps', '/work-items/query', {
        workItemIds: Array.from(parentIds)
      }).catch(err => {
        logger.warn('[Dashboard] Failed to fetch parent work items:', err.message);
        return [];
      });
    }

    // Combine all work items (sprint items + their parents)
    const allWorkItems = [...(workItems || []), ...(parentWorkItems || [])];

    // No type filtering - include ALL work items (Issues, Bugs, Tasks, etc.)
    let filteredItems = allWorkItems;

    // Filter by state if specified
    if (state) {
      filteredItems = filteredItems.filter(wi => {
        return wi.fields?.['System.State'] === state;
      });
    }

    // Transform to dashboard format with parent ID
    const workItemDetails = filteredItems.map(wi => {
      // Extract parent ID from relations
      let parentId = null;
      if (wi.relations) {
        const parentRelation = wi.relations.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
        if (parentRelation) {
          const match = parentRelation.url.match(/workItems\/(\d+)/);
          if (match) {
            parentId = parseInt(match[1]);
          }
        }
      }

      return {
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
        changedDate: wi.fields?.['System.ChangedDate'] || new Date().toISOString(),
        description: wi.fields?.['System.Description'] || '',
        acceptanceCriteria: wi.fields?.['Microsoft.VSTS.Common.AcceptanceCriteria'] || '',
        reproSteps: wi.fields?.['Microsoft.VSTS.TCM.ReproSteps'] || '',
        parentId: parentId  // Include parent ID for hierarchical display
      };
    });

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

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * Get apps configuration for app selector dropdown
 * GET /api/dashboard/config/apps
 */
router.get('/config/apps', async (req, res) => {
  try {
    logger.info('[Dashboard] Getting apps configuration');

    const fs = await import('fs/promises');
    // Config directory is volume-mounted at /app/config in Docker
    const configPath = '/app/config/apps.json';

    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Transform applications array to format expected by AppSelector
    const apps = (config.applications || []).map(app => ({
      name: app.name,
      description: app.displayName || app.description || app.name,
      displayName: app.displayName || app.name,
      framework: app.framework,
      path: app.path
    }));

    res.json({ apps });

  } catch (error) {
    logger.error('[Dashboard] Config apps error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get apps configuration',
      message: error.message
    });
  }
});

export default router;
