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
  attributes: WorkItemRelationAttributes;
}

// Base attributes for all relations
export interface WorkItemRelationAttributes {
  isLocked?: boolean;
  name?: string;
  // Attachment-specific attributes
  resourceSize?: number;
  resourceCreatedDate?: string;
  resourceModifiedDate?: string;
  authorizedDate?: string;
  id?: number;
  comment?: string;
  // Artifact link attributes (for development links)
  resourceType?: string;
}

// ============================================
// DEVELOPMENT LINKS TYPES (PRs, Commits, Builds)
// ============================================

export interface DevelopmentLink {
  type: "PullRequest" | "Commit" | "Build" | "Branch" | "Unknown";
  artifactUri: string;
  repositoryId?: string;
  projectId?: string;
  pullRequestId?: number;
  commitId?: string;
  buildId?: number;
  branchName?: string;
}

export interface PullRequest {
  pullRequestId: number;
  codeReviewId?: number;
  status: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  creationDate: string;
  closedDate?: string;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: string;
  isDraft?: boolean;
  repository: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  url: string;
  _links?: {
    web: { href: string };
  };
}

export interface PullRequestChange {
  changeId: number;
  item: {
    objectId: string;
    originalObjectId?: string;
    gitObjectType: string;
    commitId: string;
    path: string;
    url: string;
  };
  changeType:
    | "add"
    | "edit"
    | "delete"
    | "rename"
    | "sourceRename"
    | "targetRename";
  sourceServerItem?: string;
}

export interface PullRequestIteration {
  id: number;
  description?: string;
  author: {
    displayName: string;
    uniqueName: string;
  };
  createdDate: string;
  updatedDate: string;
  sourceRefCommit: { commitId: string };
  targetRefCommit: { commitId: string };
  commonRefCommit?: { commitId: string };
}

// ============================================
// ATTACHMENT TYPES
// ============================================

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  createdDate: string;
  modifiedDate?: string;
  comment?: string;
}

export interface AttachmentContent {
  id: string;
  name: string;
  contentType: string;
  size: number;
  content: Buffer | string; // Buffer for binary, string for text
}

// ============================================
// ENHANCED WORK ITEM WITH PARSED RELATIONS
// ============================================

export interface EnhancedWorkItem extends WorkItem {
  // Parsed and categorized relations
  developmentLinks?: DevelopmentLink[];
  attachments?: Attachment[];
  relatedWorkItems?: RelatedWorkItem[];
  parentWorkItem?: RelatedWorkItem;
  childWorkItems?: RelatedWorkItem[];
}

export interface RelatedWorkItem {
  id: number;
  url: string;
  relationType: string; // e.g., "Parent", "Child", "Related", "Predecessor", "Successor"
  title?: string;
  workItemType?: string;
  state?: string;
}

// ============================================
// EXISTING TEST CASE TYPES (for smart comparison)
// ============================================

export interface ExistingTestCase {
  id: number;
  title: string;
  state: string;
  steps: ParsedTestStep[];
  priority?: number;
  automationStatus?: string;
  areaPath?: string;
  iterationPath?: string;
  assignedTo?: string;
  linkedWorkItemId?: number; // The PBI/Story this is linked to
  testSuiteId?: number;
  testPlanId?: number;
}

export interface ParsedTestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCaseComparison {
  generated: TestCase;
  existing: ExistingTestCase | null;
  status: "NEW" | "UPDATE" | "EXISTS";
  similarity: number; // 0-100
  diff?: TestCaseDiff;
}

export interface TestCaseDiff {
  titleChanged: boolean;
  titleSimilarity: number;
  stepsAdded: number;
  stepsRemoved: number;
  stepsModified: number;
  stepsDiff: StepDiff[];
}

export interface StepDiff {
  stepNumber: number;
  type: "added" | "removed" | "modified" | "unchanged";
  generatedStep?: TestStep;
  existingStep?: ParsedTestStep;
}

export interface TestCaseComparisonResult {
  workItemId: number;
  workItemTitle: string;
  existingTestCases: ExistingTestCase[];
  generatedTestCases: TestCase[];
  comparisons: TestCaseComparison[];
  summary: {
    newCount: number;
    updateCount: number;
    existsCount: number;
    totalGenerated: number;
    totalExisting: number;
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
