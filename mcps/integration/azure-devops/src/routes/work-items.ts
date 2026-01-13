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

  return router;
}
