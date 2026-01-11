import express from 'express';
import { MCPToolRegistry } from './mcpToolRegistry.js';
import { scanDirectory, analyzeCSharpFile } from './services/scanner.js';
import { loadAppsConfig } from './utils/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const appsConfig = loadAppsConfig();
const registry = new MCPToolRegistry();

// ============================================
// REGISTER MCP TOOLS
// ============================================

// Tool 1: Scan C# Code
registry.registerTool(
  'scan_csharp_code',
  'Scans .NET C# code to identify classes, methods, Epic/Financial integration points, and code structure',
  {
    type: 'object',
    properties: {
      app: {
        type: 'string',
        description: 'Application name (App1, App2, App3, or App4)',
        enum: ['App1', 'App2', 'App3', 'App4']
      },
      includeTests: {
        type: 'boolean',
        description: 'Include test files in scan',
        default: false
      },
      findEpicReferences: {
        type: 'boolean',
        description: 'Find Epic API integration points',
        default: true
      },
      findFinancialReferences: {
        type: 'boolean',
        description: 'Find Financial system integration points',
        default: true
      }
    },
    required: ['app']
  },
  async (args) => {
    const { app: appName, includeTests, findEpicReferences, findFinancialReferences } = args;
    
    const appConfig = appsConfig.applications.find(a => a.name === appName);
    if (!appConfig) {
      throw new Error(`Application ${appName} not found`);
    }

    console.log(`Scanning ${appName} at ${appConfig.path}`);

    const files = await scanDirectory(
      appConfig.path,
      appConfig.includePatterns,
      appConfig.excludePaths
    );

    const analysis = {
      app: appName,
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      classes: [],
      methods: [],
      integrations: { epic: [], financial: [] },
      tests: []
    };

    for (const file of files) {
      const fileAnalysis = await analyzeCSharpFile(file, {
        includeTests,
        findEpicReferences,
        findFinancialReferences
      });

      analysis.classes.push(...fileAnalysis.classes);
      analysis.methods.push(...fileAnalysis.methods);

      if (fileAnalysis.epicReferences.length > 0) {
        analysis.integrations.epic.push({ file, references: fileAnalysis.epicReferences });
      }

      if (fileAnalysis.financialReferences.length > 0) {
        analysis.integrations.financial.push({ file, references: fileAnalysis.financialReferences });
      }

      if (fileAnalysis.isTestFile) {
        analysis.tests.push({ file, testMethods: fileAnalysis.testMethods });
      }
    }

    analysis.summary = {
      totalClasses: analysis.classes.length,
      totalMethods: analysis.methods.length,
      totalTests: analysis.tests.reduce((sum, t) => sum + t.testMethods.length, 0),
      epicIntegrationPoints: analysis.integrations.epic.length,
      financialIntegrationPoints: analysis.integrations.financial.length
    };

    return analysis;
  }
);

// Tool 2: Get Application List
registry.registerTool(
  'list_applications',
  'Get list of available .NET applications that can be analyzed',
  {
    type: 'object',
    properties: {}
  },
  async () => {
    return {
      applications: appsConfig.applications.map(app => ({
        name: app.name,
        displayName: app.displayName,
        framework: app.framework,
        integrations: app.integrations,
        priority: app.priority
      }))
    };
  }
);

// Tool 3: Analyze Specific File
registry.registerTool(
  'analyze_specific_file',
  'Analyze a specific C# file for code structure and integration points',
  {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the C# file to analyze'
      },
      findEpicReferences: {
        type: 'boolean',
        default: true
      },
      findFinancialReferences: {
        type: 'boolean',
        default: true
      }
    },
    required: ['filePath']
  },
  async (args) => {
    const { filePath, findEpicReferences, findFinancialReferences } = args;
    
    return await analyzeCSharpFile(filePath, {
      includeTests: true,
      findEpicReferences,
      findFinancialReferences
    });
  }
);

// ============================================
// ADD MCP STANDARD ROUTES
// ============================================

registry.addRoutesToApp(app);

// ============================================
// TRADITIONAL ENDPOINTS (backward compatible)
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'code-analyzer-mcp',
    timestamp: new Date().toISOString(),
    toolsRegistered: registry.tools.size
  });
});

// Legacy endpoint for backward compatibility
app.post('/analyze', async (req, res) => {
  try {
    const result = await registry.callTool('scan_csharp_code', req.body);
    res.json({ success: true, analysis: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get applications (legacy)
app.get('/applications', async (req, res) => {
  try {
    const result = await registry.callTool('list_applications', {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Code Analyzer MCP running on port ${PORT}`);
  console.log(`Registered ${registry.tools.size} MCP tools:`);
  registry.tools.forEach((tool, name) => {
    console.log(`  - ${name}: ${tool.description}`);
  });
  console.log('\nMCP Endpoints:');
  console.log('  POST /mcp/tools/list - List available tools');
  console.log('  POST /mcp/tools/call - Call a tool');
  console.log('\nTraditional Endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  POST /analyze - Legacy analysis endpoint');
});
