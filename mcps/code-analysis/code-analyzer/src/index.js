import express from 'express';
import { scanDirectory, analyzeCSharpFile } from './services/scanner.js';
import { loadAppsConfig } from './utils/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Load apps configuration
const appsConfig = loadAppsConfig();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'code-analyzer-mcp',
    timestamp: new Date().toISOString()
  });
});

// Analyze application code
app.post('/analyze', async (req, res) => {
  try {
    const { 
      app: appName, 
      includeTests = false,
      includeIntegrations = false,
      findEpicReferences = false,
      findFinancialReferences = false
    } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    // Get app configuration
    const appConfig = appsConfig.applications.find(a => a.name === appName);
    if (!appConfig) {
      return res.status(404).json({ error: `Application ${appName} not found in configuration` });
    }

    console.log(`Analyzing ${appName} at ${appConfig.path}`);

    // Scan directory for C# files
    const files = await scanDirectory(
      appConfig.path,
      appConfig.includePatterns,
      appConfig.excludePaths
    );

    console.log(`Found ${files.length} C# files`);

    // Analyze each file
    const analysis = {
      app: appName,
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      classes: [],
      methods: [],
      integrations: {
        epic: [],
        financial: []
      },
      tests: [],
      summary: {}
    };

    for (const file of files) {
      try {
        const fileAnalysis = await analyzeCSharpFile(file, {
          includeTests,
          findEpicReferences,
          findFinancialReferences
        });

        analysis.classes.push(...fileAnalysis.classes);
        analysis.methods.push(...fileAnalysis.methods);

        if (findEpicReferences && fileAnalysis.epicReferences.length > 0) {
          analysis.integrations.epic.push({
            file,
            references: fileAnalysis.epicReferences
          });
        }

        if (findFinancialReferences && fileAnalysis.financialReferences.length > 0) {
          analysis.integrations.financial.push({
            file,
            references: fileAnalysis.financialReferences
          });
        }

        if (includeTests && fileAnalysis.isTestFile) {
          analysis.tests.push({
            file,
            testMethods: fileAnalysis.testMethods
          });
        }
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error.message);
      }
    }

    // Generate summary
    analysis.summary = {
      totalClasses: analysis.classes.length,
      totalMethods: analysis.methods.length,
      totalTests: analysis.tests.reduce((sum, t) => sum + t.testMethods.length, 0),
      epicIntegrationPoints: analysis.integrations.epic.length,
      financialIntegrationPoints: analysis.integrations.financial.length,
      averageMethodsPerClass: Math.round(analysis.methods.length / analysis.classes.length) || 0
    };

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message 
    });
  }
});

// Get list of available applications
app.get('/applications', (req, res) => {
  res.json({
    success: true,
    applications: appsConfig.applications.map(app => ({
      name: app.name,
      displayName: app.displayName,
      framework: app.framework,
      integrations: app.integrations
    }))
  });
});

app.listen(PORT, () => {
  console.log(`Code Analyzer MCP running on port ${PORT}`);
  console.log(`Monitoring ${appsConfig.applications.length} applications`);
});
