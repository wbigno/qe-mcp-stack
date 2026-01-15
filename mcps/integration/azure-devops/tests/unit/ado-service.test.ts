/**
 * Unit tests for ADOService
 *
 * Tests Azure DevOps API service including work item queries, updates,
 * test case creation, bulk operations, and iteration management.
 */

import { ADOService } from "../../src/services/ado-service";
import {
  ADOConfig,
  WorkItemQueryRequest,
  WorkItemUpdateRequest,
} from "../../src/types";
import axios from "axios";

// Suppress logger output during tests
process.env.LOG_LEVEL = "silent";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ADOService", () => {
  let service: ADOService;
  let config: ADOConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClientInstance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOrgClientInstance: any;

  beforeEach(() => {
    config = {
      pat: "test-pat-token-12345",
      organization: "test-org",
      project: "test-project",
      apiVersion: "7.0",
    };

    // Create mock axios instances
    mockClientInstance = {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
    };

    mockOrgClientInstance = {
      get: jest.fn(),
    };

    // Mock axios.create to return our mock instances
    mockedAxios.create = jest
      .fn()
      .mockReturnValueOnce(mockClientInstance) // First call for client
      .mockReturnValueOnce(mockOrgClientInstance); // Second call for orgClient

    service = new ADOService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create ADOService with provided configuration", () => {
      expect(service).toBeInstanceOf(ADOService);
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });

    it("should create project-specific client with correct baseURL", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "https://dev.azure.com/test-org/test-project/_apis",
          auth: { username: "", password: "test-pat-token-12345" },
        }),
      );
    });

    it("should create organization-level client with correct baseURL", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "https://dev.azure.com/test-org/_apis",
        }),
      );
    });
  });

  describe("buildIterationPath", () => {
    it("should handle sprint name with standard format (25.Q4.07)", () => {
      const request: WorkItemQueryRequest = {
        sprint: "25.Q4.07",
        project: "MyProject",
        team: "MyTeam",
      };

      // Call queryWorkItems which internally uses buildIterationPath
      mockClientInstance.post.mockResolvedValueOnce({
        data: { workItems: [] },
      });

      service.queryWorkItems(request);

      // Verify the WIQL query contains the correctly built iteration path
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.stringContaining(
            "MyProject\\MyTeam\\2025\\Q4\\25.Q4.07",
          ),
        }),
      );
    });

    it("should handle sprint name without team", () => {
      const request: WorkItemQueryRequest = {
        sprint: "25.Q4.07",
        project: "MyProject",
      };

      mockClientInstance.post.mockResolvedValueOnce({
        data: { workItems: [] },
      });

      service.queryWorkItems(request);

      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.stringContaining("MyProject\\2025\\Q4\\25.Q4.07"),
        }),
      );
    });

    it("should handle full iteration path with backslashes", () => {
      const request: WorkItemQueryRequest = {
        sprint: "Project\\Team\\2025\\Q4\\Sprint 7",
        project: "MyProject",
      };

      mockClientInstance.post.mockResolvedValueOnce({
        data: { workItems: [] },
      });

      service.queryWorkItems(request);

      // Should use the path as-is since it contains backslashes
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.stringContaining("Project\\Team\\2025\\Q4\\Sprint 7"),
        }),
      );
    });

    it("should handle non-standard sprint format", () => {
      const request: WorkItemQueryRequest = {
        sprint: "Sprint 1",
        project: "MyProject",
      };

      mockClientInstance.post.mockResolvedValueOnce({
        data: { workItems: [] },
      });

      service.queryWorkItems(request);

      // Should fallback to simple format
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.stringContaining("MyProject\\Sprint 1"),
        }),
      );
    });
  });

  describe("queryWorkItems", () => {
    it("should query work items by sprint", async () => {
      const mockWIQLResponse = {
        data: {
          workItems: [{ id: 123 }, { id: 456 }],
        },
      };

      const mockWorkItemsResponse = {
        data: {
          value: [
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
          ],
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockWIQLResponse);
      mockClientInstance.get.mockResolvedValueOnce(mockWorkItemsResponse);

      const request: WorkItemQueryRequest = {
        sprint: "25.Q4.07",
        project: "MyProject",
      };

      const result = await service.queryWorkItems(request);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(123);
      expect(result[1].id).toBe(456);
      expect(mockClientInstance.post).toHaveBeenCalledTimes(1);
      expect(mockClientInstance.get).toHaveBeenCalledTimes(1);
    });

    it("should query work items by IDs directly", async () => {
      const mockWorkItemsResponse = {
        data: {
          value: [
            {
              id: 123,
              fields: { "System.Title": "Story 1" },
            },
          ],
        },
      };

      mockClientInstance.get.mockResolvedValueOnce(mockWorkItemsResponse);

      const request: WorkItemQueryRequest = {
        workItemIds: [123],
      };

      const result = await service.queryWorkItems(request);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(123);
      // Should NOT call post for WIQL query
      expect(mockClientInstance.post).not.toHaveBeenCalled();
      // Should call get directly
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("workitems?ids=123"),
      );
    });

    it("should query work items with custom WIQL query", async () => {
      const mockWIQLResponse = {
        data: { workItems: [{ id: 789 }] },
      };

      const mockWorkItemsResponse = {
        data: {
          value: [
            { id: 789, fields: { "System.Title": "Custom Query Result" } },
          ],
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockWIQLResponse);
      mockClientInstance.get.mockResolvedValueOnce(mockWorkItemsResponse);

      const request: WorkItemQueryRequest = {
        query:
          "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
      };

      const result = await service.queryWorkItems(request);

      expect(result).toHaveLength(1);
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query:
            "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
        }),
      );
    });

    it("should return empty array when no work items found", async () => {
      mockClientInstance.post.mockResolvedValueOnce({
        data: { workItems: [] },
      });

      const request: WorkItemQueryRequest = {
        sprint: "25.Q4.07",
      };

      const result = await service.queryWorkItems(request);

      expect(result).toEqual([]);
      // Should not call get since no IDs returned
      expect(mockClientInstance.get).not.toHaveBeenCalled();
    });

    it("should handle API errors and throw ServiceError", async () => {
      mockClientInstance.post.mockRejectedValueOnce({
        message: "Network timeout",
        response: { status: 500, data: { message: "Internal server error" } },
      });

      const request: WorkItemQueryRequest = {
        sprint: "25.Q4.07",
      };

      await expect(service.queryWorkItems(request)).rejects.toThrow(
        "Failed to query work items: Network timeout",
      );
    });
  });

  describe("getWorkItemsByIds", () => {
    it("should fetch work items by IDs with relations expanded", async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 123,
              fields: { "System.Title": "Story 1" },
              relations: [
                {
                  rel: "System.LinkTypes.Hierarchy-Forward",
                  url: "work items/456",
                },
              ],
            },
          ],
        },
      };

      mockClientInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getWorkItemsByIds([123]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(123);
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("workitems?ids=123&$expand=relations"),
      );
    });

    it("should handle multiple IDs", async () => {
      mockClientInstance.get.mockResolvedValueOnce({
        data: { value: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      });

      const result = await service.getWorkItemsByIds([1, 2, 3]);

      expect(result).toHaveLength(3);
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("ids=1,2,3"),
      );
    });

    it("should return empty array when API returns no value", async () => {
      mockClientInstance.get.mockResolvedValueOnce({ data: {} });

      const result = await service.getWorkItemsByIds([123]);

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      mockClientInstance.get.mockRejectedValueOnce({
        message: "Not found",
        response: { status: 404 },
      });

      await expect(service.getWorkItemsByIds([999])).rejects.toThrow(
        "Failed to get work items: Not found",
      );
    });
  });

  describe("updateWorkItem", () => {
    it("should update work item with JSON Patch document", async () => {
      const mockResponse = {
        data: {
          id: 123,
          fields: {
            "System.Title": "Updated Title",
            "System.State": "Resolved",
          },
        },
      };

      mockClientInstance.patch.mockResolvedValueOnce(mockResponse);

      const request: WorkItemUpdateRequest = {
        id: 123,
        fields: {
          "System.Title": "Updated Title",
          "System.State": "Resolved",
        },
      };

      const result = await service.updateWorkItem(request);

      expect(result.id).toBe(123);
      expect(mockClientInstance.patch).toHaveBeenCalledWith(
        expect.stringContaining("workitems/123"),
        [
          { op: "add", path: "/fields/System.Title", value: "Updated Title" },
          { op: "add", path: "/fields/System.State", value: "Resolved" },
        ],
        expect.objectContaining({
          headers: { "Content-Type": "application/json-patch+json" },
        }),
      );
    });

    it("should handle single field update", async () => {
      mockClientInstance.patch.mockResolvedValueOnce({
        data: { id: 123, fields: { "System.State": "Closed" } },
      });

      const request: WorkItemUpdateRequest = {
        id: 123,
        fields: {
          "System.State": "Closed",
        },
      };

      const result = await service.updateWorkItem(request);

      expect(result.id).toBe(123);
      expect(mockClientInstance.patch).toHaveBeenCalledWith(
        expect.any(String),
        [{ op: "add", path: "/fields/System.State", value: "Closed" }],
        expect.any(Object),
      );
    });

    it("should handle API errors during update", async () => {
      mockClientInstance.patch.mockRejectedValueOnce({
        message: "Validation failed",
        response: { status: 400 },
      });

      const request: WorkItemUpdateRequest = {
        id: 123,
        fields: { "System.State": "Invalid State" },
      };

      await expect(service.updateWorkItem(request)).rejects.toThrow(
        "Failed to update work item: Validation failed",
      );
    });
  });

  describe("createTestCases", () => {
    it("should create multiple test cases", async () => {
      mockClientInstance.post
        .mockResolvedValueOnce({
          data: { id: 201, fields: { "System.Title": "Test Case 1" } },
        })
        .mockResolvedValueOnce({
          data: { id: 202, fields: { "System.Title": "Test Case 2" } },
        });

      const request = {
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
      };

      const result = await service.createTestCases(request);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(201);
      expect(result[1].id).toBe(202);
      expect(mockClientInstance.post).toHaveBeenCalledTimes(2);
    });

    it("should format test case steps correctly", async () => {
      mockClientInstance.post.mockResolvedValueOnce({
        data: { id: 201, fields: {} },
      });

      const request = {
        testCases: [
          {
            title: "Login Test",
            steps: [
              {
                action: "Enter username",
                expectedResult: "Username accepted",
                stepNumber: 1,
              },
              {
                action: "Enter password",
                expectedResult: "Password accepted",
                stepNumber: 2,
              },
            ],
          },
        ],
      };

      await service.createTestCases(request);

      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("$Test Case"),
        [
          { op: "add", path: "/fields/System.Title", value: "Login Test" },
          {
            op: "add",
            path: "/fields/System.WorkItemType",
            value: "Test Case",
          },
          {
            op: "add",
            path: "/fields/Microsoft.VSTS.TCM.Steps",
            value: expect.any(String),
          },
        ],
        expect.objectContaining({
          headers: { "Content-Type": "application/json-patch+json" },
        }),
      );
    });

    it("should handle API errors during test case creation", async () => {
      mockClientInstance.post.mockRejectedValueOnce({
        message: "Insufficient permissions",
        response: { status: 403 },
      });

      const request = {
        testCases: [{ title: "Test Case", steps: [] }],
      };

      await expect(service.createTestCases(request)).rejects.toThrow(
        "Failed to create test cases: Insufficient permissions",
      );
    });
  });

  describe("bulkUpdate", () => {
    it("should update story with test cases summary", async () => {
      mockClientInstance.patch.mockResolvedValueOnce({
        data: {
          id: 123,
          fields: { "Custom.TestCases": "Generated 5 test cases" },
        },
      });

      const request = {
        storyId: 123,
        testCases: [
          { title: "Test 1", steps: [] },
          { title: "Test 2", steps: [] },
          { title: "Test 3", steps: [] },
          { title: "Test 4", steps: [] },
          { title: "Test 5", steps: [] },
        ],
      };

      const result = await service.bulkUpdate(request);

      expect(result.updates).toHaveLength(1);
      expect(result.updates[0].type).toBe("story-update");
      expect(mockClientInstance.patch).toHaveBeenCalledWith(
        expect.stringContaining("workitems/123"),
        expect.arrayContaining([
          expect.objectContaining({
            path: "/fields/Custom.TestCases",
            value: "Generated 5 test cases",
          }),
        ]),
        expect.any(Object),
      );
    });

    it("should add automation requirements", async () => {
      mockClientInstance.patch.mockResolvedValueOnce({
        data: {
          id: 123,
          fields: { "Custom.AutomationRequirements": "Automation summary" },
        },
      });

      const request = {
        storyId: 123,
        automationReqs: {
          summary: "High priority for automation",
          details: "E2E tests needed",
        },
      };

      const result = await service.bulkUpdate(request);

      expect(result.updates).toHaveLength(1);
      expect(result.updates[0].type).toBe("automation-update");
    });

    it("should handle both test cases and automation requirements", async () => {
      mockClientInstance.patch
        .mockResolvedValueOnce({ data: { id: 123 } })
        .mockResolvedValueOnce({ data: { id: 123 } });

      const request = {
        storyId: 123,
        testCases: [
          { title: "Test 1", steps: [] },
          { title: "Test 2", steps: [] },
          { title: "Test 3", steps: [] },
        ],
        automationReqs: { summary: "Automation needed" },
      };

      const result = await service.bulkUpdate(request);

      expect(result.updates).toHaveLength(2);
      expect(result.updates[0].type).toBe("story-update");
      expect(result.updates[1].type).toBe("automation-update");
      expect(mockClientInstance.patch).toHaveBeenCalledTimes(2);
    });

    it("should handle API errors during bulk update", async () => {
      mockClientInstance.patch.mockRejectedValueOnce({
        message: "Story not found",
        response: { status: 404 },
      });

      const request = {
        storyId: 999,
        testCases: [
          { title: "Test 1", steps: [] },
          { title: "Test 2", steps: [] },
          { title: "Test 3", steps: [] },
        ],
      };

      await expect(service.bulkUpdate(request)).rejects.toThrow(
        "Failed to bulk update: Story not found",
      );
    });
  });

  describe("getProjects", () => {
    it("should fetch all projects in organization", async () => {
      mockOrgClientInstance.get.mockResolvedValueOnce({
        data: {
          value: [
            { id: "proj-1", name: "Project 1" },
            { id: "proj-2", name: "Project 2" },
          ],
        },
      });

      const result = await service.getProjects();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "proj-1", name: "Project 1" });
      expect(result[1]).toEqual({ id: "proj-2", name: "Project 2" });
      expect(mockOrgClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("/projects?api-version="),
      );
    });

    it("should handle empty projects list", async () => {
      mockOrgClientInstance.get.mockResolvedValueOnce({
        data: { value: [] },
      });

      const result = await service.getProjects();

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      mockOrgClientInstance.get.mockRejectedValueOnce({
        message: "Unauthorized",
        response: { status: 401 },
      });

      await expect(service.getProjects()).rejects.toThrow(
        "Failed to get projects: Unauthorized",
      );
    });
  });

  describe("getTeams", () => {
    it("should fetch teams for a project", async () => {
      mockOrgClientInstance.get.mockResolvedValueOnce({
        data: {
          value: [
            { id: "team-1", name: "Team Alpha" },
            { id: "team-2", name: "Team Beta" },
          ],
        },
      });

      const result = await service.getTeams("MyProject");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "team-1", name: "Team Alpha" });
      expect(mockOrgClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("/projects/MyProject/teams"),
      );
    });

    it("should handle API errors", async () => {
      mockOrgClientInstance.get.mockRejectedValueOnce({
        message: "Project not found",
        response: { status: 404 },
      });

      await expect(service.getTeams("NonExistentProject")).rejects.toThrow(
        "Failed to get teams: Project not found",
      );
    });
  });

  describe("getSprints", () => {
    it("should fetch sprints for a team", async () => {
      mockedAxios.get = jest.fn().mockResolvedValueOnce({
        data: {
          value: [
            {
              id: "sprint-1",
              name: "25.Q4.07",
              path: "Project\\Team\\2025\\Q4\\25.Q4.07",
              attributes: {
                startDate: "2025-01-01T00:00:00Z",
                finishDate: "2025-01-14T00:00:00Z",
              },
            },
          ],
        },
      });

      const result = await service.getSprints("MyProject", "MyTeam");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "sprint-1",
        name: "25.Q4.07",
        path: "Project\\Team\\2025\\Q4\\25.Q4.07",
        startDate: "2025-01-01T00:00:00Z",
        finishDate: "2025-01-14T00:00:00Z",
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("teamsettings/iterations"),
        expect.objectContaining({
          auth: { username: "", password: "test-pat-token-12345" },
        }),
      );
    });

    it("should handle sprints without attributes", async () => {
      mockedAxios.get = jest.fn().mockResolvedValueOnce({
        data: {
          value: [
            {
              id: "sprint-1",
              name: "Sprint 1",
              path: "Project\\Sprint 1",
            },
          ],
        },
      });

      const result = await service.getSprints("MyProject", "MyTeam");

      expect(result[0].startDate).toBeUndefined();
      expect(result[0].finishDate).toBeUndefined();
    });

    it("should handle API errors", async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce({
        message: "Team not found",
        response: { status: 404 },
      });

      await expect(
        service.getSprints("MyProject", "NonExistentTeam"),
      ).rejects.toThrow("Failed to get sprints: Team not found");
    });
  });

  // ============================================
  // TEST PLAN MANAGEMENT TESTS
  // ============================================

  describe("getTestPlans", () => {
    it("should fetch all test plans", async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 100, name: "Test Plan 1", state: "Active" },
            { id: 200, name: "Test Plan 2", state: "Active" },
          ],
        },
      };

      mockClientInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getTestPlans();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(100);
      expect(result[1].id).toBe(200);
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("testplan/plans"),
      );
    });

    it("should return empty array when no test plans exist", async () => {
      mockClientInstance.get.mockResolvedValueOnce({
        data: { value: [] },
      });

      const result = await service.getTestPlans();

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      mockClientInstance.get.mockRejectedValueOnce({
        message: "Permission denied",
        response: { status: 403 },
      });

      await expect(service.getTestPlans()).rejects.toThrow(
        "Failed to get test plans: Permission denied",
      );
    });
  });

  describe("getTestPlan", () => {
    it("should fetch a specific test plan by ID", async () => {
      const mockResponse = {
        data: {
          id: 100,
          name: "Sprint 42 Test Plan",
          state: "Active",
          rootSuite: { id: 101 },
        },
      };

      mockClientInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getTestPlan(100);

      expect(result.id).toBe(100);
      expect(result.name).toBe("Sprint 42 Test Plan");
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("testplan/plans/100"),
      );
    });
  });

  describe("createTestPlan", () => {
    it("should create a new test plan", async () => {
      const mockResponse = {
        data: {
          id: 300,
          name: "New Test Plan",
          state: "Active",
          rootSuite: { id: 301 },
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.createTestPlan({
        name: "New Test Plan",
        iteration: "Project\\Sprint 44",
      });

      expect(result.id).toBe(300);
      expect(result.name).toBe("New Test Plan");
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("testplan/plans"),
        expect.objectContaining({
          name: "New Test Plan",
          iteration: "Project\\Sprint 44",
        }),
      );
    });

    it("should handle creation errors", async () => {
      mockClientInstance.post.mockRejectedValueOnce({
        message: "Invalid iteration path",
        response: { status: 400 },
      });

      await expect(
        service.createTestPlan({
          name: "Test Plan",
          iteration: "Invalid\\Path",
        }),
      ).rejects.toThrow("Failed to create test plan: Invalid iteration path");
    });
  });

  describe("getTestSuites", () => {
    it("should fetch test suites for a plan", async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 100, name: "Root Suite", suiteType: "StaticTestSuite" },
            {
              id: 101,
              name: "Feature Suite",
              suiteType: "StaticTestSuite",
              parentSuite: { id: 100 },
            },
          ],
        },
      };

      mockClientInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getTestSuites(100);

      expect(result).toHaveLength(2);
      expect(result[0].suiteType).toBe("StaticTestSuite");
      expect(mockClientInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("testplan/plans/100/suites"),
      );
    });
  });

  describe("createTestSuite", () => {
    it("should create a static test suite", async () => {
      const mockResponse = {
        data: {
          id: 200,
          name: "Feature Suite",
          suiteType: "StaticTestSuite",
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.createTestSuite({
        planId: 100,
        name: "Feature Suite",
        suiteType: "StaticTestSuite",
        parentSuiteId: 101,
      });

      expect(result.id).toBe(200);
      expect(result.suiteType).toBe("StaticTestSuite");
    });

    it("should create a requirement test suite", async () => {
      const mockResponse = {
        data: {
          id: 201,
          name: "PBI 456",
          suiteType: "RequirementTestSuite",
          requirementId: 456,
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.createTestSuite({
        planId: 100,
        name: "PBI 456",
        suiteType: "RequirementTestSuite",
        parentSuiteId: 200,
        requirementId: 456,
      });

      expect(result.requirementId).toBe(456);
    });
  });

  describe("addTestCasesToSuite", () => {
    it("should add test cases to a suite", async () => {
      const mockResponse = {
        data: {
          value: [{ id: 1001 }, { id: 1002 }],
        },
      };

      mockClientInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await service.addTestCasesToSuite({
        planId: 100,
        suiteId: 200,
        testCaseIds: [1001, 1002],
      });

      expect(result).toHaveLength(2);
      expect(mockClientInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("suites/200/testcases"),
        expect.any(Array),
      );
    });
  });

  describe("createTestCasesInPlan", () => {
    it("should create test cases with full hierarchy", async () => {
      // Mock getTestSuites to return empty (no existing suites)
      mockClientInstance.get.mockResolvedValueOnce({
        data: {
          value: [{ id: 100, name: "Root", suiteType: "StaticTestSuite" }],
        },
      });

      // Mock createTestSuite for feature suite
      mockClientInstance.post.mockResolvedValueOnce({
        data: { id: 200, name: "Feature 123", suiteType: "StaticTestSuite" },
      });

      // Mock getTestSuites again
      mockClientInstance.get.mockResolvedValueOnce({
        data: {
          value: [
            { id: 100, name: "Root" },
            { id: 200, name: "Feature 123" },
          ],
        },
      });

      // Mock createTestSuite for PBI suite
      mockClientInstance.post.mockResolvedValueOnce({
        data: {
          id: 300,
          name: "456: Story",
          suiteType: "RequirementTestSuite",
          requirementId: 456,
        },
      });

      // Mock createTestCases
      mockClientInstance.post
        .mockResolvedValueOnce({
          data: { id: 1001, fields: { "System.Title": "Test 1" } },
        })
        .mockResolvedValueOnce({
          data: { id: 1002, fields: { "System.Title": "Test 2" } },
        });

      // Mock addTestCasesToSuite
      mockClientInstance.post.mockResolvedValueOnce({
        data: { value: [{ id: 1001 }, { id: 1002 }] },
      });

      const result = await service.createTestCasesInPlan(
        100, // testPlanId
        456, // storyId
        "Story Title", // storyTitle
        [
          { title: "Test 1", steps: [] },
          { title: "Test 2", steps: [] },
        ],
        123, // featureId
        "Feature Title", // featureTitle
      );

      expect(result.suite).toBeDefined();
      expect(result.testCases).toBeDefined();
    });
  });
});
