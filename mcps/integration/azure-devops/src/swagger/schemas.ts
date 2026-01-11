/**
 * Swagger/OpenAPI Schema Definitions
 */

export const schemas = {
  WorkItem: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Work item ID' },
      rev: { type: 'number', description: 'Revision number' },
      fields: { $ref: '#/components/schemas/WorkItemFields' },
      relations: {
        type: 'array',
        items: { $ref: '#/components/schemas/WorkItemRelation' },
      },
      url: { type: 'string', description: 'Work item URL' },
    },
  },

  WorkItemFields: {
    type: 'object',
    properties: {
      'System.Id': { type: 'number' },
      'System.Title': { type: 'string' },
      'System.State': { type: 'string' },
      'System.IterationPath': { type: 'string' },
      'System.WorkItemType': { type: 'string' },
      'System.AssignedTo': {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          uniqueName: { type: 'string' },
        },
      },
      'System.Tags': { type: 'string' },
      'System.Description': { type: 'string' },
      'Microsoft.VSTS.TCM.Steps': { type: 'string' },
    },
  },

  WorkItemRelation: {
    type: 'object',
    properties: {
      rel: { type: 'string', description: 'Relation type' },
      url: { type: 'string', description: 'Related work item URL' },
      attributes: {
        type: 'object',
        properties: {
          isLocked: { type: 'boolean' },
          name: { type: 'string' },
        },
      },
    },
  },

  WorkItemQueryRequest: {
    type: 'object',
    properties: {
      sprint: {
        type: 'string',
        description: 'Sprint name or full iteration path (e.g., "25.Q4.07" or "Core\\Team\\2025\\Q4\\25.Q4.07")',
      },
      workItemIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'Specific work item IDs to retrieve',
      },
      query: {
        type: 'string',
        description: 'Custom WIQL query',
      },
      organization: {
        type: 'string',
        description: 'Azure DevOps organization name (optional)',
      },
      project: {
        type: 'string',
        description: 'Project name (optional)',
      },
      team: {
        type: 'string',
        description: 'Team name (optional)',
      },
    },
    example: {
      sprint: '25.Q4.07',
      project: 'Core',
      team: 'Core Team',
    },
  },

  WorkItemUpdateRequest: {
    type: 'object',
    required: ['id', 'fields'],
    properties: {
      id: { type: 'number', description: 'Work item ID to update' },
      fields: {
        type: 'object',
        additionalProperties: true,
        description: 'Fields to update (e.g., {"System.State": "Active"})',
      },
    },
    example: {
      id: 12345,
      fields: {
        'System.State': 'Active',
        'System.AssignedTo': 'user@example.com',
      },
    },
  },

  TestCase: {
    type: 'object',
    required: ['title', 'steps'],
    properties: {
      title: { type: 'string', description: 'Test case title' },
      steps: {
        type: 'array',
        items: { $ref: '#/components/schemas/TestStep' },
      },
    },
  },

  TestStep: {
    type: 'object',
    required: ['action', 'expectedResult', 'stepNumber'],
    properties: {
      action: { type: 'string', description: 'Step action' },
      expectedResult: { type: 'string', description: 'Expected result' },
      stepNumber: { type: 'number', description: 'Step number' },
    },
  },

  CreateTestCasesRequest: {
    type: 'object',
    required: ['testCases'],
    properties: {
      parentId: {
        type: 'number',
        description: 'Parent work item ID (optional)',
      },
      testCases: {
        type: 'array',
        items: { $ref: '#/components/schemas/TestCase' },
      },
    },
  },

  BulkUpdateRequest: {
    type: 'object',
    required: ['storyId'],
    properties: {
      storyId: { type: 'number', description: 'Story work item ID' },
      testCases: {
        type: 'array',
        items: { $ref: '#/components/schemas/TestCase' },
      },
      automationReqs: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  },

  ADOProject: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Project name' },
      id: { type: 'string', description: 'Project ID' },
      description: { type: 'string', description: 'Project description' },
      url: { type: 'string', description: 'Project URL' },
    },
  },

  ADOTeam: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Team name' },
      id: { type: 'string', description: 'Team ID' },
      description: { type: 'string', description: 'Team description' },
      url: { type: 'string', description: 'Team URL' },
    },
  },

  ADOSprint: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Sprint name' },
      path: { type: 'string', description: 'Full iteration path' },
      id: { type: 'string', description: 'Sprint ID' },
      startDate: { type: 'string', format: 'date-time', description: 'Sprint start date' },
      finishDate: { type: 'string', format: 'date-time', description: 'Sprint end date' },
    },
  },
};
