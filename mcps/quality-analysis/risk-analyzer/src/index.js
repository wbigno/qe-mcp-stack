import express from 'express';
import { RiskScorer } from './riskScorer.js';

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

const riskScorer = new RiskScorer();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'risk-analyzer-mcp',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

app.post('/analyze-risk', async (req, res) => {
  try {
    const { app: appName, story } = req.body;

    if (!appName) {
      return res.status(400).json({
        success: false,
        error: 'app parameter required'
      });
    }

    if (!story) {
      return res.status(400).json({
        success: false,
        error: 'story parameter required (must include: id, title, description, acceptanceCriteria)'
      });
    }

    console.log(`[risk-analyzer] Analyzing story ${story.id} for app ${appName}...`);

    // Calculate risk using the RiskScorer
    const riskAnalysis = await riskScorer.calculateRisk(appName, story);

    console.log(`[risk-analyzer] Risk analysis complete: ${riskAnalysis.level} (${riskAnalysis.score}/100)`);

    res.json({
      success: true,
      app: appName,
      storyId: story.id,
      timestamp: new Date().toISOString(),
      result: {
        risk: riskAnalysis,
        metadata: {
          version: '2.0.0',
          mcpType: 'risk-analyzer'
        }
      }
    });

  } catch (error) {
    console.error(`[risk-analyzer] Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`risk-analyzer MCP running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /analyze-risk');
  console.log('  GET  /health');
});
