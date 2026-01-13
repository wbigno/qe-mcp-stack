/**
 * Azure DevOps API Service
 */

import axios, { AxiosInstance } from "axios";
import { logger, ServiceError } from "@qe-mcp-stack/shared";
import {
  ADOConfig,
  WorkItem,
  WorkItemQueryRequest,
  WorkItemUpdateRequest,
  CreateTestCasesRequest,
  BulkUpdateRequest,
  ADOProject,
  ADOTeam,
  ADOSprint,
  WIQLQueryResult,
  TestPlan,
  TestSuite,
  CreateTestPlanRequest,
  CreateTestSuiteRequest,
  AddTestCasesToSuiteRequest,
} from "../types";

export class ADOService {
  private client: AxiosInstance;
  private orgClient: AxiosInstance;
  private config: ADOConfig;

  constructor(config: ADOConfig) {
    this.config = config;

    // Client for project-specific APIs
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}/${config.project}/_apis`,
      auth: {
        username: "",
        password: config.pat,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Client for organization-level APIs
    this.orgClient = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}/_apis`,
      auth: {
        username: "",
        password: config.pat,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Query work items by sprint, custom query, or specific IDs
   */
  async queryWorkItems(request: WorkItemQueryRequest): Promise<WorkItem[]> {
    try {
      const { workItemIds, sprint, query, project, team } = request;

      // If specific work item IDs are provided, fetch them directly
      if (workItemIds && workItemIds.length > 0) {
        return await this.getWorkItemsByIds(workItemIds);
      }

      // Build iteration path condition for sprint queries
      let iterationPathCondition = "";
      if (sprint) {
        const fullIterationPath = this.buildIterationPath(
          sprint,
          project,
          team,
        );
        iterationPathCondition = `AND [System.IterationPath] UNDER '${fullIterationPath}'`;
      }

      // Build WIQL query
      const wiql =
        query ||
        `SELECT [System.Id], [System.Title], [System.State], [System.IterationPath], [System.WorkItemType], [System.AssignedTo], [System.Tags]
        FROM WorkItems
        WHERE [System.TeamProject] = '${project || this.config.project}'
        ${iterationPathCondition}
        ORDER BY [System.Id] DESC`;

      logger.info("Executing WIQL query", { wiql });

      // Execute WIQL query
      const queryResponse = await this.client.post<WIQLQueryResult>(
        `/wit/wiql?api-version=${this.config.apiVersion}`,
        { query: wiql },
      );

      const idsFromQuery = queryResponse.data.workItems.map((wi) => wi.id);

      if (idsFromQuery.length === 0) {
        logger.info("No work items found for query");
        return [];
      }

      logger.info(`Found ${idsFromQuery.length} work items`);

      // Fetch full work item details with relations
      return await this.getWorkItemsByIds(idsFromQuery);
    } catch (error: any) {
      logger.error("Failed to query work items", {
        error: error.message,
        details: error.response?.data,
      });
      throw new ServiceError(
        `Failed to query work items: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get specific work items by IDs (project-scoped)
   */
  async getWorkItemsByIds(ids: number[]): Promise<WorkItem[]> {
    try {
      const response = await this.client.get<{ value: WorkItem[] }>(
        `/wit/workitems?ids=${ids.join(",")}&$expand=relations&api-version=${this.config.apiVersion}`,
      );

      return response.data.value || [];
    } catch (error: any) {
      logger.error("Failed to get work items", {
        error: error.message,
        ids,
      });
      throw new ServiceError(
        `Failed to get work items: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get specific work items by IDs (organization-wide)
   * This allows fetching work items from any project in the organization
   */
  async getWorkItemsByIdsOrgWide(ids: number[]): Promise<WorkItem[]> {
    try {
      logger.info("Fetching work items org-wide", { ids });
      const response = await this.orgClient.get<{ value: WorkItem[] }>(
        `/wit/workitems?ids=${ids.join(",")}&$expand=relations&api-version=${this.config.apiVersion}`,
      );

      return response.data.value || [];
    } catch (error: any) {
      logger.error("Failed to get work items org-wide", {
        error: error.message,
        ids,
      });
      throw new ServiceError(
        `Failed to get work items org-wide: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Update a work item
   */
  async updateWorkItem(request: WorkItemUpdateRequest): Promise<WorkItem> {
    try {
      const { id, fields } = request;

      // Build JSON Patch document
      const patchDoc = Object.entries(fields).map(([field, value]) => ({
        op: "add",
        path: `/fields/${field}`,
        value,
      }));

      const response = await this.client.patch<WorkItem>(
        `/wit/workitems/${id}?api-version=${this.config.apiVersion}`,
        patchDoc,
        {
          headers: { "Content-Type": "application/json-patch+json" },
        },
      );

      logger.info("Work item updated", { id, fields: Object.keys(fields) });

      return response.data;
    } catch (error: any) {
      logger.error("Failed to update work item", {
        error: error.message,
        id: request.id,
      });
      throw new ServiceError(
        `Failed to update work item: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Create test cases
   */
  async createTestCases(request: CreateTestCasesRequest): Promise<WorkItem[]> {
    try {
      const { testCases } = request;
      const created: WorkItem[] = [];

      for (const testCase of testCases) {
        const doc = [
          { op: "add", path: "/fields/System.Title", value: testCase.title },
          {
            op: "add",
            path: "/fields/System.WorkItemType",
            value: "Test Case",
          },
          {
            op: "add",
            path: "/fields/Microsoft.VSTS.TCM.Steps",
            value: JSON.stringify(testCase.steps),
          },
        ];

        const response = await this.client.post<WorkItem>(
          `/wit/workitems/$Test Case?api-version=${this.config.apiVersion}`,
          doc,
          {
            headers: { "Content-Type": "application/json-patch+json" },
          },
        );

        created.push(response.data);
      }

      logger.info("Test cases created", { count: created.length });

      return created;
    } catch (error: any) {
      logger.error("Failed to create test cases", {
        error: error.message,
      });
      throw new ServiceError(
        `Failed to create test cases: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Bulk update work items
   */
  async bulkUpdate(
    request: BulkUpdateRequest,
  ): Promise<{ updates: Array<{ type: string; data: WorkItem }> }> {
    try {
      const { storyId, testCases, automationReqs } = request;
      const updates: Array<{ type: string; data: WorkItem }> = [];

      // Update story with test cases summary
      if (testCases) {
        const patchDoc = [
          {
            op: "add",
            path: "/fields/Custom.TestCases",
            value: `Generated ${testCases.length} test cases`,
          },
        ];

        const response = await this.client.patch<WorkItem>(
          `/wit/workitems/${storyId}?api-version=${this.config.apiVersion}`,
          patchDoc,
          {
            headers: { "Content-Type": "application/json-patch+json" },
          },
        );

        updates.push({ type: "story-update", data: response.data });
      }

      // Add automation requirements
      if (automationReqs) {
        const patchDoc = [
          {
            op: "add",
            path: "/fields/Custom.AutomationRequirements",
            value: automationReqs.summary || JSON.stringify(automationReqs),
          },
        ];

        const response = await this.client.patch<WorkItem>(
          `/wit/workitems/${storyId}?api-version=${this.config.apiVersion}`,
          patchDoc,
          {
            headers: { "Content-Type": "application/json-patch+json" },
          },
        );

        updates.push({ type: "automation-update", data: response.data });
      }

      logger.info("Bulk update completed", {
        storyId,
        updateCount: updates.length,
      });

      return { updates };
    } catch (error: any) {
      logger.error("Failed to bulk update", {
        error: error.message,
        storyId: request.storyId,
      });
      throw new ServiceError(
        `Failed to bulk update: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get all projects in the organization
   */
  async getProjects(): Promise<ADOProject[]> {
    try {
      const response = await this.orgClient.get<{ value: ADOProject[] }>(
        `/projects?api-version=${this.config.apiVersion}`,
      );

      return response.data.value.map((p) => ({
        name: p.name,
        id: p.id,
      }));
    } catch (error: any) {
      logger.error("Failed to get projects", {
        error: error.message,
      });
      throw new ServiceError(
        `Failed to get projects: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get teams for a project
   */
  async getTeams(project: string): Promise<ADOTeam[]> {
    try {
      const response = await this.orgClient.get<{ value: ADOTeam[] }>(
        `/projects/${project}/teams?api-version=${this.config.apiVersion}`,
      );

      return response.data.value.map((t) => ({
        name: t.name,
        id: t.id,
      }));
    } catch (error: any) {
      logger.error("Failed to get teams", {
        error: error.message,
        project,
      });
      throw new ServiceError(
        `Failed to get teams: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get sprints for a team
   */
  async getSprints(project: string, team: string): Promise<ADOSprint[]> {
    try {
      const response = await axios.get<{ value: ADOSprint[] }>(
        `https://dev.azure.com/${this.config.organization}/${project}/${team}/_apis/work/teamsettings/iterations?api-version=${this.config.apiVersion}`,
        {
          auth: {
            username: "",
            password: this.config.pat,
          },
        },
      );

      return response.data.value.map((s) => ({
        name: s.name,
        path: s.path,
        id: s.id,
        startDate: s.attributes?.startDate,
        finishDate: s.attributes?.finishDate,
      }));
    } catch (error: any) {
      logger.error("Failed to get sprints", {
        error: error.message,
        project,
        team,
      });
      throw new ServiceError(
        `Failed to get sprints: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Build full iteration path from sprint name
   */
  private buildIterationPath(
    sprint: string,
    project?: string,
    team?: string,
  ): string {
    // If sprint already contains backslashes, it's already a full or partial path
    if (sprint.includes("\\")) {
      return sprint;
    }

    // Build full path: Project\Team\Year\Quarter\Sprint
    const projectName = project || this.config.project;
    const teamName = team || "";

    // Extract year and quarter from sprint name (e.g., "25.Q4.07" -> "2025" and "Q4")
    const sprintMatch = sprint.match(/^(\d{2})\.Q(\d)\.(\d{2})$/);
    if (sprintMatch) {
      const year = `20${sprintMatch[1]}`; // 25 -> 2025
      const quarter = `Q${sprintMatch[2]}`; // Q4

      if (teamName) {
        return `${projectName}\\${teamName}\\${year}\\${quarter}\\${sprint}`;
      } else {
        return `${projectName}\\${year}\\${quarter}\\${sprint}`;
      }
    }

    // Can't parse sprint format, try with just project
    return `${projectName}\\${sprint}`;
  }

  // ============================================
  // TEST PLAN MANAGEMENT METHODS
  // ============================================

  /**
   * Get all test plans
   */
  /**
   * Get a project-specific axios client
   * If project is provided and different from default, creates a new client
   */
  private getProjectClient(project?: string): AxiosInstance {
    if (!project || project === this.config.project) {
      return this.client;
    }
    // Create a client for the specified project
    return axios.create({
      baseURL: `https://dev.azure.com/${this.config.organization}/${project}/_apis`,
      auth: {
        username: "",
        password: this.config.pat,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getTestPlans(project?: string): Promise<TestPlan[]> {
    try {
      const client = this.getProjectClient(project);
      const response = await client.get<{ value: TestPlan[] }>(
        `/testplan/plans?api-version=${this.config.apiVersion}`,
      );

      logger.info("Retrieved test plans", {
        project: project || this.config.project,
        count: response.data.value?.length || 0,
      });
      return response.data.value || [];
    } catch (error: any) {
      logger.error("Failed to get test plans", {
        project: project || this.config.project,
        error: error.message,
      });
      throw new ServiceError(
        `Failed to get test plans: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get a specific test plan by ID
   */
  async getTestPlan(planId: number): Promise<TestPlan> {
    try {
      const response = await this.client.get<TestPlan>(
        `/testplan/plans/${planId}?api-version=${this.config.apiVersion}`,
      );

      return response.data;
    } catch (error: any) {
      logger.error("Failed to get test plan", { error: error.message, planId });
      throw new ServiceError(
        `Failed to get test plan: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Create a new test plan
   */
  async createTestPlan(request: CreateTestPlanRequest): Promise<TestPlan> {
    try {
      const response = await this.client.post<TestPlan>(
        `/testplan/plans?api-version=${this.config.apiVersion}`,
        {
          name: request.name,
          area: request.areaPath ? { name: request.areaPath } : undefined,
          iteration: request.iteration,
          description: request.description,
        },
      );

      logger.info("Created test plan", {
        planId: response.data.id,
        name: request.name,
      });
      return response.data;
    } catch (error: any) {
      logger.error("Failed to create test plan", {
        error: error.message,
        name: request.name,
      });
      throw new ServiceError(
        `Failed to create test plan: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get test suites for a plan
   */
  async getTestSuites(planId: number): Promise<TestSuite[]> {
    try {
      const response = await this.client.get<{ value: TestSuite[] }>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
      );

      logger.info("Retrieved test suites", {
        planId,
        count: response.data.value?.length || 0,
      });
      return response.data.value || [];
    } catch (error: any) {
      logger.error("Failed to get test suites", {
        error: error.message,
        planId,
      });
      throw new ServiceError(
        `Failed to get test suites: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get a specific test suite
   */
  async getTestSuite(planId: number, suiteId: number): Promise<TestSuite> {
    try {
      const response = await this.client.get<TestSuite>(
        `/testplan/plans/${planId}/suites/${suiteId}?api-version=${this.config.apiVersion}`,
      );

      return response.data;
    } catch (error: any) {
      logger.error("Failed to get test suite", {
        error: error.message,
        planId,
        suiteId,
      });
      throw new ServiceError(
        `Failed to get test suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Create a test suite (Static, Dynamic, or Requirement-based)
   */
  async createTestSuite(request: CreateTestSuiteRequest): Promise<TestSuite> {
    try {
      const body: any = {
        name: request.name,
        suiteType: request.suiteType,
      };

      // For RequirementTestSuite, link to the work item (PBI/Feature)
      if (
        request.suiteType === "RequirementTestSuite" &&
        request.requirementId
      ) {
        body.requirementId = request.requirementId;
      }

      // For DynamicTestSuite, include the query
      if (request.suiteType === "DynamicTestSuite" && request.queryString) {
        body.queryString = request.queryString;
      }

      // Determine the parent suite (root suite or specified parent)
      const parentSuiteId = request.parentSuiteId;
      const url = parentSuiteId
        ? `/testplan/plans/${request.planId}/suites/${parentSuiteId}?api-version=${this.config.apiVersion}`
        : `/testplan/plans/${request.planId}/suites?api-version=${this.config.apiVersion}`;

      const response = await this.client.post<TestSuite>(url, body);

      logger.info("Created test suite", {
        planId: request.planId,
        suiteId: response.data.id,
        name: request.name,
        type: request.suiteType,
      });
      return response.data;
    } catch (error: any) {
      logger.error("Failed to create test suite", {
        error: error.message,
        planId: request.planId,
        name: request.name,
      });
      throw new ServiceError(
        `Failed to create test suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Find or create a requirement-based test suite for a work item
   */
  async findOrCreateRequirementSuite(
    planId: number,
    workItemId: number,
    workItemTitle: string,
    parentSuiteId?: number,
  ): Promise<TestSuite> {
    try {
      // First, try to find existing suite for this work item
      const suites = await this.getTestSuites(planId);
      const existingSuite = suites.find(
        (s) =>
          s.suiteType === "RequirementTestSuite" &&
          s.requirementId === workItemId,
      );

      if (existingSuite) {
        logger.info("Found existing requirement suite", {
          planId,
          suiteId: existingSuite.id,
          workItemId,
        });
        return existingSuite;
      }

      // Create new requirement-based suite
      return await this.createTestSuite({
        planId,
        parentSuiteId,
        name: `${workItemId}: ${workItemTitle}`,
        suiteType: "RequirementTestSuite",
        requirementId: workItemId,
      });
    } catch (error: any) {
      logger.error("Failed to find or create requirement suite", {
        error: error.message,
        planId,
        workItemId,
      });
      throw new ServiceError(
        `Failed to find or create requirement suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Find or create a static test suite (e.g., for Feature grouping)
   */
  async findOrCreateStaticSuite(
    planId: number,
    suiteName: string,
    parentSuiteId?: number,
  ): Promise<TestSuite> {
    try {
      // First, try to find existing suite with this name
      const suites = await this.getTestSuites(planId);
      const existingSuite = suites.find(
        (s) => s.suiteType === "StaticTestSuite" && s.name === suiteName,
      );

      if (existingSuite) {
        logger.info("Found existing static suite", {
          planId,
          suiteId: existingSuite.id,
          name: suiteName,
        });
        return existingSuite;
      }

      // Create new static suite
      return await this.createTestSuite({
        planId,
        parentSuiteId,
        name: suiteName,
        suiteType: "StaticTestSuite",
      });
    } catch (error: any) {
      logger.error("Failed to find or create static suite", {
        error: error.message,
        planId,
        suiteName,
      });
      throw new ServiceError(
        `Failed to find or create static suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Add test cases to a test suite
   */
  async addTestCasesToSuite(
    request: AddTestCasesToSuiteRequest,
  ): Promise<any[]> {
    try {
      const { planId, suiteId, testCaseIds } = request;
      const results: any[] = [];

      // Add test cases one by one (Azure DevOps API limitation)
      for (const testCaseId of testCaseIds) {
        const response = await this.client.post(
          `/testplan/plans/${planId}/suites/${suiteId}/testcase?api-version=${this.config.apiVersion}`,
          [{ workItem: { id: testCaseId } }],
        );
        results.push(response.data);
      }

      logger.info("Added test cases to suite", {
        planId,
        suiteId,
        count: testCaseIds.length,
      });
      return results;
    } catch (error: any) {
      logger.error("Failed to add test cases to suite", {
        error: error.message,
        planId: request.planId,
        suiteId: request.suiteId,
      });
      throw new ServiceError(
        `Failed to add test cases to suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Create test cases and add them to a test plan with proper hierarchy
   * Hierarchy: Test Plan > Feature Suite (optional) > PBI Suite > Test Cases
   * @param project - Optional project name for cross-project Test Plan operations
   */
  async createTestCasesInPlan(
    testPlanId: number,
    storyId: number,
    storyTitle: string,
    testCases: Array<{
      title: string;
      steps: Array<{
        action: string;
        expectedResult: string;
        stepNumber: number;
      }>;
    }>,
    featureId?: number,
    featureTitle?: string,
    project?: string,
  ): Promise<{ testCases: WorkItem[]; suite: TestSuite }> {
    try {
      // Get project-specific client for Test Plan operations
      const client = this.getProjectClient(project);

      // Get the test plan to find its root suite (using project-specific client)
      const testPlanResponse = await client.get<TestPlan>(
        `/testplan/plans/${testPlanId}?api-version=${this.config.apiVersion}`,
      );
      const testPlan = testPlanResponse.data;
      let parentSuiteId = testPlan.rootSuite?.id;

      logger.info("Retrieved test plan for hierarchy creation", {
        testPlanId,
        project: project || this.config.project,
        rootSuiteId: parentSuiteId,
      });

      // If Feature is provided, create/find Feature suite first
      if (featureId && featureTitle) {
        const featureSuite = await this.findOrCreateStaticSuiteWithClient(
          client,
          testPlanId,
          `Feature ${featureId}: ${featureTitle}`,
          parentSuiteId,
        );
        parentSuiteId = featureSuite.id;
      }

      // Create/find PBI suite under Feature (or root)
      const pbiSuite = await this.findOrCreateRequirementSuiteWithClient(
        client,
        testPlanId,
        storyId,
        storyTitle,
        parentSuiteId,
      );

      // Create test case work items (uses default client - work items are org-scoped)
      const createdTestCases = await this.createTestCases({ testCases });

      // Add test cases to the PBI suite (using project-specific client)
      if (createdTestCases.length > 0) {
        for (const testCase of createdTestCases) {
          await client.post(
            `/testplan/plans/${testPlanId}/suites/${pbiSuite.id}/testcase?api-version=${this.config.apiVersion}`,
            [{ workItem: { id: testCase.id } }],
          );
        }
        logger.info("Added test cases to suite", {
          planId: testPlanId,
          suiteId: pbiSuite.id,
          count: createdTestCases.length,
        });
      }

      logger.info("Created test cases in plan with hierarchy", {
        testPlanId,
        storyId,
        featureId,
        project: project || this.config.project,
        suiteId: pbiSuite.id,
        testCaseCount: createdTestCases.length,
      });

      return {
        testCases: createdTestCases,
        suite: pbiSuite,
      };
    } catch (error: any) {
      logger.error("Failed to create test cases in plan", {
        error: error.message,
        testPlanId,
        storyId,
        project: project || this.config.project,
      });
      throw new ServiceError(
        `Failed to create test cases in plan: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Find or create a static test suite using a specific client
   * (Used internally for cross-project Test Plan operations)
   */
  private async findOrCreateStaticSuiteWithClient(
    client: AxiosInstance,
    planId: number,
    suiteName: string,
    parentSuiteId?: number,
  ): Promise<TestSuite> {
    try {
      // First, try to find existing suite with this name
      const suitesResponse = await client.get<{ value: TestSuite[] }>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
      );
      const suites = suitesResponse.data.value || [];
      const existingSuite = suites.find(
        (s) => s.suiteType === "StaticTestSuite" && s.name === suiteName,
      );

      if (existingSuite) {
        logger.info("Found existing static suite", {
          planId,
          suiteId: existingSuite.id,
          name: suiteName,
        });
        return existingSuite;
      }

      // Create new static suite - parentSuite goes in body, not URL
      const body: any = {
        name: suiteName,
        suiteType: "StaticTestSuite",
      };

      // Add parentSuite if specified
      if (parentSuiteId) {
        body.parentSuite = { id: parentSuiteId };
      }

      const response = await client.post<TestSuite>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
        body,
      );
      logger.info("Created static suite", {
        planId,
        suiteId: response.data.id,
        name: suiteName,
        parentSuiteId,
      });
      return response.data;
    } catch (error: any) {
      logger.error("Failed to find or create static suite", {
        error: error.message,
        planId,
        suiteName,
        parentSuiteId,
        responseData: error.response?.data,
      });
      throw new ServiceError(
        `Failed to find or create static suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Find or create a requirement-based test suite using a specific client
   * (Used internally for cross-project Test Plan operations)
   */
  private async findOrCreateRequirementSuiteWithClient(
    client: AxiosInstance,
    planId: number,
    workItemId: number,
    workItemTitle: string,
    parentSuiteId?: number,
  ): Promise<TestSuite> {
    try {
      // First, try to find existing suite for this work item
      const suitesResponse = await client.get<{ value: TestSuite[] }>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
      );
      const suites = suitesResponse.data.value || [];
      const existingSuite = suites.find(
        (s) =>
          s.suiteType === "RequirementTestSuite" &&
          s.requirementId === workItemId,
      );

      if (existingSuite) {
        logger.info("Found existing requirement suite", {
          planId,
          suiteId: existingSuite.id,
          workItemId,
        });
        return existingSuite;
      }

      // Create new requirement-based suite - parentSuite goes in body, not URL
      const body: any = {
        name: `${workItemId}: ${workItemTitle}`,
        suiteType: "RequirementTestSuite",
        requirementId: workItemId,
      };

      // Add parentSuite if specified
      if (parentSuiteId) {
        body.parentSuite = { id: parentSuiteId };
      }

      const response = await client.post<TestSuite>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
        body,
      );
      logger.info("Created requirement suite", {
        planId,
        suiteId: response.data.id,
        workItemId,
        parentSuiteId,
      });
      return response.data;
    } catch (error: any) {
      logger.error("Failed to find or create requirement suite", {
        error: error.message,
        planId,
        workItemId,
        parentSuiteId,
        responseData: error.response?.data,
      });
      throw new ServiceError(
        `Failed to find or create requirement suite: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }
}
