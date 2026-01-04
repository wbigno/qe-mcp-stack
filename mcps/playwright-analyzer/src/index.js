import express from 'express';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'playwright-analyzer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Analyze critical UI paths from stories and requirements
 * This identifies which user workflows are most critical to automate
 */
app.post('/analyze-paths', async (req, res) => {
  try {
    const { app: appName, stories = [], prioritizeCritical = true } = req.body;

    console.log(`Analyzing UI paths for ${appName}`);

    // Extract user workflows from stories
    const paths = [];
    let pathId = 1;

    for (const story of stories) {
      const title = story.fields?.['System.Title'] || story.title || '';
      const description = story.fields?.['System.Description'] || story.description || '';
      const acceptanceCriteria = story.fields?.['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';

      // Identify UI workflows from the story
      const workflows = extractWorkflows(title, description, acceptanceCriteria);

      for (const workflow of workflows) {
        paths.push({
          id: `PATH-${String(pathId++).padStart(3, '0')}`,
          name: workflow.name,
          priority: workflow.priority,
          frequency: workflow.frequency,
          risk: workflow.risk,
          steps: workflow.steps,
          startUrl: workflow.startUrl || '/login',
          expectedOutcome: workflow.expectedOutcome,
          storyId: story.id || story.fields?.['System.Id'],
          tags: workflow.tags
        });
      }
    }

    // Prioritize paths
    if (prioritizeCritical) {
      paths.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const riskWeight = { high: 3, medium: 2, low: 1 };
        const frequencyWeight = { daily: 3, weekly: 2, monthly: 1 };

        const scoreA = (priorityWeight[a.priority] || 0) + (riskWeight[a.risk] || 0) + (frequencyWeight[a.frequency] || 0);
        const scoreB = (priorityWeight[b.priority] || 0) + (riskWeight[b.risk] || 0) + (frequencyWeight[b.frequency] || 0);

        return scoreB - scoreA;
      });
    }

    // Generate priority matrix
    const priority = {
      high: paths.filter(p => p.priority === 'high').length,
      medium: paths.filter(p => p.priority === 'medium').length,
      low: paths.filter(p => p.priority === 'low').length
    };

    res.json({
      success: true,
      app: appName,
      totalPaths: paths.length,
      paths,
      priorityMatrix: priority,
      recommendation: `Automate ${priority.high} high-priority paths first`
    });
  } catch (error) {
    console.error('Path analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Extract UI workflows from story text
 */
function extractWorkflows(title, description, acceptanceCriteria) {
  const workflows = [];

  // Common UI workflow patterns
  const patterns = [
    { keyword: 'login', priority: 'high', frequency: 'daily', risk: 'high' },
    { keyword: 'search', priority: 'high', frequency: 'daily', risk: 'medium' },
    { keyword: 'create', priority: 'high', frequency: 'daily', risk: 'high' },
    { keyword: 'edit', priority: 'medium', frequency: 'weekly', risk: 'medium' },
    { keyword: 'delete', priority: 'high', frequency: 'weekly', risk: 'high' },
    { keyword: 'patient', priority: 'high', frequency: 'daily', risk: 'high' },
    { keyword: 'payment', priority: 'high', frequency: 'daily', risk: 'high' },
    { keyword: 'billing', priority: 'high', frequency: 'daily', risk: 'high' },
    { keyword: 'report', priority: 'medium', frequency: 'weekly', risk: 'low' },
    { keyword: 'export', priority: 'low', frequency: 'monthly', risk: 'low' }
  ];

  const allText = `${title} ${description} ${acceptanceCriteria}`.toLowerCase();

  for (const pattern of patterns) {
    if (allText.includes(pattern.keyword)) {
      workflows.push({
        name: `${capitalizeFirst(pattern.keyword)} workflow`,
        priority: pattern.priority,
        frequency: pattern.frequency,
        risk: pattern.risk,
        steps: generateStepsForWorkflow(pattern.keyword),
        expectedOutcome: `Successfully ${pattern.keyword} item`,
        tags: [pattern.keyword, 'ui', 'critical']
      });
    }
  }

  // If no patterns matched, create a generic workflow
  if (workflows.length === 0) {
    workflows.push({
      name: title || 'Generic workflow',
      priority: 'medium',
      frequency: 'weekly',
      risk: 'medium',
      steps: ['Navigate to page', 'Perform action', 'Verify result'],
      expectedOutcome: 'Workflow completes successfully',
      tags: ['ui', 'generic']
    });
  }

  return workflows;
}

function generateStepsForWorkflow(workflowType) {
  const stepTemplates = {
    login: [
      'Navigate to login page',
      'Enter valid username',
      'Enter valid password',
      'Click login button',
      'Verify successful login'
    ],
    search: [
      'Navigate to search page',
      'Enter search criteria',
      'Click search button',
      'Verify results are displayed'
    ],
    create: [
      'Navigate to create page',
      'Fill in required fields',
      'Click save button',
      'Verify item created successfully'
    ],
    patient: [
      'Navigate to patient search',
      'Enter patient ID',
      'Click search',
      'Verify patient details displayed'
    ],
    payment: [
      'Navigate to payment page',
      'Enter payment details',
      'Submit payment',
      'Verify payment confirmation'
    ]
  };

  return stepTemplates[workflowType] || ['Perform action', 'Verify result'];
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

app.listen(PORT, () => {
  console.log(`Playwright Analyzer MCP running on port ${PORT}`);
});
