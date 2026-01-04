import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'playwright-generator-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Generate Playwright test code from critical paths
 */
app.post('/generate', async (req, res) => {
  try {
    const { 
      app: appName, 
      paths = [], 
      language = 'typescript',
      includePageObjects = true,
      includeFixtures = true
    } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`Generating Playwright tests for ${appName}`);
    console.log(`Paths: ${paths.length}, Language: ${language}`);

    const files = [];

    // Generate test file for each path
    for (const path of paths) {
      const prompt = `Generate a complete Playwright test in ${language} for this user workflow:

Path: ${path.name}
Priority: ${path.priority}
Steps:
${path.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}
Expected Outcome: ${path.expectedOutcome}

Requirements:
1. Use Playwright with TypeScript
2. Include proper imports
3. Use describe/test structure
4. Include meaningful test descriptions
5. Use best practices for selectors (prefer data-testid, role, text)
6. Add proper waits and assertions
7. Include comments for each step
8. Handle async/await properly
9. Include error scenarios if relevant
10. Use Page Object Model if ${includePageObjects ? 'yes' : 'no'}

Return ONLY the complete, compilable test code without markdown code blocks.`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }]
        });

        let testCode = message.content[0].text;
        testCode = testCode.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();

        const fileName = path.name.toLowerCase().replace(/\s+/g, '-') + '.spec.ts';

        files.push({
          fileName,
          path: `/generated-tests/${appName}/playwright/${fileName}`,
          content: testCode,
          pathId: path.id,
          type: 'test'
        });

        console.log(`✓ Generated test for ${path.name}`);
      } catch (error) {
        console.error(`✗ Error generating test for ${path.name}:`, error.message);
      }
    }

    // Generate page objects if requested
    if (includePageObjects && paths.length > 0) {
      const prompt = `Generate TypeScript page object models for these workflows:

${paths.map(p => `- ${p.name}: ${p.steps.join(', ')}`).join('\n')}

Create page objects that:
1. Extend a base Page class
2. Include locators as getters
3. Include action methods
4. Include assertion methods
5. Use proper TypeScript types
6. Follow Playwright best practices

Return ONLY the code for BasePage.ts and relevant page objects.`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        });

        let pageObjectCode = message.content[0].text;
        pageObjectCode = pageObjectCode.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();

        // Split into separate page object files
        const pageObjects = pageObjectCode.split('// File:').filter(p => p.trim());

        for (const po of pageObjects) {
          const lines = po.trim().split('\n');
          const firstLine = lines[0];
          const fileName = firstLine.includes('.ts') ? 
            firstLine.trim() : 
            'BasePage.ts';
          const content = lines.slice(1).join('\n').trim();

          files.push({
            fileName,
            path: `/generated-tests/${appName}/playwright/pages/${fileName}`,
            content,
            type: 'page-object'
          });
        }

        console.log(`✓ Generated page objects`);
      } catch (error) {
        console.error(`✗ Error generating page objects:`, error.message);
      }
    }

    // Generate fixtures if requested
    if (includeFixtures) {
      const prompt = `Generate Playwright fixtures for testing including:

1. Authentication fixture (auto-login)
2. Test data fixture (generate test data)
3. Database cleanup fixture
4. API mocking fixture

Return TypeScript code for fixtures.ts`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        });

        let fixtureCode = message.content[0].text;
        fixtureCode = fixtureCode.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();

        files.push({
          fileName: 'fixtures.ts',
          path: `/generated-tests/${appName}/playwright/fixtures.ts`,
          content: fixtureCode,
          type: 'fixture'
        });

        console.log(`✓ Generated fixtures`);
      } catch (error) {
        console.error(`✗ Error generating fixtures:`, error.message);
      }
    }

    res.json({
      success: true,
      app: appName,
      generated: files.length,
      files,
      defaultPath: `/generated-tests/${appName}/playwright`
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright Generator MCP running on port ${PORT}`);
});
