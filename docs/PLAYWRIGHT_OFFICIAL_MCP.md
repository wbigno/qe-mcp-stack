# Using Playwright's Official MCP

## Overview

Instead of building custom Playwright MCPs, you can use Playwright's official MCP server which provides:
- ✅ Browser automation tools
- ✅ Test generation capabilities  
- ✅ Built-in best practices
- ✅ Maintained by Playwright team

## Installation

```bash
npm install -g playwright
npx playwright install
```

## Architecture Options

### Option 1: Direct Integration (Recommended)

Use Playwright's MCP directly from your orchestrator:

```javascript
// orchestrator/src/services/playwrightMcp.js
import { spawn } from 'child_process';

export class PlaywrightMCPClient {
  constructor() {
    this.process = null;
  }

  start() {
    this.process = spawn('npx', ['playwright', 'run-test-mcp-server']);
    
    this.process.stdout.on('data', (data) => {
      console.log('Playwright MCP:', data.toString());
    });
  }

  async callTool(toolName, params) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      this.process.stdin.write(JSON.stringify(request) + '\n');

      const handler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            this.process.stdout.removeListener('data', handler);
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      };

      this.process.stdout.on('data', handler);
    });
  }

  async navigate(url) {
    return this.callTool('playwright-test/browser_navigate', { url });
  }

  async click(selector) {
    return this.callTool('playwright-test/browser_click', { selector });
  }

  async type(selector, text) {
    return this.callTool('playwright-test/browser_type', { selector, text });
  }

  async generateTest(testPlan) {
    await this.callTool('playwright-test/generator_setup_page', {});
    
    // Execute test steps
    for (const step of testPlan.steps) {
      // Playwright MCP will log actions
      await this.executeStep(step);
    }
    
    // Get generated code
    const log = await this.callTool('playwright-test/generator_read_log', {});
    
    // Write test file
    return this.callTool('playwright-test/generator_write_test', {
      testSuite: testPlan.suite,
      testName: testPlan.name,
      testFile: testPlan.filePath,
      seedFile: testPlan.seedFile,
      body: log.code
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}
```

### Option 2: Docker Wrapper

Wrap Playwright's MCP in a Docker container for your stack:

```dockerfile
# mcps/playwright-official/Dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

RUN npm install -g playwright

COPY wrapper.js .

EXPOSE 3007

CMD ["node", "wrapper.js"]
```

```javascript
// mcps/playwright-official/wrapper.js
import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());

let playwrightMcp = null;

function startPlaywrightMCP() {
  playwrightMcp = spawn('npx', ['playwright', 'run-test-mcp-server']);
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'playwright-official-wrapper' });
});

app.post('/tool/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const params = req.body;

  // Forward to Playwright MCP via stdio
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: `playwright-test/${toolName}`,
      arguments: params
    }
  };

  playwrightMcp.stdin.write(JSON.stringify(request) + '\n');

  // Wait for response
  const handler = (data) => {
    try {
      const response = JSON.parse(data.toString());
      if (response.id === request.id) {
        playwrightMcp.stdout.removeListener('data', handler);
        res.json(response.result);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  playwrightMcp.stdout.on('data', handler);
});

startPlaywrightMCP();

app.listen(3007, () => {
  console.log('Playwright Official Wrapper running on port 3007');
});
```

## Available Tools

Playwright's official MCP provides these tools:

### Navigation & Actions
- `browser_navigate` - Navigate to URL
- `browser_click` - Click element
- `browser_type` - Type text
- `browser_press_key` - Press keyboard key
- `browser_hover` - Hover over element
- `browser_drag` - Drag and drop

### Form Interactions
- `browser_file_upload` - Upload file
- `browser_select_option` - Select dropdown option
- `browser_handle_dialog` - Handle alerts/confirms

### Verification
- `browser_verify_element_visible` - Check element visibility
- `browser_verify_text_visible` - Check text exists
- `browser_verify_value` - Verify input value
- `browser_verify_list_visible` - Check list items
- `browser_snapshot` - Take screenshot

### Test Generation
- `generator_setup_page` - Initialize test generation
- `generator_read_log` - Get generated code
- `generator_write_test` - Save test file

### Utilities
- `browser_wait_for` - Wait for condition
- `browser_evaluate` - Execute JavaScript

## Usage in Your Orchestrator

```javascript
// orchestrator/src/routes/playwright.js
import express from 'express';
import { PlaywrightMCPClient } from '../services/playwrightMcp.js';

const router = express.Router();
const playwrightClient = new PlaywrightMCPClient();
playwrightClient.start();

// Generate Playwright test from story
router.post('/generate-from-story', async (req, res) => {
  try {
    const { storyId, criticalPath } = req.body;

    // Get story details
    const story = await req.mcpManager.callDockerMcp(
      'azureDevOps',
      '/work-items/get',
      { ids: [storyId] }
    );

    // Setup test generation
    await playwrightClient.callTool('playwright-test/generator_setup_page', {
      url: criticalPath.startUrl
    });

    // Execute each step
    for (const step of criticalPath.steps) {
      if (step.action === 'click') {
        await playwrightClient.click(step.selector);
      } else if (step.action === 'type') {
        await playwrightClient.type(step.selector, step.text);
      }
      // ... more actions
    }

    // Get generated test code
    const log = await playwrightClient.callTool(
      'playwright-test/generator_read_log',
      {}
    );

    // Write test file
    const result = await playwrightClient.callTool(
      'playwright-test/generator_write_test',
      {
        testSuite: story[0].fields['System.Title'],
        testName: criticalPath.name,
        testFile: `tests/${storyId}/${criticalPath.name}.spec.ts`,
        seedFile: 'tests/seed.spec.ts',
        body: log.actions
      }
    );

    res.json({
      success: true,
      testFile: result.filePath,
      code: result.code
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Comparison: Official vs Custom

| Feature | Playwright Official MCP | Custom MCP |
|---------|------------------------|-----------|
| **Maintenance** | Playwright team | You |
| **Tools** | 20+ built-in | You build each |
| **Browser Support** | All Playwright browsers | Manual setup |
| **Test Generation** | Built-in | Custom logic |
| **Updates** | Automatic via npm | Manual |
| **Integration** | Some setup needed | Direct control |

## Recommendation

**Use Playwright's official MCP for**:
- Browser automation
- Test generation
- Screenshot/recording
- UI interactions

**Keep custom MCPs for**:
- Code analysis (code-analyzer)
- Coverage analysis (coverage-analyzer)
- ADO integration (azure-devops)
- Test case planning (test-case-planner)
- Unit test generation (unit-test-generator)

## Updated docker-compose.yml

```yaml
# Remove custom playwright MCPs, add official wrapper
playwright-official:
  build: ./mcps/playwright-official
  container_name: qe-playwright-official
  ports:
    - "3007:3007"
  environment:
    - PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
  volumes:
    - playwright-browsers:/ms-playwright
    - /Users/williambigno/Desktop/git:/workspace
  networks:
    - qe-network
  shm_size: 2gb
```

## Migration Path

1. **Phase 1**: Keep current architecture working
2. **Phase 2**: Add Playwright official MCP alongside
3. **Phase 3**: Migrate Playwright workflows to official MCP
4. **Phase 4**: Remove custom Playwright MCPs if not needed

## Resources

- [Playwright MCP Documentation](https://playwright.dev/docs/mcp)
- [MCP Protocol Spec](https://github.com/modelcontextprotocol/specification)
- [Playwright Test Generation Guide](https://playwright.dev/docs/codegen)
