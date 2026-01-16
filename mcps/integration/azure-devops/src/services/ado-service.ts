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
  EnhancedWorkItem,
  DevelopmentLink,
  Attachment,
  PullRequest,
  PullRequestChange,
  PullRequestIteration,
  ExistingTestCase,
  ParsedTestStep,
  TestCaseComparison,
  TestCaseComparisonResult,
  TestCase,
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
   * Convert test steps to Azure DevOps XML format
   * ADO expects steps in this format:
   * <steps id="0" last="N">
   *   <step id="1" type="ActionStep">
   *     <parameterizedString isformatted="true">Action</parameterizedString>
   *     <parameterizedString isformatted="true">Expected Result</parameterizedString>
   *   </step>
   * </steps>
   */
  private formatStepsAsXml(
    steps: Array<{
      action: string;
      expectedResult: string;
      stepNumber: number;
    }>,
  ): string {
    if (!steps || steps.length === 0) {
      return '<steps id="0" last="0"></steps>';
    }

    // Sort by step number
    const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
    const lastStepId = sortedSteps.length;

    // Escape XML special characters
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const stepElements = sortedSteps
      .map((step, index) => {
        const stepId = index + 1;
        const action = escapeXml(step.action || "");
        const expected = escapeXml(step.expectedResult || "");
        return `<step id="${stepId}" type="ActionStep"><parameterizedString isformatted="true">${action}</parameterizedString><parameterizedString isformatted="true">${expected}</parameterizedString></step>`;
      })
      .join("");

    return `<steps id="0" last="${lastStepId}">${stepElements}</steps>`;
  }

  /**
   * Create test cases
   */
  async createTestCases(request: CreateTestCasesRequest): Promise<WorkItem[]> {
    try {
      const { testCases } = request;
      const created: WorkItem[] = [];

      for (const testCase of testCases) {
        // Format steps as XML for Azure DevOps
        const stepsXml = this.formatStepsAsXml(testCase.steps);

        // Log the XML being sent for debugging
        logger.info("Creating test case with steps", {
          title: testCase.title,
          stepCount: testCase.steps?.length || 0,
          stepsXmlPreview: stepsXml.substring(0, 200),
        });

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
            value: stepsXml,
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
        logger.info("Created test case", {
          id: response.data.id,
          title: testCase.title,
          stepCount: testCase.steps?.length || 0,
        });
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
      // Normalize suite name for comparison
      const normalizedName = suiteName.trim();

      // First, try to find existing suite with this name
      const suitesResponse = await client.get<{ value: TestSuite[] }>(
        `/testplan/plans/${planId}/suites?api-version=${this.config.apiVersion}`,
      );
      const suites = suitesResponse.data.value || [];

      // Log ALL suites for debugging (to see what suiteType values ADO returns)
      logger.info("All suites from API", {
        planId,
        totalCount: suites.length,
        allSuites: suites.map((s) => ({
          id: s.id,
          name: s.name,
          suiteType: s.suiteType,
        })),
      });

      // Find static suites - check for various possible suiteType values
      const staticSuites = suites.filter(
        (s) =>
          s.suiteType === "StaticTestSuite" ||
          s.suiteType === "staticTestSuite" ||
          s.suiteType === "Static",
      );
      logger.info("Looking for static suite", {
        planId,
        searchingFor: normalizedName,
        existingStaticSuites: staticSuites.map((s) => ({
          id: s.id,
          name: s.name,
          suiteType: s.suiteType,
        })),
      });

      // Find by normalized name comparison (trim whitespace, case-insensitive for Feature suites)
      const existingSuite = suites.find((s) => {
        // Case-insensitive check for static suite type
        const suiteType = (s.suiteType || "").toLowerCase();
        if (suiteType !== "statictestsuite" && suiteType !== "static")
          return false;
        const existingName = (s.name || "").trim();

        // Exact match first
        if (existingName === normalizedName) return true;

        // For Feature suites, check if the Feature ID matches
        // This handles cases where the title might be slightly different
        const featureIdMatch = normalizedName.match(/Feature\s*(\d+)/i);
        if (featureIdMatch) {
          const featureId = featureIdMatch[1];
          // Check if existing suite contains the same Feature ID
          const existingFeatureMatch = existingName.match(/Feature\s*(\d+)/i);
          if (existingFeatureMatch && existingFeatureMatch[1] === featureId) {
            logger.info("Found existing Feature suite by ID match", {
              featureId,
              existingName,
              searchedName: normalizedName,
            });
            return true;
          }
        }

        return false;
      });

      if (existingSuite) {
        logger.info("Found existing static suite", {
          planId,
          suiteId: existingSuite.id,
          existingName: existingSuite.name,
          searchedName: normalizedName,
        });
        return existingSuite;
      }

      // Create new static suite - parentSuite goes in body, not URL
      const body: any = {
        name: normalizedName,
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
      logger.info("Created NEW static suite", {
        planId,
        suiteId: response.data.id,
        name: normalizedName,
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

      // Log all requirement suites for debugging
      const requirementSuites = suites.filter(
        (s) => s.suiteType === "RequirementTestSuite",
      );
      logger.info("Looking for requirement suite", {
        planId,
        searchingForWorkItemId: workItemId,
        existingRequirementSuites: requirementSuites.map((s) => ({
          id: s.id,
          name: s.name,
          requirementId: s.requirementId,
        })),
      });

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
      logger.info("Created NEW requirement suite", {
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

  // ============================================
  // ENHANCED WORK ITEM METHODS (Development Links, Attachments, Related Work)
  // ============================================

  /**
   * Get work items with full details including development links, attachments, and related work items
   * Uses $expand=all to get artifact links (PRs, commits, builds)
   */
  async getEnhancedWorkItems(ids: number[]): Promise<EnhancedWorkItem[]> {
    try {
      // Use $expand=all to get all relations including artifact links
      const response = await this.client.get<{ value: WorkItem[] }>(
        `/wit/workitems?ids=${ids.join(",")}&$expand=all&api-version=${this.config.apiVersion}`,
      );

      const workItems = response.data.value || [];

      // Parse and enhance each work item
      const enhanced: EnhancedWorkItem[] = workItems.map((wi) =>
        this.parseWorkItemRelations(wi),
      );

      logger.info("Retrieved enhanced work items", {
        count: enhanced.length,
        ids,
      });

      return enhanced;
    } catch (error: any) {
      logger.error("Failed to get enhanced work items", {
        error: error.message,
        ids,
      });
      throw new ServiceError(
        `Failed to get enhanced work items: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Parse work item relations into categorized structure
   */
  private parseWorkItemRelations(workItem: WorkItem): EnhancedWorkItem {
    const enhanced: EnhancedWorkItem = {
      ...workItem,
      developmentLinks: [],
      attachments: [],
      relatedWorkItems: [],
      childWorkItems: [],
    };

    if (!workItem.relations) {
      return enhanced;
    }

    for (const relation of workItem.relations) {
      const relType = relation.rel;

      // Parse artifact links (Development section)
      if (relType === "ArtifactLink") {
        const devLink = this.parseArtifactLink(relation.url);
        if (devLink) {
          enhanced.developmentLinks!.push(devLink);
        }
      }
      // Parse attachments
      else if (relType === "AttachedFile") {
        const attachment = this.parseAttachment(relation);
        if (attachment) {
          enhanced.attachments!.push(attachment);
        }
      }
      // Parse parent link
      else if (relType === "System.LinkTypes.Hierarchy-Reverse") {
        const workItemId = this.extractWorkItemIdFromUrl(relation.url);
        if (workItemId) {
          enhanced.parentWorkItem = {
            id: workItemId,
            url: relation.url,
            relationType: "Parent",
          };
        }
      }
      // Parse child links
      else if (relType === "System.LinkTypes.Hierarchy-Forward") {
        const workItemId = this.extractWorkItemIdFromUrl(relation.url);
        if (workItemId) {
          enhanced.childWorkItems!.push({
            id: workItemId,
            url: relation.url,
            relationType: "Child",
          });
        }
      }
      // Parse related work items
      else if (relType === "System.LinkTypes.Related") {
        const workItemId = this.extractWorkItemIdFromUrl(relation.url);
        if (workItemId) {
          enhanced.relatedWorkItems!.push({
            id: workItemId,
            url: relation.url,
            relationType: "Related",
          });
        }
      }
      // Parse tested by links (Test Cases)
      else if (relType === "Microsoft.VSTS.Common.TestedBy-Forward") {
        const workItemId = this.extractWorkItemIdFromUrl(relation.url);
        if (workItemId) {
          enhanced.relatedWorkItems!.push({
            id: workItemId,
            url: relation.url,
            relationType: "TestedBy",
          });
        }
      }
    }

    logger.info("Parsed work item relations", {
      workItemId: workItem.id,
      developmentLinks: enhanced.developmentLinks?.length || 0,
      attachments: enhanced.attachments?.length || 0,
      relatedWorkItems: enhanced.relatedWorkItems?.length || 0,
      childWorkItems: enhanced.childWorkItems?.length || 0,
      hasParent: !!enhanced.parentWorkItem,
    });

    return enhanced;
  }

  /**
   * Parse artifact URI to development link
   * Formats:
   * - vstfs:///Git/PullRequestId/{projectId}/{pullRequestId}
   * - vstfs:///Git/Commit/{projectId}/{repoId}/{commitId}
   * - vstfs:///Build/Build/{buildId}
   * - vstfs:///Git/Ref/{projectId}/{repoId}/{encodedBranch}
   */
  private parseArtifactLink(artifactUri: string): DevelopmentLink | null {
    try {
      // Pull Request
      const prMatch = artifactUri.match(
        /vstfs:\/\/\/Git\/PullRequestId\/([^/]+)\/(\d+)/,
      );
      if (prMatch) {
        return {
          type: "PullRequest",
          artifactUri,
          projectId: prMatch[1],
          pullRequestId: parseInt(prMatch[2], 10),
        };
      }

      // Commit
      const commitMatch = artifactUri.match(
        /vstfs:\/\/\/Git\/Commit\/([^/]+)\/([^/]+)\/([a-f0-9]+)/,
      );
      if (commitMatch) {
        return {
          type: "Commit",
          artifactUri,
          projectId: commitMatch[1],
          repositoryId: commitMatch[2],
          commitId: commitMatch[3],
        };
      }

      // Build
      const buildMatch = artifactUri.match(/vstfs:\/\/\/Build\/Build\/(\d+)/);
      if (buildMatch) {
        return {
          type: "Build",
          artifactUri,
          buildId: parseInt(buildMatch[1], 10),
        };
      }

      // Branch/Ref
      const refMatch = artifactUri.match(
        /vstfs:\/\/\/Git\/Ref\/([^/]+)\/([^/]+)\/(.+)/,
      );
      if (refMatch) {
        return {
          type: "Branch",
          artifactUri,
          projectId: refMatch[1],
          repositoryId: refMatch[2],
          branchName: decodeURIComponent(refMatch[3]),
        };
      }

      logger.warn("Unknown artifact link format", { artifactUri });
      return {
        type: "Unknown",
        artifactUri,
      };
    } catch (error) {
      logger.error("Failed to parse artifact link", { artifactUri, error });
      return null;
    }
  }

  /**
   * Parse attachment from relation
   */
  private parseAttachment(relation: {
    url: string;
    attributes: any;
  }): Attachment | null {
    try {
      // Extract attachment ID from URL
      const idMatch = relation.url.match(/attachments\/([^/?]+)/);
      const id = idMatch ? idMatch[1] : "";

      return {
        id,
        name: relation.attributes?.name || "Unknown",
        url: relation.url,
        size: relation.attributes?.resourceSize || 0,
        createdDate: relation.attributes?.resourceCreatedDate || "",
        modifiedDate: relation.attributes?.resourceModifiedDate,
        comment: relation.attributes?.comment,
      };
    } catch (error) {
      logger.error("Failed to parse attachment", { relation, error });
      return null;
    }
  }

  /**
   * Extract work item ID from URL
   */
  private extractWorkItemIdFromUrl(url: string): number | null {
    const match = url.match(/workitems\/(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  // ============================================
  // GIT API METHODS (Pull Requests, File Changes)
  // ============================================

  /**
   * Get pull request details
   */
  async getPullRequest(
    pullRequestId: number,
    repositoryId?: string,
  ): Promise<PullRequest> {
    try {
      // If repositoryId is provided, use it; otherwise use project-level endpoint
      const url = repositoryId
        ? `/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=${this.config.apiVersion}`
        : `/git/pullrequests/${pullRequestId}?api-version=${this.config.apiVersion}`;

      const response = await this.client.get<PullRequest>(url);

      logger.info("Retrieved pull request", {
        pullRequestId,
        title: response.data.title,
        status: response.data.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error("Failed to get pull request", {
        error: error.message,
        pullRequestId,
      });
      throw new ServiceError(
        `Failed to get pull request: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get files changed in a pull request
   */
  async getPullRequestChanges(
    repositoryId: string,
    pullRequestId: number,
  ): Promise<PullRequestChange[]> {
    try {
      // First get iterations to find the latest
      const iterationsResponse = await this.client.get<{
        value: PullRequestIteration[];
      }>(
        `/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations?api-version=${this.config.apiVersion}`,
      );

      const iterations = iterationsResponse.data.value || [];
      if (iterations.length === 0) {
        logger.warn("No iterations found for PR", { pullRequestId });
        return [];
      }

      // Get the latest iteration
      const latestIteration = iterations[iterations.length - 1];

      // Get changes for the latest iteration
      const changesResponse = await this.client.get<{
        changeEntries: PullRequestChange[];
      }>(
        `/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations/${latestIteration.id}/changes?api-version=${this.config.apiVersion}`,
      );

      const changes = changesResponse.data.changeEntries || [];

      logger.info("Retrieved PR changes", {
        pullRequestId,
        iterationId: latestIteration.id,
        fileCount: changes.length,
      });

      return changes;
    } catch (error: any) {
      logger.error("Failed to get PR changes", {
        error: error.message,
        pullRequestId,
        repositoryId,
      });
      throw new ServiceError(
        `Failed to get PR changes: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get all files changed in PRs linked to a work item
   */
  async getFilesChangedForWorkItem(workItemId: number): Promise<{
    files: string[];
    pullRequests: Array<{
      id: number;
      title: string;
      status: string;
      files: string[];
    }>;
  }> {
    try {
      // Get enhanced work item with development links
      const [enhanced] = await this.getEnhancedWorkItems([workItemId]);

      if (!enhanced || !enhanced.developmentLinks) {
        return { files: [], pullRequests: [] };
      }

      // Filter for pull request links
      const prLinks = enhanced.developmentLinks.filter(
        (dl) => dl.type === "PullRequest",
      );

      const allFiles: Set<string> = new Set();
      const pullRequests: Array<{
        id: number;
        title: string;
        status: string;
        files: string[];
      }> = [];

      for (const prLink of prLinks) {
        if (!prLink.pullRequestId) continue;

        try {
          // Get PR details
          const pr = await this.getPullRequest(prLink.pullRequestId);
          const repositoryId = pr.repository?.id;

          if (!repositoryId) {
            logger.warn("No repository ID found for PR", {
              pullRequestId: prLink.pullRequestId,
            });
            continue;
          }

          // Get changed files
          const changes = await this.getPullRequestChanges(
            repositoryId,
            prLink.pullRequestId,
          );
          const files = changes.map((c) => c.item.path);

          files.forEach((f) => allFiles.add(f));

          pullRequests.push({
            id: prLink.pullRequestId,
            title: pr.title,
            status: pr.status,
            files,
          });
        } catch (error) {
          logger.warn("Failed to get PR details", {
            pullRequestId: prLink.pullRequestId,
            error,
          });
        }
      }

      logger.info("Retrieved files changed for work item", {
        workItemId,
        totalFiles: allFiles.size,
        prCount: pullRequests.length,
      });

      return {
        files: Array.from(allFiles),
        pullRequests,
      };
    } catch (error: any) {
      logger.error("Failed to get files changed for work item", {
        error: error.message,
        workItemId,
      });
      throw new ServiceError(
        `Failed to get files changed for work item: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ============================================
  // ATTACHMENT METHODS
  // ============================================

  /**
   * Download attachment content
   */
  async downloadAttachment(attachmentUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(attachmentUrl, {
        auth: {
          username: "",
          password: this.config.pat,
        },
        responseType: "arraybuffer",
      });

      logger.info("Downloaded attachment", {
        url: attachmentUrl,
        size: response.data.length,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error("Failed to download attachment", {
        error: error.message,
        url: attachmentUrl,
      });
      throw new ServiceError(
        `Failed to download attachment: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ============================================
  // EXISTING TEST CASE METHODS
  // ============================================

  /**
   * Get existing test cases linked to a work item (PBI/Story)
   * Looks for test cases linked via "Tested By" relationship
   */
  async getExistingTestCasesForWorkItem(
    workItemId: number,
  ): Promise<ExistingTestCase[]> {
    try {
      // Get enhanced work item to find test case links
      const [enhanced] = await this.getEnhancedWorkItems([workItemId]);

      if (!enhanced) {
        return [];
      }

      // Find test case IDs from "TestedBy" relationships
      const testCaseRelations =
        enhanced.relatedWorkItems?.filter(
          (r) => r.relationType === "TestedBy",
        ) || [];

      if (testCaseRelations.length === 0) {
        // Also check child work items that might be test cases
        const childIds = enhanced.childWorkItems?.map((c) => c.id) || [];
        if (childIds.length > 0) {
          const children = await this.getWorkItemsByIds(childIds);
          const testCases = children.filter(
            (c) => c.fields["System.WorkItemType"] === "Test Case",
          );
          return testCases.map((tc) =>
            this.parseTestCaseWorkItem(tc, workItemId),
          );
        }
        return [];
      }

      // Fetch the test case work items
      const testCaseIds = testCaseRelations.map((r) => r.id);
      const testCases = await this.getWorkItemsByIds(testCaseIds);

      // Parse into ExistingTestCase format
      const parsed = testCases.map((tc) =>
        this.parseTestCaseWorkItem(tc, workItemId),
      );

      logger.info("Retrieved existing test cases for work item", {
        workItemId,
        testCaseCount: parsed.length,
      });

      return parsed;
    } catch (error: any) {
      logger.error("Failed to get existing test cases", {
        error: error.message,
        workItemId,
      });
      throw new ServiceError(
        `Failed to get existing test cases: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Parse test case work item into structured format
   */
  private parseTestCaseWorkItem(
    workItem: WorkItem,
    linkedWorkItemId?: number,
  ): ExistingTestCase {
    const fields = workItem.fields;

    // Parse test steps from XML
    const stepsXml = fields["Microsoft.VSTS.TCM.Steps"] || "";
    const steps = this.parseTestStepsXml(stepsXml);

    return {
      id: workItem.id,
      title: fields["System.Title"],
      state: fields["System.State"],
      steps,
      priority: fields["Microsoft.VSTS.Common.Priority"],
      automationStatus: fields["Microsoft.VSTS.TCM.AutomationStatus"],
      areaPath: fields["System.AreaPath"],
      iterationPath: fields["System.IterationPath"],
      assignedTo: fields["System.AssignedTo"]?.displayName,
      linkedWorkItemId,
    };
  }

  /**
   * Parse test steps from Azure DevOps XML format
   */
  private parseTestStepsXml(stepsXml: string): ParsedTestStep[] {
    if (!stepsXml) return [];

    const steps: ParsedTestStep[] = [];

    try {
      // Extract step elements using regex (simple XML parsing)
      const stepRegex =
        /<step id="(\d+)"[^>]*>[\s\S]*?<parameterizedString[^>]*>([\s\S]*?)<\/parameterizedString>[\s\S]*?<parameterizedString[^>]*>([\s\S]*?)<\/parameterizedString>[\s\S]*?<\/step>/g;

      let match;
      while ((match = stepRegex.exec(stepsXml)) !== null) {
        const stepNumber = parseInt(match[1], 10);
        const action = this.decodeXmlEntities(match[2]);
        const expectedResult = this.decodeXmlEntities(match[3]);

        steps.push({
          stepNumber,
          action,
          expectedResult,
        });
      }
    } catch (error) {
      logger.warn("Failed to parse test steps XML", { error });
    }

    return steps;
  }

  /**
   * Decode XML entities
   */
  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/<[^>]*>/g, "") // Remove any HTML tags
      .trim();
  }

  // ============================================
  // TEST CASE COMPARISON METHODS
  // ============================================

  /**
   * Compare generated test cases with existing ones
   * Returns which are new, which need updates, and which already exist
   */
  async compareTestCases(
    workItemId: number,
    generatedTestCases: TestCase[],
  ): Promise<TestCaseComparisonResult> {
    try {
      // Get the work item title
      const [workItem] = await this.getWorkItemsByIds([workItemId]);
      const workItemTitle = workItem?.fields["System.Title"] || "";

      // Get existing test cases
      const existingTestCases =
        await this.getExistingTestCasesForWorkItem(workItemId);

      // Compare each generated test case against existing ones
      const comparisons: TestCaseComparison[] = generatedTestCases.map(
        (generated) => {
          const { bestMatch, similarity } = this.findBestMatchingTestCase(
            generated,
            existingTestCases,
          );

          let status: "NEW" | "UPDATE" | "EXISTS";
          let diff: TestCaseComparison["diff"];

          if (!bestMatch || similarity < 40) {
            // No good match - this is a new test case
            status = "NEW";
          } else if (similarity >= 90) {
            // Very high match - test case already exists
            status = "EXISTS";
            diff = this.calculateTestCaseDiff(generated, bestMatch);
          } else {
            // Partial match - test case needs update
            status = "UPDATE";
            diff = this.calculateTestCaseDiff(generated, bestMatch);
          }

          return {
            generated,
            existing: bestMatch,
            status,
            similarity,
            diff,
          };
        },
      );

      // Calculate summary
      const summary = {
        newCount: comparisons.filter((c) => c.status === "NEW").length,
        updateCount: comparisons.filter((c) => c.status === "UPDATE").length,
        existsCount: comparisons.filter((c) => c.status === "EXISTS").length,
        totalGenerated: generatedTestCases.length,
        totalExisting: existingTestCases.length,
      };

      logger.info("Compared test cases", {
        workItemId,
        ...summary,
      });

      return {
        workItemId,
        workItemTitle,
        existingTestCases,
        generatedTestCases,
        comparisons,
        summary,
      };
    } catch (error: any) {
      logger.error("Failed to compare test cases", {
        error: error.message,
        workItemId,
      });
      throw new ServiceError(
        `Failed to compare test cases: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Find the best matching existing test case for a generated one
   */
  private findBestMatchingTestCase(
    generated: TestCase,
    existing: ExistingTestCase[],
  ): { bestMatch: ExistingTestCase | null; similarity: number } {
    if (existing.length === 0) {
      return { bestMatch: null, similarity: 0 };
    }

    let bestMatch: ExistingTestCase | null = null;
    let highestSimilarity = 0;

    for (const existingTc of existing) {
      const similarity = this.calculateSimilarity(generated, existingTc);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = existingTc;
      }
    }

    return { bestMatch, similarity: highestSimilarity };
  }

  /**
   * Calculate similarity between generated and existing test case (0-100)
   */
  private calculateSimilarity(
    generated: TestCase,
    existing: ExistingTestCase,
  ): number {
    // Title similarity (40% weight)
    const titleSim =
      this.stringSimilarity(generated.title, existing.title) * 40;

    // Steps similarity (60% weight)
    const stepsSim = this.stepsSimilarity(generated.steps, existing.steps) * 60;

    return Math.round(titleSim + stepsSim);
  }

  /**
   * Calculate string similarity using Levenshtein-like approach (0-1)
   */
  private stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Use word-based Jaccard similarity for better matching
    const words1 = new Set(s1.split(/\s+/).filter((w) => w.length > 2));
    const words2 = new Set(s2.split(/\s+/).filter((w) => w.length > 2));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between step arrays (0-1)
   */
  private stepsSimilarity(
    generated: Array<{ action: string; expectedResult: string }>,
    existing: ParsedTestStep[],
  ): number {
    if (generated.length === 0 && existing.length === 0) return 1;
    if (generated.length === 0 || existing.length === 0) return 0;

    // Compare each generated step to find best match in existing
    let totalSimilarity = 0;

    for (const genStep of generated) {
      let bestStepSim = 0;
      for (const existStep of existing) {
        const actionSim = this.stringSimilarity(
          genStep.action,
          existStep.action,
        );
        const expectedSim = this.stringSimilarity(
          genStep.expectedResult,
          existStep.expectedResult,
        );
        const stepSim = (actionSim + expectedSim) / 2;
        if (stepSim > bestStepSim) bestStepSim = stepSim;
      }
      totalSimilarity += bestStepSim;
    }

    // Penalize for different number of steps
    const stepCountRatio =
      Math.min(generated.length, existing.length) /
      Math.max(generated.length, existing.length);

    return (totalSimilarity / generated.length) * (0.7 + 0.3 * stepCountRatio);
  }

  /**
   * Calculate detailed diff between generated and existing test case
   */
  private calculateTestCaseDiff(
    generated: TestCase,
    existing: ExistingTestCase,
  ): TestCaseComparison["diff"] {
    const titleSimilarity = Math.round(
      this.stringSimilarity(generated.title, existing.title) * 100,
    );
    const titleChanged = titleSimilarity < 95;

    // Analyze step differences
    const stepsDiff: Array<{
      stepNumber: number;
      type: "added" | "removed" | "modified" | "unchanged";
      generatedStep?: {
        action: string;
        expectedResult: string;
        stepNumber: number;
      };
      existingStep?: ParsedTestStep;
    }> = [];

    let stepsAdded = 0;
    let stepsRemoved = 0;
    let stepsModified = 0;

    // Match steps by similarity
    const matchedExisting = new Set<number>();

    for (let i = 0; i < generated.steps.length; i++) {
      const genStep = generated.steps[i];
      let bestMatch: { index: number; sim: number } | null = null;

      for (let j = 0; j < existing.steps.length; j++) {
        if (matchedExisting.has(j)) continue;

        const existStep = existing.steps[j];
        const sim =
          (this.stringSimilarity(genStep.action, existStep.action) +
            this.stringSimilarity(
              genStep.expectedResult,
              existStep.expectedResult,
            )) /
          2;

        if (!bestMatch || sim > bestMatch.sim) {
          bestMatch = { index: j, sim };
        }
      }

      if (bestMatch && bestMatch.sim >= 0.5) {
        matchedExisting.add(bestMatch.index);
        const type = bestMatch.sim >= 0.95 ? "unchanged" : "modified";
        if (type === "modified") stepsModified++;

        stepsDiff.push({
          stepNumber: i + 1,
          type,
          generatedStep: genStep,
          existingStep: existing.steps[bestMatch.index],
        });
      } else {
        stepsAdded++;
        stepsDiff.push({
          stepNumber: i + 1,
          type: "added",
          generatedStep: genStep,
        });
      }
    }

    // Find removed steps (existing steps not matched)
    for (let j = 0; j < existing.steps.length; j++) {
      if (!matchedExisting.has(j)) {
        stepsRemoved++;
        stepsDiff.push({
          stepNumber: existing.steps[j].stepNumber,
          type: "removed",
          existingStep: existing.steps[j],
        });
      }
    }

    return {
      titleChanged,
      titleSimilarity,
      stepsAdded,
      stepsRemoved,
      stepsModified,
      stepsDiff,
    };
  }

  /**
   * Update an existing test case with new content
   */
  async updateTestCase(
    testCaseId: number,
    updates: {
      title?: string;
      steps?: Array<{
        action: string;
        expectedResult: string;
        stepNumber: number;
      }>;
    },
  ): Promise<WorkItem> {
    try {
      const patchDoc: Array<{ op: string; path: string; value: any }> = [];

      if (updates.title) {
        patchDoc.push({
          op: "replace",
          path: "/fields/System.Title",
          value: updates.title,
        });
      }

      if (updates.steps) {
        const stepsXml = this.formatStepsAsXml(updates.steps);
        patchDoc.push({
          op: "replace",
          path: "/fields/Microsoft.VSTS.TCM.Steps",
          value: stepsXml,
        });
      }

      const response = await this.client.patch<WorkItem>(
        `/wit/workitems/${testCaseId}?api-version=${this.config.apiVersion}`,
        patchDoc,
        {
          headers: { "Content-Type": "application/json-patch+json" },
        },
      );

      logger.info("Updated test case", {
        testCaseId,
        updatedFields: Object.keys(updates),
      });

      return response.data;
    } catch (error: any) {
      logger.error("Failed to update test case", {
        error: error.message,
        testCaseId,
      });
      throw new ServiceError(
        `Failed to update test case: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }
}
