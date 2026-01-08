/**
 * Iterations Routes (Projects, Teams, Sprints)
 */

import { Router, Request, Response } from 'express';
import { ADOService } from '../services/ado-service';
import { APIResponse, logError } from '@qe-mcp-stack/shared';

export function createIterationsRouter(adoService: ADOService): Router {
  const router = Router();

  /**
   * @swagger
   * /iterations/projects:
   *   get:
   *     summary: Get all projects
   *     description: Retrieve all projects in the Azure DevOps organization
   *     tags: [Iterations]
   *     responses:
   *       200:
   *         description: List of projects
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
   *                     projects:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ADOProject'
   */
  router.get('/projects', async (_req: Request, res: Response) => {
    try {
      const projects = await adoService.getProjects();

      const response: APIResponse = {
        success: true,
        data: { projects },
      };

      res.json(response);
    } catch (error) {
      logError('Get projects failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'GET_PROJECTS_FAILED',
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /iterations/teams:
   *   get:
   *     summary: Get teams for a project
   *     description: Retrieve all teams for a specific project
   *     tags: [Iterations]
   *     parameters:
   *       - in: query
   *         name: project
   *         required: true
   *         schema:
   *           type: string
   *         description: Project name
   *     responses:
   *       200:
   *         description: List of teams
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
   *                     teams:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ADOTeam'
   *       400:
   *         description: Missing project parameter
   */
  router.get('/teams', async (req: Request, res: Response) => {
    try {
      const { project } = req.query;

      if (!project || typeof project !== 'string') {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'project query parameter is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const teams = await adoService.getTeams(project);

      const response: APIResponse = {
        success: true,
        data: { teams },
      };

      res.json(response);
    } catch (error) {
      logError('Get teams failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'GET_TEAMS_FAILED',
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * @swagger
   * /iterations/sprints:
   *   get:
   *     summary: Get sprints for a team
   *     description: Retrieve all sprints/iterations for a specific team
   *     tags: [Iterations]
   *     parameters:
   *       - in: query
   *         name: project
   *         required: true
   *         schema:
   *           type: string
   *         description: Project name
   *       - in: query
   *         name: team
   *         required: true
   *         schema:
   *           type: string
   *         description: Team name
   *     responses:
   *       200:
   *         description: List of sprints
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
   *                     sprints:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ADOSprint'
   *       400:
   *         description: Missing project or team parameter
   */
  router.get('/sprints', async (req: Request, res: Response) => {
    try {
      const { project, team } = req.query;

      if (!project || typeof project !== 'string' || !team || typeof team !== 'string') {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'project and team query parameters are required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const sprints = await adoService.getSprints(project, team);

      const response: APIResponse = {
        success: true,
        data: { sprints },
      };

      res.json(response);
    } catch (error) {
      logError('Get sprints failed', { error });
      const response: APIResponse = {
        success: false,
        error: {
          code: 'GET_SPRINTS_FAILED',
          message: (error as Error).message,
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
