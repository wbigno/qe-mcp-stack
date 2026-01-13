/**
 * Unit tests for Work Items Routes
 *
 * Tests Express route handlers for work item operations including
 * query, get, update, test case creation, and bulk updates.
 */

import express, { Express } from "express";
import request from "supertest";
import { ADOService } from "../../../src/services/ado-service";
import { createWorkItemsRouter } from "../../../src/routes/work-items";

// Suppress logger output during tests
process.env.LOG_LEVEL = "silent";

describe("Work Items Routes", () => {
  let app: Express;
  let mockAdoService: jest.Mocked<ADOService>;

  beforeEach(() => {
    // Create mock ADOService
    mockAdoService = {
      queryWorkItems: jest.fn(),
      getWorkItemsByIds: jest.fn(),
      getWorkItemsByIdsOrgWide: jest.fn(),
      updateWorkItem: jest.fn(),
      createTestCases: jest.fn(),
      bulkUpdate: jest.fn(),
      getTestPlans: jest.fn(),
      getTestPlan: jest.fn(),
      createTestPlan: jest.fn(),
      getTestSuites: jest.fn(),
      createTestSuite: jest.fn(),
      addTestCasesToSuite: jest.fn(),
      createTestCasesInPlan: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/work-items", createWorkItemsRouter(mockAdoService));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /work-items/query", () => {
    it("should query work items by sprint successfully", async () => {
      const mockWorkItems = [
        {
          id: 123,
          fields: {
            "System.Title": "Story 1",
            "System.State": "Active",
          },
        },
        {
          id: 456,
          fields: {
            "System.Title": "Story 2",
            "System.State": "Active",
          },
        },
      ];

      mockAdoService.queryWorkItems.mockResolvedValueOnce(mockWorkItems);

      const response = await request(app).post("/work-items/query").send({
        sprint: "25.Q4.07",
        project: "MyProject",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockWorkItems,
      });
      expect(mockAdoService.queryWorkItems).toHaveBeenCalledWith({
        sprint: "25.Q4.07",
        project: "MyProject",
      });
    });

    it("should query work items by IDs", async () => {
      const mockWorkItems = [
        {
          id: 123,
          fields: { "System.Title": "Story 1" },
        },
      ];

      mockAdoService.queryWorkItems.mockResolvedValueOnce(mockWorkItems);

      const response = await request(app)
        .post("/work-items/query")
        .send({
          workItemIds: [123],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWorkItems);
    });

    it("should query work items with custom WIQL query", async () => {
      const mockWorkItems = [{ id: 789, fields: {} }];

      mockAdoService.queryWorkItems.mockResolvedValueOnce(mockWorkItems);

      const response = await request(app).post("/work-items/query").send({
        query:
          "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return empty array when no work items found", async () => {
      mockAdoService.queryWorkItems.mockResolvedValueOnce([]);

      const response = await request(app).post("/work-items/query").send({
        sprint: "25.Q4.07",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });

    it("should handle query errors with 500 status", async () => {
      mockAdoService.queryWorkItems.mockRejectedValueOnce(
        new Error("ADO API unavailable"),
      );

      const response = await request(app).post("/work-items/query").send({
        sprint: "25.Q4.07",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "QUERY_FAILED",
          message: "ADO API unavailable",
        },
      });
    });
  });

  describe("POST /work-items/get", () => {
    it("should get work items by IDs successfully", async () => {
      const mockWorkItems = [
        {
          id: 123,
          fields: { "System.Title": "Story 1" },
          relations: [],
        },
        {
          id: 456,
          fields: { "System.Title": "Story 2" },
          relations: [],
        },
      ];

      mockAdoService.getWorkItemsByIds.mockResolvedValueOnce(mockWorkItems);

      const response = await request(app)
        .post("/work-items/get")
        .send({
          ids: [123, 456],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockWorkItems,
      });
      expect(mockAdoService.getWorkItemsByIds).toHaveBeenCalledWith([123, 456]);
    });

    it("should get single work item by ID", async () => {
      const mockWorkItem = [
        {
          id: 123,
          fields: { "System.Title": "Story 1" },
        },
      ];

      mockAdoService.getWorkItemsByIds.mockResolvedValueOnce(mockWorkItem);

      const response = await request(app)
        .post("/work-items/get")
        .send({
          ids: [123],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it("should return 400 when ids array is missing", async () => {
      const response = await request(app).post("/work-items/get").send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "ids array is required",
        },
      });
      expect(mockAdoService.getWorkItemsByIds).not.toHaveBeenCalled();
    });

    it("should return 400 when ids is not an array", async () => {
      const response = await request(app).post("/work-items/get").send({
        ids: 123, // Not an array
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 when ids array is empty", async () => {
      const response = await request(app).post("/work-items/get").send({
        ids: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("ids array is required");
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.getWorkItemsByIds.mockRejectedValueOnce(
        new Error("Work items not found"),
      );

      const response = await request(app)
        .post("/work-items/get")
        .send({
          ids: [999],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "GET_FAILED",
          message: "Work items not found",
        },
      });
    });
  });

  describe("POST /work-items/update", () => {
    it("should update work item successfully", async () => {
      const mockUpdatedWorkItem = {
        id: 123,
        fields: {
          "System.Title": "Updated Title",
          "System.State": "Resolved",
        },
      };

      mockAdoService.updateWorkItem.mockResolvedValueOnce(mockUpdatedWorkItem);

      const response = await request(app)
        .post("/work-items/update")
        .send({
          id: 123,
          fields: {
            "System.Title": "Updated Title",
            "System.State": "Resolved",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedWorkItem,
      });
      expect(mockAdoService.updateWorkItem).toHaveBeenCalledWith({
        id: 123,
        fields: {
          "System.Title": "Updated Title",
          "System.State": "Resolved",
        },
      });
    });

    it("should update single field", async () => {
      const mockUpdatedWorkItem = {
        id: 123,
        fields: { "System.State": "Closed" },
      };

      mockAdoService.updateWorkItem.mockResolvedValueOnce(mockUpdatedWorkItem);

      const response = await request(app)
        .post("/work-items/update")
        .send({
          id: 123,
          fields: {
            "System.State": "Closed",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 400 when id is missing", async () => {
      const response = await request(app)
        .post("/work-items/update")
        .send({
          fields: { "System.State": "Closed" },
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "id and fields are required",
        },
      });
      expect(mockAdoService.updateWorkItem).not.toHaveBeenCalled();
    });

    it("should return 400 when fields are missing", async () => {
      const response = await request(app).post("/work-items/update").send({
        id: 123,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 when both id and fields are missing", async () => {
      const response = await request(app).post("/work-items/update").send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("id and fields are required");
    });

    it("should handle update errors with 500 status", async () => {
      mockAdoService.updateWorkItem.mockRejectedValueOnce(
        new Error("Update validation failed"),
      );

      const response = await request(app)
        .post("/work-items/update")
        .send({
          id: 123,
          fields: { "System.State": "InvalidState" },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "Update validation failed",
        },
      });
    });
  });

  describe("POST /work-items/create-test-cases", () => {
    it("should create test cases successfully", async () => {
      const mockCreatedTestCases = [
        {
          id: 201,
          fields: { "System.Title": "Test Case 1" },
        },
        {
          id: 202,
          fields: { "System.Title": "Test Case 2" },
        },
      ];

      mockAdoService.createTestCases.mockResolvedValueOnce(
        mockCreatedTestCases,
      );

      const response = await request(app)
        .post("/work-items/create-test-cases")
        .send({
          testCases: [
            {
              title: "Test Case 1",
              steps: [
                {
                  action: "Navigate to page",
                  expectedResult: "Page loads",
                  stepNumber: 1,
                },
              ],
            },
            {
              title: "Test Case 2",
              steps: [
                {
                  action: "Click button",
                  expectedResult: "Action completes",
                  stepNumber: 1,
                },
              ],
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          created: mockCreatedTestCases,
        },
      });
      expect(mockAdoService.createTestCases).toHaveBeenCalled();
    });

    it("should create single test case", async () => {
      const mockCreatedTestCase = [
        {
          id: 201,
          fields: { "System.Title": "Login Test" },
        },
      ];

      mockAdoService.createTestCases.mockResolvedValueOnce(mockCreatedTestCase);

      const response = await request(app)
        .post("/work-items/create-test-cases")
        .send({
          testCases: [
            {
              title: "Login Test",
              steps: [
                {
                  action: "Enter credentials",
                  expectedResult: "Login successful",
                  stepNumber: 1,
                },
              ],
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(1);
    });

    it("should return 400 when testCases array is missing", async () => {
      const response = await request(app)
        .post("/work-items/create-test-cases")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "testCases array is required",
        },
      });
      expect(mockAdoService.createTestCases).not.toHaveBeenCalled();
    });

    it("should return 400 when testCases is not an array", async () => {
      const response = await request(app)
        .post("/work-items/create-test-cases")
        .send({
          testCases: "not-an-array",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should handle creation errors with 500 status", async () => {
      mockAdoService.createTestCases.mockRejectedValueOnce(
        new Error("Insufficient permissions"),
      );

      const response = await request(app)
        .post("/work-items/create-test-cases")
        .send({
          testCases: [
            {
              title: "Test Case",
              steps: [],
            },
          ],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "Insufficient permissions",
        },
      });
    });
  });

  describe("POST /work-items/bulk-update", () => {
    it("should perform bulk update successfully", async () => {
      const mockBulkUpdateResult = {
        updates: [
          {
            type: "story-update",
            data: {
              id: 123,
              fields: { "Custom.TestCases": "Generated 3 test cases" },
            },
          },
          {
            type: "automation-update",
            data: {
              id: 123,
              fields: { "Custom.AutomationRequirements": "High priority" },
            },
          },
        ],
      };

      mockAdoService.bulkUpdate.mockResolvedValueOnce(mockBulkUpdateResult);

      const response = await request(app)
        .post("/work-items/bulk-update")
        .send({
          storyId: 123,
          testCases: [
            { title: "Test 1", steps: [] },
            { title: "Test 2", steps: [] },
            { title: "Test 3", steps: [] },
          ],
          automationReqs: {
            summary: "High priority for automation",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockBulkUpdateResult,
      });
      expect(mockAdoService.bulkUpdate).toHaveBeenCalledWith({
        storyId: 123,
        testCases: [
          { title: "Test 1", steps: [] },
          { title: "Test 2", steps: [] },
          { title: "Test 3", steps: [] },
        ],
        automationReqs: {
          summary: "High priority for automation",
        },
      });
    });

    it("should perform bulk update with test cases only", async () => {
      const mockResult = {
        updates: [
          {
            type: "story-update",
            data: { id: 123 },
          },
        ],
      };

      mockAdoService.bulkUpdate.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post("/work-items/bulk-update")
        .send({
          storyId: 123,
          testCases: [{ title: "Test 1", steps: [] }],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should perform bulk update with automation requirements only", async () => {
      const mockResult = {
        updates: [
          {
            type: "automation-update",
            data: { id: 123 },
          },
        ],
      };

      mockAdoService.bulkUpdate.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post("/work-items/bulk-update")
        .send({
          storyId: 123,
          automationReqs: {
            summary: "Automation needed",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 400 when storyId is missing", async () => {
      const response = await request(app)
        .post("/work-items/bulk-update")
        .send({
          testCases: [{ title: "Test", steps: [] }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "storyId is required",
        },
      });
      expect(mockAdoService.bulkUpdate).not.toHaveBeenCalled();
    });

    it("should handle bulk update errors with 500 status", async () => {
      mockAdoService.bulkUpdate.mockRejectedValueOnce(
        new Error("Story not found"),
      );

      const response = await request(app)
        .post("/work-items/bulk-update")
        .send({
          storyId: 999,
          testCases: [{ title: "Test", steps: [] }],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "BULK_UPDATE_FAILED",
          message: "Story not found",
        },
      });
    });
  });

  // ============================================
  // TEST PLAN MANAGEMENT ROUTES
  // ============================================

  describe("GET /work-items/test-plans", () => {
    it("should get all test plans successfully", async () => {
      const mockTestPlans = [
        {
          id: 100,
          name: "Sprint 42 Test Plan",
          state: "Active",
          iteration: "Project\\Sprint 42",
          rootSuite: { id: 101, name: "Sprint 42 Test Plan" },
        },
        {
          id: 200,
          name: "Sprint 43 Test Plan",
          state: "Active",
          iteration: "Project\\Sprint 43",
          rootSuite: { id: 201, name: "Sprint 43 Test Plan" },
        },
      ];

      mockAdoService.getTestPlans.mockResolvedValueOnce(mockTestPlans);

      const response = await request(app).get("/work-items/test-plans");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockTestPlans,
      });
      expect(mockAdoService.getTestPlans).toHaveBeenCalled();
    });

    it("should return empty array when no test plans exist", async () => {
      mockAdoService.getTestPlans.mockResolvedValueOnce([]);

      const response = await request(app).get("/work-items/test-plans");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.getTestPlans.mockRejectedValueOnce(
        new Error("ADO API unavailable"),
      );

      const response = await request(app).get("/work-items/test-plans");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "GET_TEST_PLANS_FAILED",
          message: "ADO API unavailable",
        },
      });
    });
  });

  describe("GET /work-items/test-plans/:planId", () => {
    it("should get a specific test plan by ID", async () => {
      const mockTestPlan = {
        id: 100,
        name: "Sprint 42 Test Plan",
        state: "Active",
        rootSuite: { id: 101, name: "Sprint 42 Test Plan" },
      };

      mockAdoService.getTestPlan.mockResolvedValueOnce(mockTestPlan);

      const response = await request(app).get("/work-items/test-plans/100");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockTestPlan,
      });
      expect(mockAdoService.getTestPlan).toHaveBeenCalledWith(100);
    });

    it("should handle non-existent test plan", async () => {
      mockAdoService.getTestPlan.mockRejectedValueOnce(
        new Error("Test plan not found"),
      );

      const response = await request(app).get("/work-items/test-plans/999");

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("GET_TEST_PLAN_FAILED");
    });
  });

  describe("POST /work-items/test-plans", () => {
    it("should create a new test plan", async () => {
      const mockCreatedPlan = {
        id: 300,
        name: "New Test Plan",
        state: "Active",
        rootSuite: { id: 301, name: "New Test Plan" },
      };

      mockAdoService.createTestPlan.mockResolvedValueOnce(mockCreatedPlan);

      const response = await request(app).post("/work-items/test-plans").send({
        name: "New Test Plan",
        iteration: "Project\\Sprint 44",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockCreatedPlan,
      });
      expect(mockAdoService.createTestPlan).toHaveBeenCalledWith({
        name: "New Test Plan",
        iteration: "Project\\Sprint 44",
      });
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app).post("/work-items/test-plans").send({
        iteration: "Project\\Sprint 44",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "name is required",
        },
      });
      expect(mockAdoService.createTestPlan).not.toHaveBeenCalled();
    });
  });

  describe("GET /work-items/test-plans/:planId/suites", () => {
    it("should get test suites for a plan", async () => {
      const mockSuites = [
        {
          id: 100,
          name: "Root Suite",
          suiteType: "StaticTestSuite",
          parentSuite: null,
        },
        {
          id: 101,
          name: "Feature Suite",
          suiteType: "StaticTestSuite",
          parentSuite: { id: 100 },
        },
        {
          id: 102,
          name: "PBI 123: Login Feature",
          suiteType: "RequirementTestSuite",
          parentSuite: { id: 101 },
          requirementId: 123,
        },
      ];

      mockAdoService.getTestSuites.mockResolvedValueOnce(mockSuites);

      const response = await request(app).get(
        "/work-items/test-plans/100/suites",
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockSuites,
      });
      expect(mockAdoService.getTestSuites).toHaveBeenCalledWith(100);
    });

    it("should return empty array when no suites exist", async () => {
      mockAdoService.getTestSuites.mockResolvedValueOnce([]);

      const response = await request(app).get(
        "/work-items/test-plans/100/suites",
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe("POST /work-items/test-plans/:planId/suites", () => {
    it("should create a static test suite", async () => {
      const mockCreatedSuite = {
        id: 200,
        name: "Feature 456: User Auth",
        suiteType: "StaticTestSuite",
      };

      mockAdoService.createTestSuite.mockResolvedValueOnce(mockCreatedSuite);

      const response = await request(app)
        .post("/work-items/test-plans/100/suites")
        .send({
          name: "Feature 456: User Auth",
          suiteType: "StaticTestSuite",
          parentSuiteId: 101,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockCreatedSuite,
      });
      expect(mockAdoService.createTestSuite).toHaveBeenCalledWith({
        planId: 100,
        name: "Feature 456: User Auth",
        suiteType: "StaticTestSuite",
        parentSuiteId: 101,
      });
    });

    it("should create a requirement test suite", async () => {
      const mockCreatedSuite = {
        id: 201,
        name: "PBI 789: Login Page",
        suiteType: "RequirementTestSuite",
        requirementId: 789,
      };

      mockAdoService.createTestSuite.mockResolvedValueOnce(mockCreatedSuite);

      const response = await request(app)
        .post("/work-items/test-plans/100/suites")
        .send({
          name: "PBI 789: Login Page",
          suiteType: "RequirementTestSuite",
          parentSuiteId: 200,
          requirementId: 789,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.requirementId).toBe(789);
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app)
        .post("/work-items/test-plans/100/suites")
        .send({
          suiteType: "StaticTestSuite",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "name and suiteType are required",
      );
    });

    it("should return 400 when suiteType is missing", async () => {
      const response = await request(app)
        .post("/work-items/test-plans/100/suites")
        .send({
          name: "Test Suite",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("POST /work-items/test-plans/:planId/suites/:suiteId/test-cases", () => {
    it("should add test cases to a suite", async () => {
      const mockResult = [{ id: 1001 }, { id: 1002 }];

      mockAdoService.addTestCasesToSuite.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post("/work-items/test-plans/100/suites/200/test-cases")
        .send({
          testCaseIds: [1001, 1002],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockAdoService.addTestCasesToSuite).toHaveBeenCalledWith({
        planId: 100,
        suiteId: 200,
        testCaseIds: [1001, 1002],
      });
    });

    it("should return 400 when testCaseIds is missing", async () => {
      const response = await request(app)
        .post("/work-items/test-plans/100/suites/200/test-cases")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("testCaseIds array is required");
    });

    it("should return 400 when testCaseIds is not an array", async () => {
      const response = await request(app)
        .post("/work-items/test-plans/100/suites/200/test-cases")
        .send({
          testCaseIds: "not-an-array",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("POST /work-items/create-test-cases-in-plan", () => {
    it("should create test cases with full hierarchy", async () => {
      const mockResult = {
        testCases: [
          { id: 1001, fields: { "System.Title": "Test Case 1" } },
          { id: 1002, fields: { "System.Title": "Test Case 2" } },
        ],
        suite: {
          id: 300,
          name: "456: Login Feature",
          suiteType: "RequirementTestSuite",
          requirementId: 456,
        },
      };

      mockAdoService.createTestCasesInPlan.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          testPlanId: 100,
          storyId: 456,
          storyTitle: "Login Feature",
          featureId: 123,
          featureTitle: "User Authentication",
          testCases: [
            {
              title: "Test Case 1",
              steps: [
                {
                  stepNumber: 1,
                  action: "Navigate",
                  expectedResult: "Page loads",
                },
              ],
            },
            {
              title: "Test Case 2",
              steps: [
                {
                  stepNumber: 1,
                  action: "Click",
                  expectedResult: "Action occurs",
                },
              ],
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockAdoService.createTestCasesInPlan).toHaveBeenCalledWith(
        100, // testPlanId
        456, // storyId
        "Login Feature", // storyTitle
        expect.any(Array), // testCases
        123, // featureId
        "User Authentication", // featureTitle
      );
    });

    it("should create test cases without feature (directly under root)", async () => {
      const mockResult = {
        testCases: [{ id: 1001 }],
        suite: {
          id: 300,
          name: "456: Story",
          suiteType: "RequirementTestSuite",
        },
      };

      mockAdoService.createTestCasesInPlan.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          testPlanId: 100,
          storyId: 456,
          storyTitle: "Story",
          testCases: [{ title: "Test 1", steps: [] }],
        });

      expect(response.status).toBe(200);
      expect(mockAdoService.createTestCasesInPlan).toHaveBeenCalledWith(
        100,
        456,
        "Story",
        expect.any(Array),
        undefined, // no featureId
        undefined, // no featureTitle
      );
    });

    it("should return 400 when testPlanId is missing", async () => {
      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          storyId: 456,
          storyTitle: "Story",
          testCases: [{ title: "Test", steps: [] }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "testPlanId, storyId, storyTitle, and testCases are required",
      );
    });

    it("should return 400 when storyId is missing", async () => {
      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          testPlanId: 100,
          storyTitle: "Story",
          testCases: [{ title: "Test", steps: [] }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 when testCases is missing", async () => {
      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          testPlanId: 100,
          storyId: 456,
          storyTitle: "Story",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.createTestCasesInPlan.mockRejectedValueOnce(
        new Error("Test plan not found"),
      );

      const response = await request(app)
        .post("/work-items/create-test-cases-in-plan")
        .send({
          testPlanId: 999,
          storyId: 456,
          storyTitle: "Story",
          testCases: [{ title: "Test", steps: [] }],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "CREATE_TEST_CASES_IN_PLAN_FAILED",
          message: "Test plan not found",
        },
      });
    });
  });
});
