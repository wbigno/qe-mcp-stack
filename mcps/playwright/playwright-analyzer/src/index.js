import express from 'express';
import { generateCompletion } from '../../../shared/aiClient.js';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8401;
const DATA_DIR = '/app/data';

app.use(express.json());

// Ensure data directory exists
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
} catch (error) {
  console.warn('Could not create data directory:', error.message);
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'playwright-analyzer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Analyze application to discover critical UI paths
 * POST /analyze
 * Body: { app: string, depth: 'shallow' | 'deep' }
 */
app.post('/analyze', async (req, res) => {
  try {
    const { app: appName, depth = 'shallow', model } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`Analyzing UI paths for ${appName} (depth: ${depth})`);

    // Check if app config exists
    const configPath = '/app/config/apps.json';
    let appConfig;
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const allApps = JSON.parse(configData);
      appConfig = allApps[appName];

      if (!appConfig) {
        return res.status(404).json({
          error: `Application '${appName}' not found in apps.json`
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Could not read apps configuration',
        details: error.message
      });
    }

    // Build prompt for path discovery
    const analysisPrompt = `Analyze this ${appConfig.language} application to discover critical UI user paths that need testing.

Application: ${appName}
Type: ${appConfig.type}
Language: ${appConfig.language}
Path: ${appConfig.path}
${appConfig.testPath ? `Test Path: ${appConfig.testPath}` : ''}

Analysis depth: ${depth}

${depth === 'deep' ?
  'Perform DEEP analysis: Examine authentication flows, data CRUD operations, critical business logic, payment flows, user workflows, integration points, and edge cases.' :
  'Perform SHALLOW analysis: Identify only the most critical happy paths and primary user workflows.'
}

For each discovered UI path, provide:
1. **Path Name**: Clear, descriptive name (e.g., "User Login Flow", "Checkout with Credit Card")
2. **Priority**: critical | high | medium | low
3. **Risk Score**: 1-10 (based on business impact, complexity, frequency of use)
4. **User Journey Steps**: Detailed step-by-step user actions
5. **Expected Outcome**: What success looks like
6. **Test Coverage Status**: covered | partial | missing
7. **Rationale**: Why this path is important to test

Return a JSON array of path objects. Example:
[
  {
    "id": "path-1",
    "name": "User Login Flow",
    "priority": "critical",
    "riskScore": 9,
    "steps": [
      "Navigate to login page",
      "Enter valid email and password",
      "Click login button",
      "Verify redirect to dashboard"
    ],
    "expectedOutcome": "User is authenticated and sees dashboard",
    "coverage": "missing",
    "rationale": "Authentication is the gateway to all app features",
    "category": "authentication"
  }
]

Return ONLY valid JSON, no markdown or explanations.`;

    const response = await generateCompletion({
      model,
      messages: [{ role: 'user', content: analysisPrompt }],
      maxTokens: depth === 'deep' ? 8000 : 4000,
      temperature: 0.3
    });

    // Parse AI response
    let paths;
    try {
      const cleanedText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      paths = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response.text);
      return res.status(500).json({
        error: 'Failed to parse path analysis',
        details: parseError.message,
        rawResponse: response.text.substring(0, 500)
      });
    }

    // Save analysis to data directory
    const analysisData = {
      app: appName,
      depth,
      timestamp: new Date().toISOString(),
      totalPaths: paths.length,
      paths,
      model: response.model,
      usage: response.usage
    };

    const fileName = `${appName}-analysis-${Date.now()}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(analysisData, null, 2));
      console.log(`✓ Saved analysis to ${fileName}`);
    } catch (error) {
      console.warn('Could not save analysis:', error.message);
    }

    res.json({
      success: true,
      app: appName,
      depth,
      totalPaths: paths.length,
      paths,
      savedTo: fileName,
      usage: response.usage
    });
  } catch (error) {
    console.error('Path analysis error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Prioritize paths by risk and impact
 * POST /prioritize
 * Body: { app: string, maxResults?: number, filter?: { priority?, coverage? } }
 */
app.post('/prioritize', async (req, res) => {
  try {
    const {
      app: appName,
      maxResults = 10,
      filter = {},
      model
    } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`Prioritizing paths for ${appName} (max: ${maxResults})`);

    // Find most recent analysis file
    const files = await fs.readdir(DATA_DIR);
    const analysisFiles = files
      .filter(f => f.startsWith(`${appName}-analysis-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (analysisFiles.length === 0) {
      return res.status(404).json({
        error: 'No analysis found for this app',
        hint: 'Run POST /analyze first'
      });
    }

    const latestFile = path.join(DATA_DIR, analysisFiles[0]);
    const analysisData = JSON.parse(await fs.readFile(latestFile, 'utf-8'));
    let { paths } = analysisData;

    // Apply filters
    if (filter.priority) {
      paths = paths.filter(p => p.priority === filter.priority);
    }
    if (filter.coverage) {
      paths = paths.filter(p => p.coverage === filter.coverage);
    }

    // Build prioritization prompt
    const prioritizationPrompt = `Review these UI test paths and re-prioritize them based on:
1. Business impact (revenue, user satisfaction, compliance)
2. Risk score (what breaks if this fails?)
3. Test coverage gaps (missing tests are higher priority)
4. Frequency of use
5. Complexity and likelihood of bugs

Paths to prioritize:
${JSON.stringify(paths, null, 2)}

Return a JSON object with:
{
  "prioritizedPaths": [sorted array of path objects with updated priority and riskScore],
  "reasoning": "Brief explanation of prioritization strategy"
}

Return ONLY valid JSON.`;

    const response = await generateCompletion({
      model,
      messages: [{ role: 'user', content: prioritizationPrompt }],
      maxTokens: 4000,
      temperature: 0.2
    });

    let prioritizationResult;
    try {
      const cleanedText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      prioritizationResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse prioritization response:', response.text);
      return res.status(500).json({
        error: 'Failed to parse prioritization result',
        details: parseError.message
      });
    }

    // Limit results
    const topPaths = prioritizationResult.prioritizedPaths.slice(0, maxResults);

    // Save prioritization
    const prioritizationData = {
      app: appName,
      timestamp: new Date().toISOString(),
      maxResults,
      filter,
      totalPaths: topPaths.length,
      paths: topPaths,
      reasoning: prioritizationResult.reasoning,
      model: response.model,
      usage: response.usage
    };

    const fileName = `${appName}-prioritization-${Date.now()}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(prioritizationData, null, 2));
      console.log(`✓ Saved prioritization to ${fileName}`);
    } catch (error) {
      console.warn('Could not save prioritization:', error.message);
    }

    res.json({
      success: true,
      app: appName,
      totalPaths: topPaths.length,
      paths: topPaths,
      reasoning: prioritizationResult.reasoning,
      savedTo: fileName,
      usage: response.usage
    });
  } catch (error) {
    console.error('Prioritization error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get test coverage map for discovered paths
 * GET /coverage?app=<appName>
 */
app.get('/coverage', async (req, res) => {
  try {
    const { app: appName } = req.query;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required (query param: app)' });
    }

    console.log(`Fetching coverage map for ${appName}`);

    // Find most recent analysis file
    const files = await fs.readdir(DATA_DIR);
    const analysisFiles = files
      .filter(f => f.startsWith(`${appName}-analysis-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (analysisFiles.length === 0) {
      return res.status(404).json({
        error: 'No analysis found for this app',
        hint: 'Run POST /analyze first'
      });
    }

    const latestFile = path.join(DATA_DIR, analysisFiles[0]);
    const analysisData = JSON.parse(await fs.readFile(latestFile, 'utf-8'));
    const { paths } = analysisData;

    // Calculate coverage statistics
    const coverageStats = {
      total: paths.length,
      covered: paths.filter(p => p.coverage === 'covered').length,
      partial: paths.filter(p => p.coverage === 'partial').length,
      missing: paths.filter(p => p.coverage === 'missing').length
    };

    const coveragePercentage = paths.length > 0
      ? ((coverageStats.covered / paths.length) * 100).toFixed(1)
      : 0;

    // Group by priority
    const byPriority = {
      critical: paths.filter(p => p.priority === 'critical'),
      high: paths.filter(p => p.priority === 'high'),
      medium: paths.filter(p => p.priority === 'medium'),
      low: paths.filter(p => p.priority === 'low')
    };

    // Identify gaps (high priority, missing coverage)
    const gaps = paths
      .filter(p => (p.priority === 'critical' || p.priority === 'high') && p.coverage === 'missing')
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      success: true,
      app: appName,
      coveragePercentage: parseFloat(coveragePercentage),
      stats: coverageStats,
      byPriority: {
        critical: {
          total: byPriority.critical.length,
          covered: byPriority.critical.filter(p => p.coverage === 'covered').length,
          missing: byPriority.critical.filter(p => p.coverage === 'missing').length
        },
        high: {
          total: byPriority.high.length,
          covered: byPriority.high.filter(p => p.coverage === 'covered').length,
          missing: byPriority.high.filter(p => p.coverage === 'missing').length
        },
        medium: {
          total: byPriority.medium.length,
          covered: byPriority.medium.filter(p => p.coverage === 'covered').length,
          missing: byPriority.medium.filter(p => p.coverage === 'missing').length
        },
        low: {
          total: byPriority.low.length,
          covered: byPriority.low.filter(p => p.coverage === 'covered').length,
          missing: byPriority.low.filter(p => p.coverage === 'missing').length
        }
      },
      gaps: gaps.map(g => ({
        id: g.id,
        name: g.name,
        priority: g.priority,
        riskScore: g.riskScore,
        rationale: g.rationale
      })),
      timestamp: analysisData.timestamp
    });
  } catch (error) {
    console.error('Coverage fetch error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright Analyzer MCP running on port ${PORT}`);
});
