import express from 'express';
import { DotNetAnalyzer } from '../shared/dotnet-analyzer.js';

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

const analyzer = new DotNetAnalyzer();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'risk-analyzer-mcp',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.post('/analyze-risk', async (req, res) => {
  try {
    const { app: appName } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`[risk-analyzer] Analyzing ${appName}...`);

    const appConfig = await analyzer.loadAppConfig(appName);
    const files = await analyzer.scanCSharpFiles(appConfig.path, false);

    console.log(`[risk-analyzer] Found ${files.length} files`);

    const parsedFiles = [];
    for (const file of files) {
      const parsed = await analyzer.parseFile(file.fullPath);
      if (parsed) parsedFiles.push(parsed);
    }

    // Main analysis logic
    const result = performAnalysis(parsedFiles, appConfig);

    res.json({
      success: true,
      app: appName,
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error(`[risk-analyzer] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

function performAnalysis(files, config) {
  // Risk = complexity + coverage + dependencies
  
  const analysis = {
    totalFiles: files.length,
    totalClasses: files.reduce((sum, f) => sum + f.classes.length, 0),
    findings: []
  };

  // Implement specific logic for risk-analyzer
  for (const file of files) {
    for (const cls of file.classes) {
      // Analysis logic here
      analysis.findings.push({
        class: cls.name,
        file: file.file,
        metrics: {
          methods: cls.methods.length,
          complexity: cls.methods.reduce((s, m) => s + m.complexity, 0)
        }
      });
    }
  }

  return analysis;
}

app.listen(PORT, () => {
  console.log(`risk-analyzer MCP running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /analyze-risk');
  console.log('  GET  /health');
});
