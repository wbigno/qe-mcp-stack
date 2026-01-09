/**
 * Orchestrator API OpenAPI Specification
 * Complete API documentation for all orchestrator endpoints
 */

export const orchestratorApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'QE Orchestrator API',
    version: '1.0.0',
    description: 'Central orchestrator for QE automation, test generation, and analysis services'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development'
    },
    {
      url: 'http://orchestrator:3000',
      description: 'Docker environment'
    }
  ],
  tags: [
    { name: 'Azure DevOps', description: 'Azure DevOps work item management and analysis' },
    { name: 'Analysis', description: 'Code analysis, coverage, and risk assessment' },
    { name: 'Playwright', description: 'Playwright test generation and healing' },
    { name: 'Tests', description: 'Test file analysis and generation' },
    { name: 'Dashboard', description: 'Dashboard data and metrics' },
    { name: 'MCP', description: 'MCP service management' },
    { name: 'Swagger', description: 'API documentation endpoints' }
  ],
  paths: {
    '/api/ado/pull-stories': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Pull stories from Azure DevOps',
        description: 'Fetches work items from Azure DevOps based on iteration and filters',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  organization: { type: 'string', description: 'Azure DevOps organization' },
                  project: { type: 'string', description: 'Project name' },
                  team: { type: 'string', description: 'Team name' },
                  iterationPath: { type: 'string', description: 'Sprint iteration path' },
                  workItemTypes: { type: 'array', items: { type: 'string' }, description: 'Types of work items to fetch' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Successfully retrieved stories' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/analyze-requirements': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Analyze story requirements with AI',
        description: 'Uses AI to analyze requirements, identify gaps, and provide testing recommendations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storyId', 'app'],
                properties: {
                  storyId: { type: 'integer', description: 'Work item ID' },
                  app: { type: 'string', description: 'Application name' },
                  aiModel: { type: 'string', description: 'AI model to use (optional)' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Requirements analysis completed' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/generate-test-cases': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Generate manual test cases for a story',
        description: 'Uses AI to generate detailed manual test cases with steps, preconditions, and expected results',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storyId', 'app'],
                properties: {
                  storyId: { type: 'integer', description: 'Work item ID' },
                  app: { type: 'string', description: 'Application name' },
                  includeNegativeTests: { type: 'boolean', description: 'Include negative test scenarios' },
                  includeEdgeCases: { type: 'boolean', description: 'Include edge case scenarios' },
                  aiModel: { type: 'string', description: 'AI model to use (optional)' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Test cases generated successfully' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/defects': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get all defects',
        description: 'Retrieves all bugs/defects from Azure DevOps',
        parameters: [
          { name: 'state', in: 'query', schema: { type: 'string' }, description: 'Filter by state (e.g., Active, Resolved)' },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' }, description: 'Filter by assigned user' }
        ],
        responses: {
          200: { description: 'List of defects' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/defects/by-story/{storyId}': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get defects linked to a story',
        description: 'Retrieves all defects linked to a specific work item',
        parameters: [
          { name: 'storyId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Work item ID' }
        ],
        responses: {
          200: { description: 'List of linked defects' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/defects/metrics': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get defect metrics',
        description: 'Retrieves defect metrics including counts, trends, and resolution rates',
        responses: {
          200: { description: 'Defect metrics' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-plans': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get all test plans',
        description: 'Retrieves all test plans from Azure DevOps',
        responses: {
          200: { description: 'List of test plans' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-plans/{planId}/suites': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get test suites for a plan',
        description: 'Retrieves all test suites within a specific test plan',
        parameters: [
          { name: 'planId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Test plan ID' }
        ],
        responses: {
          200: { description: 'List of test suites' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-cases/by-story/{storyId}': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get test cases linked to a story',
        description: 'Retrieves all test cases linked to a specific work item',
        parameters: [
          { name: 'storyId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Work item ID' }
        ],
        responses: {
          200: { description: 'List of linked test cases' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-runs': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get all test runs',
        description: 'Retrieves all test runs from Azure DevOps',
        responses: {
          200: { description: 'List of test runs' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-runs/{runId}/results': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get test results for a run',
        description: 'Retrieves all test results within a specific test run',
        parameters: [
          { name: 'runId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Test run ID' }
        ],
        responses: {
          200: { description: 'List of test results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-execution/metrics': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get test execution metrics',
        description: 'Retrieves test execution metrics including pass rates, coverage, and trends',
        responses: {
          200: { description: 'Test execution metrics' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/test-execution/by-story': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get test execution by story',
        description: 'Retrieves test execution data grouped by work items',
        responses: {
          200: { description: 'Test execution data by story' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/quality-metrics': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get quality metrics',
        description: 'Retrieves comprehensive quality metrics including defect density, test coverage, and velocity',
        responses: {
          200: { description: 'Quality metrics' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/iterations/projects': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get all projects',
        description: 'Retrieves list of all Azure DevOps projects',
        responses: {
          200: { description: 'List of projects' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/iterations/teams': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get teams for a project',
        description: 'Retrieves all teams within a specific project',
        parameters: [
          { name: 'project', in: 'query', required: true, schema: { type: 'string' }, description: 'Project name' }
        ],
        responses: {
          200: { description: 'List of teams' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/iterations/sprints': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get sprints for a team',
        description: 'Retrieves all sprint iterations for a specific team',
        parameters: [
          { name: 'project', in: 'query', required: true, schema: { type: 'string' }, description: 'Project name' },
          { name: 'team', in: 'query', required: true, schema: { type: 'string' }, description: 'Team name' }
        ],
        responses: {
          200: { description: 'List of sprints' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/update-story/preview': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Preview story update',
        description: 'Preview changes before updating a work item in Azure DevOps',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storyId', 'updates'],
                properties: {
                  storyId: { type: 'integer' },
                  updates: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Update preview' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/update-story': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Update a story',
        description: 'Update a work item in Azure DevOps',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storyId', 'updates'],
                properties: {
                  storyId: { type: 'integer' },
                  updates: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Story updated successfully' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/add-comment': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Add comment to work item',
        description: 'Adds a comment to an Azure DevOps work item',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workItemId', 'comment'],
                properties: {
                  workItemId: { type: 'integer' },
                  comment: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Comment added successfully' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/batch-update/preview': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Preview batch update',
        description: 'Preview changes before updating multiple work items',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['updates'],
                properties: {
                  updates: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        storyId: { type: 'integer' },
                        fields: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Batch update preview' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ado/batch-update': {
      post: {
        tags: ['Azure DevOps'],
        summary: 'Batch update work items',
        description: 'Update multiple work items in Azure DevOps',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['updates'],
                properties: {
                  updates: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        storyId: { type: 'integer' },
                        fields: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Batch update completed' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/coverage': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze test coverage',
        description: 'Analyzes test coverage for an application',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app'],
                properties: {
                  app: { type: 'string', description: 'Application name' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Coverage analysis results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/code-scan': {
      post: {
        tags: ['Analysis'],
        summary: 'Scan code for analysis',
        description: 'Performs static code analysis on the specified application',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app'],
                properties: {
                  app: { type: 'string', description: 'Application name' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Code analysis results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/test-gaps': {
      post: {
        tags: ['Analysis'],
        summary: 'Identify test gaps',
        description: 'Identifies untested code and test coverage gaps',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app'],
                properties: {
                  app: { type: 'string', description: 'Application name' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Test gap analysis' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/risk/analyze-story': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze story risk',
        description: 'AI-powered risk assessment for a user story',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app', 'story'],
                properties: {
                  app: { type: 'string' },
                  story: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Risk analysis results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/integrations/map': {
      post: {
        tags: ['Analysis'],
        summary: 'Map integration points',
        description: 'Discovers and maps integration points and dependencies',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app'],
                properties: {
                  app: { type: 'string' },
                  integrationType: { type: 'string', enum: ['all', 'http', 'database', 'messageQueue'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Integration map' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/analysis/blast-radius/analyze': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze blast radius',
        description: 'Analyzes the blast radius of code changes to identify affected components and tests',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app', 'changedFiles'],
                properties: {
                  app: { type: 'string' },
                  changedFiles: { type: 'array', items: { type: 'string' } },
                  analysisDepth: { type: 'string', enum: ['shallow', 'moderate', 'deep'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Blast radius analysis' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/playwright/full-automation': {
      post: {
        tags: ['Playwright'],
        summary: 'Full Playwright automation workflow',
        description: 'Chains analyzer and generator: discovers critical UI paths and generates Playwright tests',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app'],
                properties: {
                  app: { type: 'string' },
                  maxPaths: { type: 'integer', description: 'Maximum number of paths to generate tests for' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Automation workflow completed' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/playwright/heal-tests': {
      post: {
        tags: ['Playwright'],
        summary: 'Heal broken Playwright tests',
        description: 'Analyzes test failures and generates fixes automatically',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['testFile', 'testCode', 'errorLog'],
                properties: {
                  testFile: { type: 'string' },
                  testCode: { type: 'string' },
                  errorLog: { type: 'string' },
                  screenshot: { type: 'string', description: 'Base64 encoded screenshot (optional)' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Test healing completed' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/playwright/detect-flaky': {
      post: {
        tags: ['Playwright'],
        summary: 'Detect flaky tests',
        description: 'Analyzes test results to identify flaky tests',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['testResults'],
                properties: {
                  testResults: {
                    type: 'array',
                    items: { type: 'object' }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Flaky test detection results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/tests/analyze-file': {
      post: {
        tags: ['Tests'],
        summary: 'Analyze test file',
        description: 'Analyzes a test file for structure, coverage, and quality',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app', 'filePath'],
                properties: {
                  app: { type: 'string' },
                  filePath: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'File analysis results' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/tests/generate-for-file': {
      post: {
        tags: ['Tests'],
        summary: 'Generate tests for file',
        description: 'Generates unit tests for a specific code file',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app', 'filePath'],
                properties: {
                  app: { type: 'string' },
                  filePath: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Generated tests' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/tests/generate-integration-for-file': {
      post: {
        tags: ['Tests'],
        summary: 'Generate integration tests',
        description: 'Generates integration tests for a specific code file',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['app', 'filePath'],
                properties: {
                  app: { type: 'string' },
                  filePath: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Generated integration tests' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/applications': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get application list',
        description: 'Retrieves list of all configured applications',
        responses: {
          200: { description: 'List of applications' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/code-analysis': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get code analysis data',
        description: 'Retrieves code analysis metrics for dashboard',
        parameters: [
          { name: 'app', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Code analysis data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/coverage': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get coverage data',
        description: 'Retrieves test coverage metrics for dashboard',
        parameters: [
          { name: 'app', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Coverage data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/javascript-analysis': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get JavaScript analysis',
        description: 'Retrieves JavaScript code analysis for dashboard',
        parameters: [
          { name: 'app', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'JavaScript analysis data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/javascript-coverage': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get JavaScript coverage',
        description: 'Retrieves JavaScript test coverage for dashboard',
        parameters: [
          { name: 'app', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'JavaScript coverage data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard overview',
        description: 'Retrieves comprehensive overview metrics for dashboard',
        parameters: [
          { name: 'app', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Dashboard overview data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/aod-summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get AOD summary',
        description: 'Retrieves Azure DevOps summary data for dashboard',
        responses: {
          200: { description: 'AOD summary data' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/dashboard/config/apps': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get app configurations',
        description: 'Retrieves application configurations',
        responses: {
          200: { description: 'App configurations' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/mcp/status': {
      get: {
        tags: ['MCP'],
        summary: 'Get MCP status',
        description: 'Retrieves status of all MCP services',
        responses: {
          200: { description: 'MCP status information' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/mcp/health/{mcpName}': {
      get: {
        tags: ['MCP'],
        summary: 'Check MCP health',
        description: 'Checks health status of a specific MCP service',
        parameters: [
          { name: 'mcpName', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'MCP is healthy' },
          500: { description: 'MCP is unhealthy' }
        }
      }
    },
    '/api/swagger/docs': {
      get: {
        tags: ['Swagger'],
        summary: 'Get Swagger documentation list',
        description: 'Returns list of all available MCP Swagger documentation URLs',
        responses: {
          200: { description: 'List of Swagger docs' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/swagger/aggregated.json': {
      get: {
        tags: ['Swagger'],
        summary: 'Get aggregated API spec',
        description: 'Returns aggregated OpenAPI specification combining all services',
        responses: {
          200: { description: 'Aggregated OpenAPI spec' },
          500: { description: 'Server error' }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns health status of orchestrator and all MCP services',
        responses: {
          200: { description: 'System is healthy' }
        }
      }
    }
  }
};

export default orchestratorApiSpec;
