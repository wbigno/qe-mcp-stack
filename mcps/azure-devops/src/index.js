import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

const ADO_PAT = process.env.ADO_PAT;
const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_API_VERSION = process.env.ADO_API_VERSION || '7.0';

const adoApi = axios.create({
  baseURL: `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`,
  auth: {
    username: '',
    password: ADO_PAT
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'azure-devops-mcp',
    timestamp: new Date().toISOString(),
    configured: !!ADO_PAT && !!ADO_ORG && !!ADO_PROJECT
  });
});

// Pull work items
app.post('/work-items/query', async (req, res) => {
  try {
    const { sprint, workItemIds, query } = req.body;

    if (workItemIds) {
      // Get specific work items
      const ids = workItemIds.join(',');
      const response = await adoApi.get(
        `/wit/workitems?ids=${ids}&api-version=${ADO_API_VERSION}`
      );
      return res.json(response.data.value || []);
    }

    // Query by sprint or custom query
    const wiql = query || `SELECT [System.Id], [System.Title], [System.State]
      FROM WorkItems
      WHERE [System.TeamProject] = '${ADO_PROJECT}'
      ${sprint ? `AND [System.IterationPath] = '${ADO_PROJECT}\\${sprint}'` : ''}`;

    const queryResponse = await adoApi.post(
      `/wit/wiql?api-version=${ADO_API_VERSION}`,
      { query: wiql }
    );

    const workItemIdsFromQuery = queryResponse.data.workItems.map(wi => wi.id);

    if (workItemIdsFromQuery.length === 0) {
    return res.json([]);
    };

    const detailsResponse = await adoApi.get(
      `/wit/workitems?ids=${workItemIdsFromQuery.join(',')}&api-version=${ADO_API_VERSION}`
    );

    res.json(detailsResponse.data.value || []);
  } catch (error) {
      console.error('ADO query error:', error.message);
      console.error('Error details:', error.response?.data);
      res.status(500).json({ 
        error: 'Failed to query work items', 
        message: error.message,
        details: error.response?.data 
      });
    }
    });

// Get specific work items
app.post('/work-items/get', async (req, res) => {
  try {
    const { ids } = req.body;
    
    const response = await adoApi.get(
      `/wit/workitems?ids=${ids.join(',')}&api-version=${ADO_API_VERSION}`
    );

    res.json(response.data.value || []);
  } catch (error) {
    console.error('ADO get error:', error.message);
    res.status(500).json({ error: 'Failed to get work items', message: error.message });
  }
});

// Update work item
app.post('/work-items/update', async (req, res) => {
  try {
    const { id, fields } = req.body;

    const patchDoc = Object.entries(fields).map(([field, value]) => ({
      op: 'add',
      path: `/fields/${field}`,
      value
    }));

    const response = await adoApi.patch(
      `/wit/workitems/${id}?api-version=${ADO_API_VERSION}`,
      patchDoc,
      {
        headers: { 'Content-Type': 'application/json-patch+json' }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('ADO update error:', error.message);
    res.status(500).json({ error: 'Failed to update work item', message: error.message });
  }
});

// Create test cases
app.post('/work-items/create-test-cases', async (req, res) => {
  try {
    const { parentId, testCases } = req.body;

    const created = [];
    for (const testCase of testCases) {
      const doc = [
        { op: 'add', path: '/fields/System.Title', value: testCase.title },
        { op: 'add', path: '/fields/System.WorkItemType', value: 'Test Case' },
        { op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: JSON.stringify(testCase.steps) }
      ];

      const response = await adoApi.post(
        `/wit/workitems/$Test Case?api-version=${ADO_API_VERSION}`,
        doc,
        {
          headers: { 'Content-Type': 'application/json-patch+json' }
        }
      );

      created.push(response.data);
    }

    res.json({ success: true, created });
  } catch (error) {
    console.error('ADO create error:', error.message);
    res.status(500).json({ error: 'Failed to create test cases', message: error.message });
  }
});

// Bulk update
app.post('/work-items/bulk-update', async (req, res) => {
  try {
    const { storyId, testCases, automationReqs } = req.body;

    const updates = [];

    // Update story with test cases summary
    if (testCases) {
      const patchDoc = [{
        op: 'add',
        path: '/fields/Custom.TestCases',
        value: `Generated ${testCases.length} test cases`
      }];

      const response = await adoApi.patch(
        `/wit/workitems/${storyId}?api-version=${ADO_API_VERSION}`,
        patchDoc,
        {
          headers: { 'Content-Type': 'application/json-patch+json' }
        }
      );

      updates.push({ type: 'story-update', data: response.data });
    }

    // Add automation requirements
    if (automationReqs) {
      const patchDoc = [{
        op: 'add',
        path: '/fields/Custom.AutomationRequirements',
        value: automationReqs.summary || JSON.stringify(automationReqs)
      }];

      const response = await adoApi.patch(
        `/wit/workitems/${storyId}?api-version=${ADO_API_VERSION}`,
        patchDoc,
        {
          headers: { 'Content-Type': 'application/json-patch+json' }
        }
      );

      updates.push({ type: 'automation-update', data: response.data });
    }

    res.json({ success: true, updates });
  } catch (error) {
    console.error('ADO bulk update error:', error.message);
    res.status(500).json({ error: 'Failed to bulk update', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Azure DevOps MCP running on port ${PORT}`);
});
