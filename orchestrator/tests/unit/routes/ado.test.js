import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: ADO (Azure DevOps) Routes
 *
 * Tests Azure DevOps integration endpoints for work items, defects, test management, and quality metrics.
 *
 * NOTE: This is a simplified test suite for the largest route (1939 lines, 22 endpoints).
 * Full detailed tests would exceed token limits, so we focus on:
 * - Success scenarios (200)
 * - Basic error handling (500)
 * - Critical validation (400) for key endpoints
 *
 * Endpoints covered (22 total):
 * All endpoints from pull-stories to batch-update
 */

// ============================================
// TEST DATA FACTORIES - Avoid hardcoded values
// ============================================

/**
 * Creates a mock work item with realistic ADO structure
 * @param {Object} overrides - Override default values
 */
function createMockWorkItem(overrides = {}) {
  const id = overrides.id ?? Math.floor(Math.random() * 100000);
  const defaults = {
    id,
    fields: {
      "System.Title": `Work Item ${id}`,
      "System.WorkItemType": "Product Backlog Item",
      "System.State": "Active",
      "System.IterationPath": "Project\\Sprint 1",
      "System.AreaPath": "Project",
      "System.AssignedTo": { displayName: "Test User" },
      "Microsoft.VSTS.Common.Priority": 2,
      ...overrides.fields,
    },
    relations: overrides.relations ?? [],
  };
  return { ...defaults, ...overrides, fields: defaults.fields };
}

/**
 * Creates a mock MCP response wrapper
 * @param {Array} data - Array of work items or other data
 */
function createMockMcpResponse(data = []) {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a sprint path with project prefix
 * @param {string} project - Project name
 * @param {string} sprint - Sprint name
 */
function createSprintPath(project, sprint) {
  return `${project}\\${sprint}`;
}

describe("ADO Routes", () => {
  let app;
  let mockMcpManager;
  let adoRouter;

  beforeEach(async () => {
    jest.resetModules();

    // Mock callClaude for AI-based endpoints
    await jest.unstable_mockModule("../../../src/utils/aiHelper.js", () => ({
      callClaude: jest.fn().mockResolvedValue(
        JSON.stringify({
          testCases: [
            {
              title: "Test case 1",
              type: "Functional",
              priority: 1,
              preconditions: ["User is logged in"],
              steps: ["Navigate to page", "Click button"],
              expectedResults: ["Page loads", "Action completes"],
              testData: {},
            },
          ],
        }),
      ),
    }));

    // Import routes AFTER mocking
    const adoRouterModule = await import("../../../src/routes/ado.js");
    adoRouter = adoRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/ado", adoRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 2 endpoints per describe block to keep file manageable
  describe("Story Management Endpoints", () => {
    it("POST /pull-stories should pull stories from ADO", async () => {
      // Use factory to create test data - avoids hardcoded values
      const testWorkItem = createMockWorkItem();
      mockMcpManager.callDockerMcp.mockResolvedValue(
        createMockMcpResponse([testWorkItem]),
      );

      const response = await request(app)
        .post("/api/ado/pull-stories")
        .send({ sprint: "Sprint 1" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      // Verify stories is an array (not a nested object) - this would have caught the bug
      expect(Array.isArray(response.body.stories)).toBe(true);
      expect(response.body.count).toBe(1);
      // Verify story structure matches what we sent
      expect(response.body.stories[0]).toHaveProperty("id", testWorkItem.id);
      expect(response.body.stories[0].fields["System.Title"]).toBe(
        testWorkItem.fields["System.Title"],
      );
    });

    it("POST /pull-stories should extract project from sprint path", async () => {
      // Use factory with dynamic project/sprint values
      const testProject = "Test Project";
      const testSprint = "Sprint 1";
      const sprintPath = createSprintPath(testProject, testSprint);

      const testWorkItem = createMockWorkItem({
        fields: { "System.IterationPath": sprintPath },
      });
      mockMcpManager.callDockerMcp.mockResolvedValue(
        createMockMcpResponse([testWorkItem]),
      );

      const response = await request(app)
        .post("/api/ado/pull-stories")
        .send({ sprint: sprintPath });

      expect(response.status).toBe(200);
      expect(response.body.stories).toHaveLength(1);
      expect(response.body.stories[0].id).toBe(testWorkItem.id);
    });

    it("POST /pull-stories should handle empty results", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue(createMockMcpResponse([]));

      const response = await request(app)
        .post("/api/ado/pull-stories")
        .send({ sprint: "Any Sprint" });

      expect(response.status).toBe(200);
      expect(response.body.stories).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("POST /pull-stories should handle MCP errors", async () => {
      mockMcpManager.callDockerMcp.mockRejectedValue(
        new Error("ADO unavailable"),
      );

      const response = await request(app)
        .post("/api/ado/pull-stories")
        .send({});

      expect(response.status).toBe(500);
    });

    it("POST /analyze-requirements should analyze requirements", async () => {
      // First call: get work items
      mockMcpManager.callDockerMcp.mockResolvedValueOnce([
        {
          id: 123,
          fields: {
            "System.Title": "Test Story",
            "System.Description": "<p>Test description</p>",
            "Microsoft.VSTS.Common.AcceptanceCriteria": "<p>Test criteria</p>",
            "System.WorkItemType": "User Story",
            "System.State": "Active",
          },
          relations: [],
        },
      ]);

      const response = await request(app)
        .post("/api/ado/analyze-requirements")
        .send({ storyIds: [123] });

      expect(response.status).toBe(200);
    });

    it("POST /analyze-requirements should return 400 without storyIds", async () => {
      const response = await request(app)
        .post("/api/ado/analyze-requirements")
        .send({});

      expect(response.status).toBe(400);
    });

    it("POST /generate-test-cases should generate test cases", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValueOnce([
        {
          id: 123,
          fields: {
            "System.Title": "Test Story",
            "System.Description": "<p>Test description</p>",
            "Microsoft.VSTS.Common.AcceptanceCriteria": "<p>Test criteria</p>",
          },
        },
      ]);

      const response = await request(app)
        .post("/api/ado/generate-test-cases")
        .send({ storyId: 123 });

      expect(response.status).toBe(200);
    });

    it("POST /generate-test-cases should return 400 without storyId", async () => {
      const response = await request(app)
        .post("/api/ado/generate-test-cases")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("Defects Endpoints", () => {
    it("GET /defects should return defects list", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 1,
          fields: {
            "System.Title": "Bug 1",
            "System.State": "Active",
            "Microsoft.VSTS.Common.Severity": "2 - High",
          },
        },
      ]);

      const response = await request(app).get("/api/ado/defects");

      expect(response.status).toBe(200);
    });

    it("GET /defects/by-story/:storyId should return story defects", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 1,
          fields: {
            "System.Title": "Bug 1",
            "System.State": "Active",
            "Microsoft.VSTS.Common.Severity": "2 - High",
          },
        },
      ]);

      const response = await request(app).get("/api/ado/defects/by-story/123");

      expect(response.status).toBe(200);
    });

    it("GET /defects/metrics should return defect metrics", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 1,
          fields: {
            "System.Title": "Bug 1",
            "System.State": "Active",
            "Microsoft.VSTS.Common.Severity": "2 - High",
            "System.Tags": "Environment:Dev",
          },
        },
      ]);

      const response = await request(app).get("/api/ado/defects/metrics");

      expect(response.status).toBe(200);
    });
  });

  describe("Test Management Endpoints", () => {
    it("GET /test-plans should return test plans", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({
        value: [{ id: 1, name: "Test Plan 1" }],
      });

      const response = await request(app).get("/api/ado/test-plans");

      expect(response.status).toBe(200);
    });

    it("GET /test-plans/:planId/suites should return test suites", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({
        value: [{ id: 1, name: "Test Suite 1" }],
      });

      const response = await request(app).get("/api/ado/test-plans/1/suites");

      expect(response.status).toBe(200);
    });

    it("GET /test-cases/by-story/:storyId should return test cases", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 1,
          fields: {
            "System.Title": "Test Case 1",
            "Microsoft.VSTS.Common.Priority": 1,
          },
        },
      ]);

      const response = await request(app).get(
        "/api/ado/test-cases/by-story/123",
      );

      expect(response.status).toBe(200);
    });

    it("GET /test-runs should return test runs", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 200,
          name: "Test Run 1",
          state: "Completed",
        },
      ]);

      const response = await request(app).get("/api/ado/test-runs");

      expect(response.status).toBe(200);
    });

    it("GET /test-runs/:runId/results should return run results", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 1,
          outcome: "Passed",
          testCase: { id: 1, name: "Test 1" },
        },
      ]);

      const response = await request(app).get("/api/ado/test-runs/200/results");

      expect(response.status).toBe(200);
    });
  });

  describe("Metrics Endpoints", () => {
    it("GET /test-execution/metrics should return metrics", async () => {
      // First call: get test runs
      mockMcpManager.callDockerMcp.mockResolvedValueOnce([
        {
          id: 1,
          name: "Test Run 1",
          state: "Completed",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          isAutomated: true,
          startedDate: "2024-01-01T10:00:00Z",
          tags: "Environment:Dev",
        },
      ]);

      const response = await request(app).get(
        "/api/ado/test-execution/metrics",
      );

      expect(response.status).toBe(200);
    });

    it("GET /test-execution/by-story should return execution by story", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({ stories: [] });

      const response = await request(app).get(
        "/api/ado/test-execution/by-story",
      );

      expect(response.status).toBe(200);
    });

    it("GET /quality-metrics should return quality metrics", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({ codeQuality: 85 });

      const response = await request(app).get("/api/ado/quality-metrics");

      expect(response.status).toBe(200);
    });
  });

  describe("Iterations Endpoints", () => {
    it("GET /iterations/projects should return projects", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({
        success: true,
        data: { projects: [{ id: "1", name: "Project 1" }] },
      });

      const response = await request(app).get("/api/ado/iterations/projects");

      expect(response.status).toBe(200);
    });

    it("GET /iterations/teams should return teams", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({
        success: true,
        data: { teams: [{ id: "1", name: "Team 1" }] },
      });

      const response = await request(app)
        .get("/api/ado/iterations/teams")
        .query({ project: "Project1" });

      expect(response.status).toBe(200);
    });

    it("GET /iterations/sprints should return sprints", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({
        success: true,
        data: {
          sprints: [{ id: "1", name: "Sprint 1", path: "Project\\Sprint 1" }],
        },
      });

      const response = await request(app)
        .get("/api/ado/iterations/sprints")
        .query({ project: "Project1", team: "Team1" });

      expect(response.status).toBe(200);
    });
  });

  describe("Update Operations Endpoints", () => {
    it("POST /update-story/preview should preview updates", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 123,
          fields: { "System.Title": "Test Story", "System.State": "Active" },
        },
      ]);

      const response = await request(app)
        .post("/api/ado/update-story/preview")
        .send({ storyId: 123, updates: { "System.State": "Resolved" } });

      expect(response.status).toBe(200);
    });

    it("POST /update-story should update story", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({ id: 123 });

      const response = await request(app)
        .post("/api/ado/update-story")
        .send({
          storyId: 123,
          updates: { "System.State": "Resolved" },
          confirmed: true,
        });

      expect(response.status).toBe(200);
    });

    it("POST /add-comment should add comment", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({ id: 123 });

      const response = await request(app)
        .post("/api/ado/add-comment")
        .send({ storyId: 123, comment: "Test comment" });

      expect(response.status).toBe(200);
    });

    it("POST /add-comment should return 400 without storyId", async () => {
      const response = await request(app)
        .post("/api/ado/add-comment")
        .send({ comment: "Test comment" });

      expect(response.status).toBe(400);
    });

    it("POST /add-comment should return 400 without comment", async () => {
      const response = await request(app)
        .post("/api/ado/add-comment")
        .send({ storyId: 123 });

      expect(response.status).toBe(400);
    });
  });

  describe("Batch Operations Endpoints", () => {
    it("POST /batch-update/preview should preview batch updates", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue([
        {
          id: 123,
          fields: { "System.Title": "Test Story", "System.State": "Active" },
        },
      ]);

      const response = await request(app)
        .post("/api/ado/batch-update/preview")
        .send({ storyIds: [123], updates: { "System.State": "Resolved" } });

      expect(response.status).toBe(200);
    });

    it("POST /batch-update/preview should return 400 without storyIds", async () => {
      const response = await request(app)
        .post("/api/ado/batch-update/preview")
        .send({ updates: { "System.State": "Resolved" } });

      expect(response.status).toBe(400);
    });

    it("POST /batch-update should execute batch updates", async () => {
      mockMcpManager.callDockerMcp.mockResolvedValue({ id: 123 });

      const response = await request(app)
        .post("/api/ado/batch-update")
        .send({
          storyIds: [123],
          updates: { "System.State": "Resolved" },
          confirmed: true,
        });

      expect(response.status).toBe(200);
    });

    it("POST /batch-update should return 400 without storyIds", async () => {
      const response = await request(app)
        .post("/api/ado/batch-update")
        .send({ updates: { "System.State": "Resolved" }, confirmed: true });

      expect(response.status).toBe(400);
    });

    it("POST /batch-update should handle MCP errors gracefully", async () => {
      mockMcpManager.callDockerMcp.mockRejectedValue(
        new Error("Update failed"),
      );

      const response = await request(app)
        .post("/api/ado/batch-update")
        .send({
          storyIds: [123],
          updates: { "System.State": "Resolved" },
          confirmed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.failed).toBe(1);
    });
  });

  // ============================================
  // Enhanced Work Item Endpoints (Development Links, PR Files, Test Case Comparison)
  // ============================================
  describe("Enhanced Work Item Endpoints", () => {
    /**
     * Creates a mock enhanced work item with development links, attachments, etc.
     */
    function createMockEnhancedWorkItem(overrides = {}) {
      const base = createMockWorkItem(overrides);
      return {
        ...base,
        developmentLinks: overrides.developmentLinks ?? [
          {
            type: "PullRequest",
            artifactUri: "vstfs:///Git/PullRequestId/project-guid/123",
            projectId: "project-guid",
            pullRequestId: 123,
          },
        ],
        attachments: overrides.attachments ?? [
          {
            id: "attach-1",
            name: "requirements.pdf",
            url: "https://dev.azure.com/attachments/attach-1",
            size: 10240,
            createdDate: "2025-01-15T10:00:00Z",
          },
        ],
        relatedWorkItems: overrides.relatedWorkItems ?? [
          { id: 456, relationType: "TestedBy" },
        ],
        parentWorkItem: overrides.parentWorkItem ?? {
          id: 100,
          relationType: "Parent",
        },
        childWorkItems: overrides.childWorkItems ?? [],
      };
    }

    describe("GET /work-item/:id/enhanced", () => {
      it("should return enhanced work item with development links", async () => {
        const mockEnhanced = createMockEnhancedWorkItem({ id: 12345 });
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: [mockEnhanced],
        });

        const response = await request(app).get(
          "/api/ado/work-item/12345/enhanced",
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.workItem).toBeDefined();
        expect(response.body.workItem.id).toBe(12345);
        expect(response.body.workItem.developmentLinks).toBeDefined();
        expect(Array.isArray(response.body.workItem.developmentLinks)).toBe(
          true,
        );
      });

      it("should return 400 for invalid work item id", async () => {
        const response = await request(app).get(
          "/api/ado/work-item/invalid/enhanced",
        );

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("Invalid work item ID");
      });

      it("should return 404 when work item not found", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: [],
        });

        const response = await request(app).get(
          "/api/ado/work-item/99999/enhanced",
        );

        expect(response.status).toBe(404);
      });

      it("should handle MCP errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("ADO unavailable"),
        );

        const response = await request(app).get(
          "/api/ado/work-item/12345/enhanced",
        );

        expect(response.status).toBe(500);
      });
    });

    describe("GET /work-item/:id/pr-files", () => {
      it("should return files changed in linked PRs", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: {
            workItemId: 12345,
            files: [
              "src/services/auth.ts",
              "src/components/Login.tsx",
              "tests/auth.test.ts",
            ],
            pullRequests: [
              {
                id: 123,
                title: "Implement login feature",
                status: "completed",
                files: [
                  "src/services/auth.ts",
                  "src/components/Login.tsx",
                  "tests/auth.test.ts",
                ],
              },
            ],
          },
        });

        const response = await request(app).get(
          "/api/ado/work-item/12345/pr-files",
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.workItemId).toBe(12345);
        expect(Array.isArray(response.body.files)).toBe(true);
        expect(response.body.files).toContain("src/services/auth.ts");
        expect(response.body.pullRequests).toBeDefined();
      });

      it("should return 400 for invalid work item id", async () => {
        const response = await request(app).get(
          "/api/ado/work-item/abc/pr-files",
        );

        expect(response.status).toBe(400);
      });

      it("should return empty arrays when no PRs linked", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: {
            workItemId: 12345,
            files: [],
            pullRequests: [],
          },
        });

        const response = await request(app).get(
          "/api/ado/work-item/12345/pr-files",
        );

        expect(response.status).toBe(200);
        expect(response.body.files).toEqual([]);
        expect(response.body.pullRequests).toEqual([]);
      });
    });

    describe("GET /work-item/:id/existing-test-cases", () => {
      it("should return existing test cases linked to work item", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: [
            {
              id: 5001,
              title: "TC01 PBI-12345: Verify login functionality",
              state: "Active",
              steps: [
                {
                  stepNumber: 1,
                  action: "Navigate to login page",
                  expectedResult: "Login form displayed",
                },
              ],
              linkedWorkItemId: 12345,
            },
          ],
        });

        const response = await request(app).get(
          "/api/ado/work-item/12345/existing-test-cases",
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.testCases)).toBe(true);
        expect(response.body.testCases[0].id).toBe(5001);
        expect(response.body.testCases[0].steps).toBeDefined();
      });

      it("should return 400 for invalid work item id", async () => {
        const response = await request(app).get(
          "/api/ado/work-item/invalid/existing-test-cases",
        );

        expect(response.status).toBe(400);
      });

      it("should return empty array when no test cases exist", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: [],
        });

        const response = await request(app).get(
          "/api/ado/work-item/12345/existing-test-cases",
        );

        expect(response.status).toBe(200);
        expect(response.body.testCases).toEqual([]);
      });
    });

    describe("POST /work-item/:id/compare-test-cases", () => {
      it("should compare generated test cases with existing ones", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: {
            workItemId: 12345,
            workItemTitle: "Login page design",
            existingTestCases: [
              {
                id: 5001,
                title: "TC01 PBI-12345: Verify login functionality",
                state: "Active",
                steps: [],
              },
            ],
            generatedTestCases: [
              {
                title: "TC01 PBI-12345: Verify login functionality",
                steps: [],
              },
              {
                title: "TC02 PBI-12345: Verify logout functionality",
                steps: [],
              },
            ],
            comparisons: [
              {
                generated: {
                  title: "TC01 PBI-12345: Verify login functionality",
                  steps: [],
                },
                existing: { id: 5001, title: "TC01...", steps: [] },
                status: "EXISTS",
                similarity: 95,
              },
              {
                generated: {
                  title: "TC02 PBI-12345: Verify logout functionality",
                  steps: [],
                },
                existing: null,
                status: "NEW",
                similarity: 0,
              },
            ],
            summary: {
              newCount: 1,
              updateCount: 0,
              existsCount: 1,
              totalGenerated: 2,
              totalExisting: 1,
            },
          },
        });

        const response = await request(app)
          .post("/api/ado/work-item/12345/compare-test-cases")
          .send({
            generatedTestCases: [
              {
                title: "TC01 PBI-12345: Verify login functionality",
                steps: [],
              },
              {
                title: "TC02 PBI-12345: Verify logout functionality",
                steps: [],
              },
            ],
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.newCount).toBe(1);
        expect(response.body.summary.existsCount).toBe(1);
        expect(Array.isArray(response.body.comparisons)).toBe(true);
      });

      it("should return 400 for invalid work item id", async () => {
        const response = await request(app)
          .post("/api/ado/work-item/invalid/compare-test-cases")
          .send({ generatedTestCases: [] });

        expect(response.status).toBe(400);
      });

      it("should return 400 when generatedTestCases not provided", async () => {
        const response = await request(app)
          .post("/api/ado/work-item/12345/compare-test-cases")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("generatedTestCases");
      });

      it("should return 400 for empty generated test cases array", async () => {
        const response = await request(app)
          .post("/api/ado/work-item/12345/compare-test-cases")
          .send({ generatedTestCases: [] });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("generatedTestCases");
      });
    });

    describe("PATCH /test-cases/:id", () => {
      it("should update an existing test case", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: {
            id: 5001,
            fields: {
              "System.Title": "Updated test case title",
              "Microsoft.VSTS.TCM.Steps": "<steps>...</steps>",
            },
          },
        });

        const response = await request(app)
          .patch("/api/ado/test-cases/5001")
          .send({
            title: "Updated test case title",
            steps: [
              {
                stepNumber: 1,
                action: "Updated action",
                expectedResult: "Updated expected result",
              },
            ],
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Response uses 'updated' not 'testCase'
        expect(response.body.testCaseId).toBe(5001);
        expect(response.body.updated).toBeDefined();
      });

      it("should return 400 for invalid test case id", async () => {
        const response = await request(app)
          .patch("/api/ado/test-cases/invalid")
          .send({ title: "Test" });

        expect(response.status).toBe(400);
      });

      it("should handle empty update body gracefully", async () => {
        // The endpoint proceeds with empty updateData when no fields provided
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          data: {},
        });

        const response = await request(app)
          .patch("/api/ado/test-cases/5001")
          .send({});

        // Endpoint doesn't validate for empty body - it just proceeds
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it("should handle MCP errors during update", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Update failed"),
        );

        const response = await request(app)
          .patch("/api/ado/test-cases/5001")
          .send({ title: "New title" });

        expect(response.status).toBe(500);
      });
    });
  });
});
