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
  "System.Id": number;
  "System.Title": string;
  "System.State": string;
  "System.IterationPath": string;
  "System.WorkItemType": string;
  "System.AssignedTo"?: {
    displayName: string;
    uniqueName: string;
  };
  "System.Tags"?: string;
  "System.Description"?: string;
  "Microsoft.VSTS.TCM.Steps"?: string;
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
  testPlanId?: number;
  testSuiteId?: number;
  testCases: TestCase[];
}

export interface TestCase {
  title: string;
  steps: TestStep[];
  priority?: number;
  automationStatus?: string;
}

export interface TestStep {
  action: string;
  expectedResult: string;
  stepNumber: number;
}

// Test Plan Management Types
export interface TestPlan {
  id: number;
  name: string;
  project?: { id: string; name: string };
  area?: { id: string; name: string };
  iteration?: string;
  owner?: { displayName: string; uniqueName: string };
  state?: string;
  startDate?: string;
  endDate?: string;
  rootSuite?: { id: number; name: string };
  _links?: { self: { href: string }; web: { href: string } };
}

export interface TestSuite {
  id: number;
  name: string;
  plan?: { id: number; name: string };
  parentSuite?: { id: number; name: string };
  suiteType?: string; // 'StaticTestSuite', 'DynamicTestSuite', 'RequirementTestSuite'
  requirementId?: number; // For RequirementTestSuite - links to PBI/Feature
  queryString?: string; // For DynamicTestSuite
  children?: TestSuite[];
  testCases?: TestSuiteTestCase[];
  _links?: { self: { href: string }; web: { href: string } };
}

export interface TestSuiteTestCase {
  testCase: { id: number; name: string };
  pointAssignments?: Array<{
    configurationId: number;
    configurationName: string;
  }>;
}

export interface CreateTestPlanRequest {
  name: string;
  areaPath?: string;
  iteration?: string;
  description?: string;
}

export interface CreateTestSuiteRequest {
  planId: number;
  parentSuiteId?: number;
  name: string;
  suiteType: "StaticTestSuite" | "DynamicTestSuite" | "RequirementTestSuite";
  requirementId?: number; // Required for RequirementTestSuite
  queryString?: string; // Required for DynamicTestSuite
}

export interface AddTestCasesToSuiteRequest {
  planId: number;
  suiteId: number;
  testCaseIds: number[];
}

export interface CreateTestCasesInPlanRequest {
  storyId: number;
  featureId?: number;
  testPlanId?: number;
  testCases: TestCase[];
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
