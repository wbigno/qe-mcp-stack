/**
 * Work Items Routes
 */

import { Router, Request, Response } from 'express';
import { ADOService } from '../services/ado-service';
import { APIResponse, logError } from '@qe-mcp-stack/shared';
import {
  WorkItemQueryRequest,
  WorkItemUpdateRequest,
  CreateTestCasesRequest,
  BulkUpdateRequest,
} from '../types';

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
  router.post('/query', async (req: Request, res: Response) => {
    try {
      const request: WorkItemQueryRequest = req.body;
      const workItems = await adoService.queryWorkItems(request);

      const response: APIResponse = {
        success: true,
        data: workItems,
      };

      res.json(response);
    } catch (error) {
      logError('Work items query failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'QUERY_FAILED',
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
   *     description: Retrieve work items by their IDs
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
  router.post('/get', async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ids array is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const workItems = await adoService.getWorkItemsByIds(ids);

      const response: APIResponse = {
        success: true,
        data: workItems,
      };

      res.json(response);
    } catch (error) {
      logError('Get work items failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'GET_FAILED',
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
  router.post('/update', async (req: Request, res: Response) => {
    try {
      const request: WorkItemUpdateRequest = req.body;

      if (!request.id || !request.fields) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'id and fields are required',
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
      logError('Update work item failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
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
  router.post('/create-test-cases', async (req: Request, res: Response) => {
    try {
      const request: CreateTestCasesRequest = req.body;

      if (!request.testCases || !Array.isArray(request.testCases)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'testCases array is required',
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
      logError('Create test cases failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'CREATE_FAILED',
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
  router.post('/bulk-update', async (req: Request, res: Response) => {
    try {
      const request: BulkUpdateRequest = req.body;

      if (!request.storyId) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'storyId is required',
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
      logError('Bulk update failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'BULK_UPDATE_FAILED',
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
