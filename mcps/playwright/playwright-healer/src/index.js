import express from 'express';
import { generateCompletion } from '../../../shared/aiClient.js';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8402;
const DATA_DIR = '/app/data';

app.use(express.json({ limit: '10mb' })); // Increased limit for screenshots

// Ensure data directory exists
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
} catch (error) {
  console.warn('Could not create data directory:', error.message);
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'playwright-healer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Analyze test failure patterns
 * POST /analyze-failures
 * Body: { testFile: string, errorLog: string, screenshot?: string }
 */
app.post('/analyze-failures', async (req, res) => {
  try {
    const {
      testFile,
      errorLog,
      screenshot,
      model
    } = req.body;

    if (!testFile || !errorLog) {
      return res.status(400).json({
        error: 'testFile and errorLog are required'
      });
    }

    console.log(`Analyzing failure for ${testFile}`);

    // Build analysis prompt
    const analysisPrompt = `Analyze this Playwright test failure and provide a detailed diagnosis.

Test File: ${testFile}

Error Log:
${errorLog}

${screenshot ? 'Screenshot data is available for visual analysis.' : 'No screenshot provided.'}

Provide analysis in this JSON format:
{
  "failureType": "selector-not-found" | "timeout" | "assertion-failed" | "element-not-visible" | "network-error" | "race-condition" | "flaky-test" | "environment-issue",
  "rootCause": "Detailed explanation of what caused the failure",
  "affectedSelector": "CSS/XPath selector that failed (if applicable)",
  "suggestedFix": "Concrete steps to fix this issue",
  "confidence": "high" | "medium" | "low",
  "isFlaky": boolean,
  "flakinessReason": "Why this might be flaky (if applicable)",
  "preventionTips": ["Tip 1", "Tip 2"],
  "relatedIssues": ["Similar issues that might occur"]
}

Return ONLY valid JSON.`;

    const response = await generateCompletion({
      model,
      messages: [{ role: 'user', content: analysisPrompt }],
      maxTokens: 2000,
      temperature: 0.2
    });

    let failureAnalysis;
    try {
      const cleanedText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      failureAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse failure analysis:', response.text);
      return res.status(500).json({
        error: 'Failed to parse failure analysis',
        details: parseError.message,
        rawResponse: response.text.substring(0, 500)
      });
    }

    // Save analysis
    const analysisData = {
      testFile,
      timestamp: new Date().toISOString(),
      errorLog: errorLog.substring(0, 1000), // Truncate for storage
      failureAnalysis,
      model: response.model,
      usage: response.usage
    };

    const fileName = `failure-analysis-${Date.now()}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(analysisData, null, 2));
      console.log(`✓ Saved failure analysis to ${fileName}`);
    } catch (error) {
      console.warn('Could not save analysis:', error.message);
    }

    res.json({
      success: true,
      testFile,
      failureAnalysis,
      savedTo: fileName,
      usage: response.usage
    });
  } catch (error) {
    console.error('Failure analysis error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Generate fixes for broken tests
 * POST /heal
 * Body: { testFile: string, testCode: string, errorLog: string }
 */
app.post('/heal', async (req, res) => {
  try {
    const {
      testFile,
      testCode,
      errorLog,
      model
    } = req.body;

    if (!testFile || !testCode || !errorLog) {
      return res.status(400).json({
        error: 'testFile, testCode, and errorLog are required'
      });
    }

    console.log(`Healing test ${testFile}`);

    // Build healing prompt
    const healingPrompt = `You are a Playwright test healing expert. Fix this broken Playwright test.

Test File: ${testFile}

Current Test Code:
\`\`\`typescript
${testCode}
\`\`\`

Error Log:
${errorLog}

Your task:
1. Analyze the error and identify the root cause
2. Fix the test code to resolve the issue
3. Improve test stability (better selectors, explicit waits, error handling)
4. Add comments explaining the changes

Common fixes:
- Replace fragile selectors (CSS classes) with stable ones (data-testid, role, text)
- Add explicit waits instead of hardcoded delays
- Handle race conditions with proper assertions
- Add retry logic for flaky elements
- Improve error messages for better debugging

Return JSON:
{
  "fixedCode": "Complete fixed test code",
  "changes": [
    {
      "line": 15,
      "before": "await page.click('.submit-btn')",
      "after": "await page.click('[data-testid=\"submit-button\"]')",
      "reason": "Replaced fragile CSS class selector with stable data-testid"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "additionalNotes": "Any warnings or suggestions",
  "testabilityImprovements": ["Improvement 1", "Improvement 2"]
}

Return ONLY valid JSON.`;

    const response = await generateCompletion({
      model,
      messages: [{ role: 'user', content: healingPrompt }],
      maxTokens: 4000,
      temperature: 0.2
    });

    let healResult;
    try {
      const cleanedText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      healResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse heal result:', response.text);
      return res.status(500).json({
        error: 'Failed to parse heal result',
        details: parseError.message,
        rawResponse: response.text.substring(0, 500)
      });
    }

    // Save healing history
    const healingData = {
      testFile,
      timestamp: new Date().toISOString(),
      originalCode: testCode.substring(0, 2000), // Truncate
      errorLog: errorLog.substring(0, 1000), // Truncate
      fixedCode: healResult.fixedCode,
      changes: healResult.changes,
      confidence: healResult.confidence,
      model: response.model,
      usage: response.usage
    };

    const fileName = `heal-${testFile.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(healingData, null, 2));
      console.log(`✓ Saved healing history to ${fileName}`);
    } catch (error) {
      console.warn('Could not save healing history:', error.message);
    }

    res.json({
      success: true,
      testFile,
      fixedCode: healResult.fixedCode,
      changes: healResult.changes,
      confidence: healResult.confidence,
      additionalNotes: healResult.additionalNotes,
      testabilityImprovements: healResult.testabilityImprovements,
      savedTo: fileName,
      usage: response.usage
    });
  } catch (error) {
    console.error('Test healing error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Detect flaky tests from test results
 * POST /detect-flaky
 * Body: { testResults: TestResult[] }
 */
app.post('/detect-flaky', async (req, res) => {
  try {
    const { testResults, model } = req.body;

    if (!testResults || !Array.isArray(testResults)) {
      return res.status(400).json({
        error: 'testResults array is required'
      });
    }

    if (testResults.length === 0) {
      return res.status(400).json({
        error: 'testResults array cannot be empty'
      });
    }

    console.log(`Detecting flaky tests from ${testResults.length} test runs`);

    // Build flaky detection prompt
    const detectionPrompt = `Analyze these Playwright test results to detect flaky tests.

Test Results (multiple runs):
${JSON.stringify(testResults, null, 2)}

A test is flaky if:
1. It passes sometimes and fails sometimes
2. It has intermittent timeouts or assertion failures
3. It depends on timing or external state
4. Error messages vary between runs

For each flaky test detected, provide:
{
  "flakyTests": [
    {
      "testName": "Test name",
      "testFile": "File path",
      "flakinessScore": 1-10,
      "passRate": 0.65,
      "totalRuns": 20,
      "passes": 13,
      "failures": 7,
      "failurePatterns": [
        {
          "pattern": "TimeoutError: waiting for selector",
          "occurrences": 4
        }
      ],
      "rootCauses": [
        "Race condition with network requests",
        "Element visibility timing"
      ],
      "suggestedFixes": [
        "Add explicit wait for network idle",
        "Use waitForSelector with visible state"
      ],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": {
    "totalTestsAnalyzed": 50,
    "flakyTestsFound": 5,
    "criticalFlaky": 2,
    "recommendations": ["General recommendation 1", "General recommendation 2"]
  }
}

Return ONLY valid JSON.`;

    const response = await generateCompletion({
      model,
      messages: [{ role: 'user', content: detectionPrompt }],
      maxTokens: 4000,
      temperature: 0.2
    });

    let detectionResult;
    try {
      const cleanedText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      detectionResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse detection result:', response.text);
      return res.status(500).json({
        error: 'Failed to parse detection result',
        details: parseError.message,
        rawResponse: response.text.substring(0, 500)
      });
    }

    // Save detection report
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTestRuns: testResults.length,
      flakyTests: detectionResult.flakyTests,
      summary: detectionResult.summary,
      model: response.model,
      usage: response.usage
    };

    const fileName = `flaky-detection-${Date.now()}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
      console.log(`✓ Saved flaky detection report to ${fileName}`);
    } catch (error) {
      console.warn('Could not save detection report:', error.message);
    }

    res.json({
      success: true,
      flakyTests: detectionResult.flakyTests,
      summary: detectionResult.summary,
      savedTo: fileName,
      usage: response.usage
    });
  } catch (error) {
    console.error('Flaky detection error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright Healer MCP running on port ${PORT}`);
});
