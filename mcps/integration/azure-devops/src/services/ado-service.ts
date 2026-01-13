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
}
