/**
 * Work Items Routes
 */

import { Router, Request, Response } from "express";
import { ADOService } from "../services/ado-service";
import { APIResponse, logError } from "@qe-mcp-stack/shared";
import {
  WorkItemQueryRequest,
  WorkItemUpdateRequest,
  CreateTestCasesRequest,
  BulkUpdateRequest,
  CreateTestPlanRequest,
  CreateTestSuiteRequest,
} from "../types";

export function createWorkItemsRouter(adoService: ADOService): Router {
  const router = Router();

  /**
   * @swagger
   * /work-items/query:
   *   post:
   *     summary: Query work items
   *     description: Query work items by sprint, custom WIQL query, or specific IDs
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/WorkItemQueryRequest'
   *     responses:
   *       200:
   *         description: List of work items
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/WorkItem'
   *       500:
   *         description: Server error
   */
  router.post("/query", async (req: Request, res: Response) => {
    try {
      const request: WorkItemQueryRequest = req.body;
      const workItems = await adoService.queryWorkItems(request);

      const response: APIResponse = {
        success: true,
        data: workItems,
      };

      res.json(response);
    } catch (error) {
      logError("Work items query failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "QUERY_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/get:
   *   post:
   *     summary: Get specific work items by IDs
   *     description: Retrieve work items by their IDs. Use orgWide=true to fetch from any project.
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: number
   *               orgWide:
   *                 type: boolean
   *                 description: If true, fetches work items from any project in the organization
   *     responses:
   *       200:
   *         description: List of work items
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/WorkItem'
   */
  router.post("/get", async (req: Request, res: Response) => {
    try {
      const { ids, orgWide } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        const response: APIResponse = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "ids array is required",
          },
        };
        res.status(400).json(response);
        return;
      }

      // Use org-wide fetch if requested, otherwise use project-scoped
      const workItems = orgWide
        ? await adoService.getWorkItemsByIdsOrgWide(ids)
        : await adoService.getWorkItemsByIds(ids);

      const response: APIResponse = {
        success: true,
        data: workItems,
      };

      res.json(response);
    } catch (error) {
      logError("Get work items failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "GET_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/update:
   *   post:
   *     summary: Update a work item
   *     description: Update fields of a work item
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/WorkItemUpdateRequest'
   *     responses:
   *       200:
   *         description: Updated work item
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/WorkItem'
   */
  router.post("/update", async (req: Request, res: Response) => {
    try {
      const request: WorkItemUpdateRequest = req.body;

      if (!request.id || !request.fields) {
        const response: APIResponse = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "id and fields are required",
          },
        };
        res.status(400).json(response);
        return;
      }

      const workItem = await adoService.updateWorkItem(request);

      const response: APIResponse = {
        success: true,
        data: workItem,
      };

      res.json(response);
    } catch (error) {
      logError("Update work item failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/create-test-cases:
   *   post:
   *     summary: Create test cases
   *     description: Create multiple test cases
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTestCasesRequest'
   *     responses:
   *       200:
   *         description: Created test cases
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     created:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/WorkItem'
   */
  router.post("/create-test-cases", async (req: Request, res: Response) => {
    try {
      const request: CreateTestCasesRequest = req.body;

      if (!request.testCases || !Array.isArray(request.testCases)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "testCases array is required",
          },
        };
        res.status(400).json(response);
        return;
      }

      const created = await adoService.createTestCases(request);

      const response: APIResponse = {
        success: true,
        data: { created },
      };

      res.json(response);
    } catch (error) {
      logError("Create test cases failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/bulk-update:
   *   post:
   *     summary: Bulk update work items
   *     description: Update multiple work items with test cases and automation requirements
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BulkUpdateRequest'
   *     responses:
   *       200:
   *         description: Bulk update results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     updates:
   *                       type: array
   *                       items:
   *                         type: object
   */
  router.post("/bulk-update", async (req: Request, res: Response) => {
    try {
      const request: BulkUpdateRequest = req.body;

      if (!request.storyId) {
        const response: APIResponse = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "storyId is required",
          },
        };
        res.status(400).json(response);
        return;
      }

      const result = await adoService.bulkUpdate(request);

      const response: APIResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      logError("Bulk update failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "BULK_UPDATE_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  // ============================================
  // TEST PLAN MANAGEMENT ROUTES
  // ============================================

  /**
   * @swagger
   * /work-items/test-plans:
   *   get:
   *     summary: Get all test plans
   *     tags: [Test Plans]
   *     parameters:
   *       - in: query
   *         name: project
   *         schema:
   *           type: string
   *         description: Project name (uses default if not specified)
   *     responses:
   *       200:
   *         description: List of test plans
   */
  router.get("/test-plans", async (req: Request, res: Response) => {
    try {
      const { project } = req.query;
      const testPlans = await adoService.getTestPlans(
        project as string | undefined,
      );
      const response: APIResponse = { success: true, data: testPlans };
      res.json(response);
    } catch (error) {
      logError("Get test plans failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "GET_TEST_PLANS_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/test-plans/{planId}:
   *   get:
   *     summary: Get a specific test plan
   *     tags: [Test Plans]
   *     parameters:
   *       - in: path
   *         name: planId
   *         required: true
   *         schema:
   *           type: integer
   */
  router.get("/test-plans/:planId", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      const testPlan = await adoService.getTestPlan(planId);
      const response: APIResponse = { success: true, data: testPlan };
      res.json(response);
    } catch (error) {
      logError("Get test plan failed", { error, planId: req.params.planId });
      const response: APIResponse = {
        success: false,
        error: {
          code: "GET_TEST_PLAN_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/test-plans:
   *   post:
   *     summary: Create a new test plan
   *     tags: [Test Plans]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               areaPath:
   *                 type: string
   *               iteration:
   *                 type: string
   */
  router.post("/test-plans", async (req: Request, res: Response) => {
    try {
      const request: CreateTestPlanRequest = req.body;
      if (!request.name) {
        const response: APIResponse = {
          success: false,
          error: { code: "INVALID_REQUEST", message: "name is required" },
        };
        res.status(400).json(response);
        return;
      }
      const testPlan = await adoService.createTestPlan(request);
      const response: APIResponse = { success: true, data: testPlan };
      res.json(response);
    } catch (error) {
      logError("Create test plan failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "CREATE_TEST_PLAN_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/test-plans/{planId}/suites:
   *   get:
   *     summary: Get test suites for a plan
   *     tags: [Test Plans]
   */
  router.get(
    "/test-plans/:planId/suites",
    async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.planId);
        const suites = await adoService.getTestSuites(planId);
        const response: APIResponse = { success: true, data: suites };
        res.json(response);
      } catch (error) {
        logError("Get test suites failed", {
          error,
          planId: req.params.planId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_TEST_SUITES_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/test-plans/{planId}/suites:
   *   post:
   *     summary: Create a test suite
   *     tags: [Test Plans]
   */
  router.post(
    "/test-plans/:planId/suites",
    async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.planId);
        const request: CreateTestSuiteRequest = { ...req.body, planId };

        if (!request.name || !request.suiteType) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "name and suiteType are required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const suite = await adoService.createTestSuite(request);
        const response: APIResponse = { success: true, data: suite };
        res.json(response);
      } catch (error) {
        logError("Create test suite failed", {
          error,
          planId: req.params.planId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "CREATE_TEST_SUITE_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/test-plans/{planId}/suites/{suiteId}/test-cases:
   *   post:
   *     summary: Add test cases to a suite
   *     tags: [Test Plans]
   */
  router.post(
    "/test-plans/:planId/suites/:suiteId/test-cases",
    async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.planId);
        const suiteId = parseInt(req.params.suiteId);
        const { testCaseIds } = req.body;

        if (!testCaseIds || !Array.isArray(testCaseIds)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "testCaseIds array is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const results = await adoService.addTestCasesToSuite({
          planId,
          suiteId,
          testCaseIds,
        });
        const response: APIResponse = { success: true, data: results };
        res.json(response);
      } catch (error) {
        logError("Add test cases to suite failed", { error });
        const response: APIResponse = {
          success: false,
          error: {
            code: "ADD_TEST_CASES_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/create-test-cases-in-plan:
   *   post:
   *     summary: Create test cases with proper hierarchy in a test plan
   *     description: Creates test cases and organizes them in Test Plan > Feature Suite (optional) > PBI Suite hierarchy
   *     tags: [Test Plans]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - testPlanId
   *               - storyId
   *               - storyTitle
   *               - testCases
   *             properties:
   *               testPlanId:
   *                 type: integer
   *               storyId:
   *                 type: integer
   *               storyTitle:
   *                 type: string
   *               featureId:
   *                 type: integer
   *               featureTitle:
   *                 type: string
   *               testCases:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     title:
   *                       type: string
   *                     steps:
   *                       type: array
   */
  router.post(
    "/create-test-cases-in-plan",
    async (req: Request, res: Response) => {
      try {
        const {
          testPlanId,
          storyId,
          storyTitle,
          testCases,
          featureId,
          featureTitle,
          project,
        } = req.body;

        if (!testPlanId || !storyId || !storyTitle || !testCases) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message:
                "testPlanId, storyId, storyTitle, and testCases are required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const result = await adoService.createTestCasesInPlan(
          testPlanId,
          storyId,
          storyTitle,
          testCases,
          featureId,
          featureTitle,
          project,
        );

        const response: APIResponse = { success: true, data: result };
        res.json(response);
      } catch (error) {
        logError("Create test cases in plan failed", { error });
        const response: APIResponse = {
          success: false,
          error: {
            code: "CREATE_TEST_CASES_IN_PLAN_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  // ============================================
  // ENHANCED WORK ITEM ROUTES (Development Links, Attachments, Related Work)
  // ============================================

  /**
   * @swagger
   * /work-items/enhanced:
   *   post:
   *     summary: Get enhanced work items with full details
   *     description: Retrieves work items with parsed development links (PRs, commits, builds), attachments, and related work items
   *     tags: [Work Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: number
   *     responses:
   *       200:
   *         description: Enhanced work items with development links, attachments, and relations
   */
  router.post("/enhanced", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        const response: APIResponse = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "ids array is required",
          },
        };
        res.status(400).json(response);
        return;
      }

      const workItems = await adoService.getEnhancedWorkItems(ids);

      const response: APIResponse = {
        success: true,
        data: workItems,
      };

      res.json(response);
    } catch (error) {
      logError("Get enhanced work items failed", { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: "GET_ENHANCED_FAILED",
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /work-items/{workItemId}/files-changed:
   *   get:
   *     summary: Get files changed in PRs linked to a work item
   *     description: Retrieves all files modified in pull requests linked to the work item (Development section)
   *     tags: [Work Items]
   *     parameters:
   *       - in: path
   *         name: workItemId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Files changed from linked PRs
   */
  router.get(
    "/:workItemId/files-changed",
    async (req: Request, res: Response) => {
      try {
        const workItemId = parseInt(req.params.workItemId);

        if (isNaN(workItemId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid workItemId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const result = await adoService.getFilesChangedForWorkItem(workItemId);

        const response: APIResponse = {
          success: true,
          data: result,
        };

        res.json(response);
      } catch (error) {
        logError("Get files changed failed", {
          error,
          workItemId: req.params.workItemId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_FILES_CHANGED_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/{workItemId}/existing-test-cases:
   *   get:
   *     summary: Get existing test cases linked to a work item
   *     description: Retrieves all test cases currently linked to the specified PBI/Story
   *     tags: [Work Items]
   *     parameters:
   *       - in: path
   *         name: workItemId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Existing test cases with parsed steps
   */
  router.get(
    "/:workItemId/existing-test-cases",
    async (req: Request, res: Response) => {
      try {
        const workItemId = parseInt(req.params.workItemId);

        if (isNaN(workItemId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid workItemId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const testCases =
          await adoService.getExistingTestCasesForWorkItem(workItemId);

        const response: APIResponse = {
          success: true,
          data: testCases,
        };

        res.json(response);
      } catch (error) {
        logError("Get existing test cases failed", {
          error,
          workItemId: req.params.workItemId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_EXISTING_TEST_CASES_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/{workItemId}/compare-test-cases:
   *   post:
   *     summary: Compare generated test cases with existing ones
   *     description: Compares generated test cases against existing ones linked to the work item, identifying NEW, UPDATE, or EXISTS status
   *     tags: [Work Items]
   *     parameters:
   *       - in: path
   *         name: workItemId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - testCases
   *             properties:
   *               testCases:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     title:
   *                       type: string
   *                     steps:
   *                       type: array
   *     responses:
   *       200:
   *         description: Comparison results with NEW, UPDATE, EXISTS status for each test case
   */
  router.post(
    "/:workItemId/compare-test-cases",
    async (req: Request, res: Response) => {
      try {
        const workItemId = parseInt(req.params.workItemId);
        const { testCases } = req.body;

        if (isNaN(workItemId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid workItemId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        if (!testCases || !Array.isArray(testCases)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "testCases array is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const comparison = await adoService.compareTestCases(
          workItemId,
          testCases,
        );

        const response: APIResponse = {
          success: true,
          data: comparison,
        };

        res.json(response);
      } catch (error) {
        logError("Compare test cases failed", {
          error,
          workItemId: req.params.workItemId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "COMPARE_TEST_CASES_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/{workItemId}/attachments:
   *   get:
   *     summary: Get text attachments content for a work item
   *     description: Downloads and returns content of text-based attachments (.md, .txt, .json) for enhanced context
   *     tags: [Work Items]
   *     parameters:
   *       - in: path
   *         name: workItemId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Attachment contents
   */
  router.get(
    "/:workItemId/attachments",
    async (req: Request, res: Response) => {
      try {
        const workItemId = parseInt(req.params.workItemId);

        if (isNaN(workItemId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid workItemId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        // Get enhanced work item to find attachments
        const [enhanced] = await adoService.getEnhancedWorkItems([workItemId]);

        if (!enhanced) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Work item ${workItemId} not found`,
            },
          };
          res.status(404).json(response);
          return;
        }

        const attachments = enhanced.attachments || [];
        const textAttachments: Array<{
          name: string;
          content: string;
          size: number;
        }> = [];

        // Only download text-based files to include in context
        const textExtensions = [".md", ".txt", ".json", ".xml", ".csv", ".log"];

        for (const attachment of attachments) {
          const isTextFile = textExtensions.some((ext) =>
            attachment.name.toLowerCase().endsWith(ext),
          );

          if (isTextFile && attachment.size < 500000) {
            // Max 500KB per file
            try {
              const content = await adoService.downloadAttachment(
                attachment.url,
              );
              textAttachments.push({
                name: attachment.name,
                content: content.toString("utf-8"),
                size: attachment.size,
              });
            } catch (downloadError) {
              logError("Failed to download attachment", {
                name: attachment.name,
                error: downloadError,
              });
            }
          }
        }

        const response: APIResponse = {
          success: true,
          data: {
            workItemId,
            totalAttachments: attachments.length,
            textAttachments,
            summary: {
              downloaded: textAttachments.length,
              skipped: attachments.length - textAttachments.length,
            },
          },
        };

        res.json(response);
      } catch (error) {
        logError("Get attachments content failed", {
          error,
          workItemId: req.params.workItemId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_ATTACHMENTS_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/test-cases/{testCaseId}:
   *   patch:
   *     summary: Update an existing test case
   *     description: Updates title and/or steps of an existing test case
   *     tags: [Work Items]
   *     parameters:
   *       - in: path
   *         name: testCaseId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               steps:
   *                 type: array
   *     responses:
   *       200:
   *         description: Updated test case
   */
  router.patch(
    "/test-cases/:testCaseId",
    async (req: Request, res: Response) => {
      try {
        const testCaseId = parseInt(req.params.testCaseId);
        const { title, steps } = req.body;

        if (isNaN(testCaseId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid testCaseId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        if (!title && !steps) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "At least one of title or steps is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const updated = await adoService.updateTestCase(testCaseId, {
          title,
          steps,
        });

        const response: APIResponse = {
          success: true,
          data: updated,
        };

        res.json(response);
      } catch (error) {
        logError("Update test case failed", {
          error,
          testCaseId: req.params.testCaseId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "UPDATE_TEST_CASE_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/pull-requests/{pullRequestId}:
   *   get:
   *     summary: Get pull request details
   *     description: Retrieves details of a specific pull request
   *     tags: [Git]
   *     parameters:
   *       - in: path
   *         name: pullRequestId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: repositoryId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Pull request details
   */
  router.get(
    "/pull-requests/:pullRequestId",
    async (req: Request, res: Response) => {
      try {
        const pullRequestId = parseInt(req.params.pullRequestId);
        const repositoryId = req.query.repositoryId as string | undefined;

        if (isNaN(pullRequestId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid pullRequestId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const pr = await adoService.getPullRequest(pullRequestId, repositoryId);

        const response: APIResponse = {
          success: true,
          data: pr,
        };

        res.json(response);
      } catch (error) {
        logError("Get pull request failed", {
          error,
          pullRequestId: req.params.pullRequestId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_PULL_REQUEST_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  /**
   * @swagger
   * /work-items/pull-requests/{pullRequestId}/changes:
   *   get:
   *     summary: Get files changed in a pull request
   *     description: Retrieves all files modified in the specified pull request
   *     tags: [Git]
   *     parameters:
   *       - in: path
   *         name: pullRequestId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: repositoryId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of changed files
   */
  router.get(
    "/pull-requests/:pullRequestId/changes",
    async (req: Request, res: Response) => {
      try {
        const pullRequestId = parseInt(req.params.pullRequestId);
        const repositoryId = req.query.repositoryId as string;

        if (isNaN(pullRequestId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Valid pullRequestId is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        if (!repositoryId) {
          const response: APIResponse = {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "repositoryId query parameter is required",
            },
          };
          res.status(400).json(response);
          return;
        }

        const changes = await adoService.getPullRequestChanges(
          repositoryId,
          pullRequestId,
        );

        const response: APIResponse = {
          success: true,
          data: changes,
        };

        res.json(response);
      } catch (error) {
        logError("Get PR changes failed", {
          error,
          pullRequestId: req.params.pullRequestId,
        });
        const response: APIResponse = {
          success: false,
          error: {
            code: "GET_PR_CHANGES_FAILED",
            message: (error as Error).message,
          },
        };
        res.status(500).json(response);
      }
    },
  );

  return router;
}
