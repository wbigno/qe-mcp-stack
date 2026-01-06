import express from 'express';
import { logger } from '../utils/logger.js';
import { readFile } from 'fs/promises';

const router = express.Router();

// ============================================
// FILE PATH RESOLUTION HELPER
// ============================================

/**
 * Convert app name and file path to actual filesystem path
 * UPDATED: Now accepts BOTH relative AND absolute paths!
 * 
 * Handles:
 * 1. Absolute Docker paths: /mnt/apps/patient-portal/PatientPortal/Services/File.cs
 * 2. Relative app paths: /App1/Services/File.cs
 */
function resolveFilePath(app, file) {
  // ✅ If already an absolute Docker path, use it directly!
  if (file && file.startsWith('/mnt/apps/')) {
    logger.info(`[Path Resolution] ✅ Using absolute path directly: ${file}`);
    return file;
  }
  
  // Otherwise, convert relative app path to absolute Docker path
  const appPathMap = {
    'App1': 'patient-portal/PatientPortal',
    'App2': 'app2/App2',
    'App3': 'app3/App3',
    'App4': 'app4/App4'
  };
  
  const appPath = appPathMap[app];
  if (!appPath) {
    throw new Error(`Unknown app: ${app}. Valid apps: ${Object.keys(appPathMap).join(', ')}`);
  }
  
  // Remove leading slash and /AppN/ prefix if present
  let cleanPath = file.replace(/^\//, '').replace(/^App\d+\//, '');
  
  // Build full path
  const fullPath = `/mnt/apps/${appPath}/${cleanPath}`;
  
  logger.info(`[Path Resolution] 🔄 Converted: ${app} + ${file} → ${fullPath}`);
  return fullPath;
}

// ============================================
// ENHANCED TEST GENERATION WITH FILE SELECTION
// ============================================

/**
 * Analyze a file to determine what types of tests it needs
 * POST /api/tests/analyze-file
 */
router.post('/analyze-file', async (req, res) => {
  try {
    const { app, file } = req.body;

    if (!app || !file) {
      return res.status(400).json({ error: 'App and file are required' });
    }

    logger.info(`[Test Analysis] Analyzing ${file} for test needs`);

    // Get code structure for this specific file
    const codeAnalysis = await req.mcpManager.callDockerMcp(
      'dotnetCodeAnalyzer',
      '/analyze',
      { app }
    );

    // Get coverage for this file
    const coverage = await req.mcpManager.callDockerMcp(
      'dotnetCoverageAnalyzer',
      '/analyze',
      { app }
    );

    // Filter to just this file
    const fileName = file.split('/').pop();
    
    // Handle nested analysis structure
    const analysisData = codeAnalysis.analysis || codeAnalysis;
    const fileClasses = (analysisData.classes || []).filter(c => 
      c.file && c.file.includes(fileName)
    );
    const fileMethods = (analysisData.methods || []).filter(m => 
      m.file && m.file.includes(fileName)
    );

    logger.info(`[Test Analysis] Found ${fileClasses.length} classes, ${fileMethods.length} methods in ${fileName}`);

    // Determine test needs
    const isController = fileName.includes('Controller');
    const isService = fileName.includes('Service');
    const isTestFile = fileName.includes('Test');

    // Check for API endpoints (Controllers)
    const hasApiEndpoints = fileClasses.some(c => 
      c.methods?.some(m => m.attributes?.some(a => 
        a.includes('HttpGet') || a.includes('HttpPost') || 
        a.includes('HttpPut') || a.includes('HttpDelete')
      ))
    );

    // Check for integration points
    const hasIntegrationPoints = fileMethods.some(m => 
      m.calls?.some(call => 
        call.includes('Epic') || call.includes('Financial') || 
        call.includes('HttpClient') || call.includes('Repository')
      )
    );

    // Get uncovered methods
    const coverageData = coverage.coverage || coverage;
    const untestedMethods = (coverageData.methods || [])
      .filter(m => m.file && m.file.includes(fileName) && m.coverage === 0);
    const partialMethods = (coverageData.methods || [])
      .filter(m => m.file && m.file.includes(fileName) && m.coverage > 0 && m.coverage < 80);

    const result = {
      success: true,
      file: fileName,
      fullPath: file,
      analysis: {
        needsUnitTests: !isTestFile && (untestedMethods.length > 0 || partialMethods.length > 0),
        needsIntegrationTests: hasApiEndpoints || hasIntegrationPoints,
        isController,
        isService,
        isTestFile,
        hasApiEndpoints,
        hasIntegrationPoints,
        classCount: fileClasses.length,
        methodCount: fileMethods.length,
        untestedMethods: untestedMethods.length,
        partialCoverage: partialMethods.length,
        classes: fileClasses.map(c => c.name),
        methods: fileMethods.map(m => ({
          name: m.name,
          className: m.className,
          complexity: m.complexity,
          coverage: coverageData.methods?.find(cm => cm.name === m.name)?.coverage || 0
        })),
        endpoints: hasApiEndpoints ? extractEndpoints(fileClasses) : [],
        integrations: hasIntegrationPoints ? extractIntegrations(fileMethods) : []
      }
    };

    logger.info(`[Test Analysis] Result: needs unit=${result.analysis.needsUnitTests}, needs integration=${result.analysis.needsIntegrationTests}`);

    res.json(result);

  } catch (error) {
    logger.error('[Test Analysis] Error:', error);
    res.status(500).json({ 
      error: 'File analysis failed',
      message: error.message 
    });
  }
});

/**
 * Generate unit tests for a specific file
 * POST /api/tests/generate-for-file
 */
router.post('/generate-for-file', async (req, res) => {
  try {
    const { app, file, className, includeNegativeTests = true, includeMocks = true, model } = req.body;

    if (!app || !className) {
      return res.status(400).json({ error: 'App and className are required' });
    }

    logger.info(`[Test Gen] Generating tests for ${className} in ${file || 'unknown file'}`);
    logger.info(`[Test Gen] App: ${app}`);

    // ✅ Resolve and read the source file
    const resolvedPath = resolveFilePath(app, file);
    let sourceCode;
    
    try {
      sourceCode = await readFile(resolvedPath, 'utf-8');
      logger.info(`[Test Gen] ✅ Successfully read ${resolvedPath} (${sourceCode.length} bytes)`);
    } catch (error) {
      logger.error(`[Test Gen] ❌ Failed to read file: ${error.message}`);
      return res.status(404).json({ 
        error: 'Source file not found',
        message: `Could not read ${resolvedPath}. File does not exist or is not accessible.`,
        resolvedPath,
        originalFile: file,
        app
      });
    }

    // Call unit-test-generator STDIO MCP with source code
    logger.info(`[Test Gen] 🚀 Calling dotnet-unit-test-generator for ${className}`);
    
    const unitTests = await req.mcpManager.callStdioMcp(
      'dotnet-unit-test-generator',
      {
        data: {
          app,
          className,
          sourceCode,
          includeNegativeTests,
          includeMocks,
          model
        }
      }
    );

    logger.info(`[Test Gen] ✅ Successfully generated tests for ${className}`);

    res.json({
      success: true,
      result: unitTests.result
    });

  } catch (error) {
    logger.error('[Test Gen] ❌ Error:', error);
    res.status(500).json({ 
      error: 'Test generation failed',
      message: error.message 
    });
  }
});

/**
 * Generate integration tests for a specific endpoint
 * POST /api/tests/generate-integration-for-file
 */
router.post('/generate-integration-for-file', async (req, res) => {
  try {
    const { app, file, apiEndpoint, scenario, includeAuth = true, includeDatabase = true, model } = req.body;

    if (!app || !apiEndpoint) {
      return res.status(400).json({ error: 'App and apiEndpoint are required' });
    }

    logger.info(`[Test Gen] Generating integration tests for ${apiEndpoint}`);

    // Call integration-test-generator STDIO MCP
    const integrationTests = await req.mcpManager.callStdioMcp(
      'dotnet-integration-test-generator',
      {
        data: {
          app,
          apiEndpoint,
          scenario: scenario || `Integration tests for ${apiEndpoint}`,
          includeAuth,
          includeDatabase,
          model
        }
      }
    );

    logger.info(`[Test Gen] ✅ Successfully generated integration tests for ${apiEndpoint}`);

    res.json({
      success: true,
      result: integrationTests.result
    });

  } catch (error) {
    logger.error('[Test Gen] ❌ Integration error:', error);
    res.status(500).json({ 
      error: 'Integration test generation failed',
      message: error.message 
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractEndpoints(classes) {
  const endpoints = [];
  
  classes.forEach(cls => {
    const routePrefix = cls.attributes?.find(a => a.includes('Route'))
      ?.match(/Route\("([^"]+)"\)/)?.[1] || '/api';
    
    cls.methods?.forEach(method => {
      const httpMethod = method.attributes?.find(a => 
        a.includes('HttpGet') || a.includes('HttpPost') || 
        a.includes('HttpPut') || a.includes('HttpDelete')
      );
      
      if (httpMethod) {
        const verb = httpMethod.match(/Http(\w+)/)?.[1] || 'GET';
        const route = method.attributes?.find(a => a.includes('Route'))
          ?.match(/Route\("([^"]+)"\)/)?.[1] || '';
        
        endpoints.push({
          method: verb.toUpperCase(),
          path: `${routePrefix}${route ? '/' + route : ''}`,
          methodName: method.name,
          className: cls.name
        });
      }
    });
  });
  
  return endpoints;
}

function extractIntegrations(methods) {
  const integrations = [];
  
  methods.forEach(method => {
    if (method.calls) {
      method.calls.forEach(call => {
        if (call.includes('Epic') || call.includes('Financial') || 
            call.includes('HttpClient') || call.includes('Repository')) {
          integrations.push({
            type: detectIntegrationType(call),
            call,
            method: method.name
          });
        }
      });
    }
  });
  
  return integrations;
}

function detectIntegrationType(call) {
  if (call.includes('Epic')) return 'Epic API';
  if (call.includes('Financial')) return 'Financial System';
  if (call.includes('HttpClient')) return 'External HTTP';
  if (call.includes('Repository')) return 'Database';
  return 'Unknown';
}

// ============================================
// LEGACY ENDPOINTS (Keep for backward compatibility)
// ============================================

router.post('/generate-unit-tests', async (req, res) => {
  try {
    const { app, className, sourceCode } = req.body;

    if (!app || !className) {
      return res.status(400).json({ error: 'App and className are required' });
    }

    logger.info(`[Legacy] Generating unit tests for ${className}`);

    const unitTests = await req.mcpManager.callStdioMcp(
      'dotnet-unit-test-generator',
      { 
        data: {
          app,
          className,
          sourceCode,
          includeNegativeTests: true,
          includeMocks: true
        }
      }
    );

    res.json(unitTests);
  } catch (error) {
    logger.error('[Legacy] Unit test generation error:', error);
    res.status(500).json({ 
      error: 'Unit test generation failed',
      message: error.message 
    });
  }
});

router.post('/generate-integration-tests', async (req, res) => {
  try {
    const { app, apiEndpoint, scenario } = req.body;

    if (!app || !apiEndpoint) {
      return res.status(400).json({ error: 'App and apiEndpoint are required' });
    }

    logger.info(`[Legacy] Generating integration tests for ${apiEndpoint}`);

    const integrationTests = await req.mcpManager.callStdioMcp(
      'dotnet-integration-test-generator',
      { 
        data: {
          app,
          apiEndpoint,
          scenario,
          includeAuth: true,
          includeDatabase: true
        }
      }
    );

    res.json(integrationTests);
  } catch (error) {
    logger.error('[Legacy] Integration test generation error:', error);
    res.status(500).json({ 
      error: 'Integration test generation failed',
      message: error.message 
    });
  }
});

export default router;
