import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'playwright-healer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Heal broken Playwright tests by analyzing failures and suggesting fixes
 */
app.post('/heal', async (req, res) => {
  try {
    const { 
      app: appName, 
      testFiles = [],
      failureReports = [],
      autoFix = false 
    } = req.body;

    console.log(`Healing Playwright tests for ${appName || 'provided files'}`);
    console.log(`Test files: ${testFiles.length}, Failures: ${failureReports.length}`);

    const results = {
      fixed: [],
      suggestions: [],
      cannotFix: []
    };

    // Analyze each failure
    for (const failure of failureReports) {
      const analysis = await analyzeFailure(failure, autoFix);
      
      if (analysis.fixable && autoFix) {
        results.fixed.push(analysis);
      } else if (analysis.fixable) {
        results.suggestions.push(analysis);
      } else {
        results.cannotFix.push(analysis);
      }
    }

    // Analyze test files for common issues even without failures
    if (testFiles.length > 0) {
      for (const testFile of testFiles) {
        const issues = detectCommonIssues(testFile);
        for (const issue of issues) {
          results.suggestions.push({
            file: testFile.path || testFile.name,
            issue: issue.description,
            suggestion: issue.fix,
            priority: issue.priority
          });
        }
      }
    }

    res.json({
      success: true,
      app: appName,
      healed: results.fixed.length,
      suggestions: results.suggestions.length,
      cannotFix: results.cannotFix.length,
      results
    });
  } catch (error) {
    console.error('Healing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze a test failure and determine how to fix it
 */
async function analyzeFailure(failure, autoFix) {
  const { testFile, testName, error, screenshot } = failure;

  console.log(`Analyzing failure: ${testName}`);

  // Common failure patterns and their fixes
  const patterns = [
    {
      pattern: /selector .* not found/i,
      type: 'selector-not-found',
      fixable: true,
      priority: 'high',
      fix: async (failure) => {
        const selector = failure.error.match(/selector (['"`])(.*?)\1/)?.[2];
        if (!selector) return null;

        const prompt = `A Playwright test is failing because selector "${selector}" is not found.

Test: ${testName}
Error: ${error}

Suggest 3 alternative selectors that might work better:
1. A more stable data-testid selector
2. A role-based selector
3. A text-based selector

Return JSON: { "selectors": ["selector1", "selector2", "selector3"], "reasoning": "why these are better" }`;

        try {
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
          });

          let response = message.content[0].text;
          response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const suggestions = JSON.parse(response);

          return {
            file: testFile,
            issue: `Selector not found: ${selector}`,
            originalSelector: selector,
            suggestions: suggestions.selectors,
            reasoning: suggestions.reasoning,
            applied: false
          };
        } catch (error) {
          return null;
        }
      }
    },
    {
      pattern: /timeout.*exceeded/i,
      type: 'timeout',
      fixable: true,
      priority: 'medium',
      fix: (failure) => ({
        file: testFile,
        issue: 'Test timeout exceeded',
        suggestion: 'Add explicit waits: await page.waitForLoadState("networkidle") or increase timeout',
        code: `// Add before the failing action:\nawait page.waitForLoadState('networkidle');\n// Or increase timeout:\nawait page.click(selector, { timeout: 60000 });`,
        applied: false
      })
    },
    {
      pattern: /element is not visible/i,
      type: 'visibility',
      fixable: true,
      priority: 'high',
      fix: (failure) => ({
        file: testFile,
        issue: 'Element not visible',
        suggestion: 'Wait for element to be visible before interacting',
        code: `await page.waitForSelector(selector, { state: 'visible' });`,
        applied: false
      })
    },
    {
      pattern: /strict mode violation/i,
      type: 'multiple-elements',
      fixable: true,
      priority: 'high',
      fix: (failure) => ({
        file: testFile,
        issue: 'Multiple elements match selector (strict mode)',
        suggestion: 'Make selector more specific or use .first()/.nth()',
        code: `// Option 1: More specific selector\nawait page.click('[data-testid="submit-button"]');\n\n// Option 2: Use first match\nawait page.locator(selector).first().click();`,
        applied: false
      })
    }
  ];

  // Find matching pattern
  for (const pattern of patterns) {
    if (pattern.pattern.test(error)) {
      const fix = await pattern.fix(failure);
      if (fix) {
        return { ...fix, type: pattern.type, fixable: pattern.fixable, priority: pattern.priority };
      }
    }
  }

  // No pattern matched
  return {
    file: testFile,
    testName,
    issue: error,
    fixable: false,
    suggestion: 'Manual investigation required',
    priority: 'low'
  };
}

/**
 * Detect common issues in test code
 */
function detectCommonIssues(testFile) {
  const issues = [];
  const content = testFile.content || '';

  // Check for missing waits
  if (content.includes('page.click') && !content.includes('waitFor')) {
    issues.push({
      description: 'Missing explicit waits - may cause flaky tests',
      fix: 'Add await page.waitForLoadState("networkidle") before interactions',
      priority: 'medium',
      code: `await page.waitForLoadState('networkidle');`
    });
  }

  // Check for hard-coded sleeps
  if (content.includes('page.waitForTimeout') || content.includes('setTimeout')) {
    issues.push({
      description: 'Using hard-coded sleeps - replace with explicit waits',
      fix: 'Use waitForSelector or waitForLoadState instead',
      priority: 'high',
      code: `await page.waitForSelector(selector, { state: 'visible' });`
    });
  }

  // Check for weak selectors
  if (content.match(/page\.(click|fill|type)\(['"]\.[\w-]+/)) {
    issues.push({
      description: 'Using CSS class selectors - not stable',
      fix: 'Use data-testid, role, or text selectors instead',
      priority: 'high',
      code: `await page.click('[data-testid="submit-button"]');`
    });
  }

  // Check for missing error handling
  if (!content.includes('try') && !content.includes('catch')) {
    issues.push({
      description: 'No error handling - tests may fail without clear messages',
      fix: 'Wrap critical operations in try-catch',
      priority: 'low',
      code: `try {\n  await page.click(selector);\n} catch (error) {\n  throw new Error(\`Failed to click: \${error.message}\`);\n}`
    });
  }

  return issues;
}

app.listen(PORT, () => {
  console.log(`Playwright Healer MCP running on port ${PORT}`);
});
