/**
 * Azure DevOps MCP Types
 */

export interface ADOConfig {
  pat: string;
  organization: string;
  project: string;
  apiVersion: string;
}

export interface WorkItem {
  id: number;
  rev: number;
  fields: WorkItemFields;
  relations?: WorkItemRelation[];
  url: string;
}

export interface WorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.State': string;
  'System.IterationPath': string;
  'System.WorkItemType': string;
  'System.AssignedTo'?: {
    displayName: string;
    uniqueName: string;
  };
  'System.Tags'?: string;
  'System.Description'?: string;
  'Microsoft.VSTS.TCM.Steps'?: string;
  [key: string]: any;
}

export interface WorkItemRelation {
  rel: string;
  url: string;
  attributes: {
    isLocked: boolean;
    name: string;
  };
}

export interface WorkItemQueryRequest {
  sprint?: string;
  workItemIds?: number[];
  query?: string;
  organization?: string;
  project?: string;
  team?: string;
}

export interface WorkItemUpdateRequest {
  id: number;
  fields: Record<string, any>;
}

export interface CreateTestCasesRequest {
  parentId?: number;
  testCases: TestCase[];
}

export interface TestCase {
  title: string;
  steps: TestStep[];
}

export interface TestStep {
  action: string;
  expectedResult: string;
  stepNumber: number;
}

export interface BulkUpdateRequest {
  storyId: number;
  testCases?: TestCase[];
  automationReqs?: {
    summary?: string;
    [key: string]: any;
  };
}

export interface ADOProject {
  name: string;
  id: string;
  description?: string;
  url?: string;
}

export interface ADOTeam {
  name: string;
  id: string;
  description?: string;
  url?: string;
}

export interface ADOSprint {
  name: string;
  path: string;
  id: string;
  startDate?: string;
  finishDate?: string;
  attributes?: {
    startDate?: string;
    finishDate?: string;
    timeFrame?: string;
  };
}

export interface WIQLQuery {
  query: string;
}

export interface WIQLQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns: Array<{
    referenceName: string;
    name: string;
    url: string;
  }>;
  sortColumns: Array<{
    field: { referenceName: string };
    descending: boolean;
  }>;
  workItems: Array<{
    id: number;
    url: string;
  }>;
}
