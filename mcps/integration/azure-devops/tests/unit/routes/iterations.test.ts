/**
 * Unit tests for Iterations Routes
 *
 * Tests Express route handlers for Azure DevOps iterations management
 * including projects, teams, and sprints endpoints.
 */

import express, { Express } from "express";
import request from "supertest";
import { ADOService } from "../../../src/services/ado-service";
import { createIterationsRouter } from "../../../src/routes/iterations";

// Suppress logger output during tests
process.env.LOG_LEVEL = "silent";

describe("Iterations Routes", () => {
  let app: Express;
  let mockAdoService: jest.Mocked<ADOService>;

  beforeEach(() => {
    // Create mock ADOService
    mockAdoService = {
      getProjects: jest.fn(),
      getTeams: jest.fn(),
      getSprints: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/iterations", createIterationsRouter(mockAdoService));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /iterations/projects", () => {
    it("should get all projects successfully", async () => {
      const mockProjects = [
        { id: "proj-1", name: "Project 1" },
        { id: "proj-2", name: "Project 2" },
        { id: "proj-3", name: "Project 3" },
      ];

      mockAdoService.getProjects.mockResolvedValueOnce(mockProjects);

      const response = await request(app).get("/iterations/projects");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          projects: mockProjects,
        },
      });
      expect(mockAdoService.getProjects).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no projects exist", async () => {
      mockAdoService.getProjects.mockResolvedValueOnce([]);

      const response = await request(app).get("/iterations/projects");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          projects: [],
        },
      });
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.getProjects.mockRejectedValueOnce(
        new Error("ADO API unavailable"),
      );

      const response = await request(app).get("/iterations/projects");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "GET_PROJECTS_FAILED",
          message: "ADO API unavailable",
        },
      });
    });

    it("should handle unauthorized errors", async () => {
      mockAdoService.getProjects.mockRejectedValueOnce(
        new Error("Unauthorized access"),
      );

      const response = await request(app).get("/iterations/projects");

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("Unauthorized access");
    });
  });

  describe("GET /iterations/teams", () => {
    it("should get teams for a project successfully", async () => {
      const mockTeams = [
        { id: "team-1", name: "Team Alpha" },
        { id: "team-2", name: "Team Beta" },
      ];

      mockAdoService.getTeams.mockResolvedValueOnce(mockTeams);

      const response = await request(app)
        .get("/iterations/teams")
        .query({ project: "MyProject" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          teams: mockTeams,
        },
      });
      expect(mockAdoService.getTeams).toHaveBeenCalledWith("MyProject");
    });

    it("should get teams with special characters in project name", async () => {
      const mockTeams = [{ id: "team-1", name: "Team 1" }];

      mockAdoService.getTeams.mockResolvedValueOnce(mockTeams);

      const response = await request(app)
        .get("/iterations/teams")
        .query({ project: "Project-With-Dashes" });

      expect(response.status).toBe(200);
      expect(mockAdoService.getTeams).toHaveBeenCalledWith(
        "Project-With-Dashes",
      );
    });

    it("should return empty array when project has no teams", async () => {
      mockAdoService.getTeams.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/iterations/teams")
        .query({ project: "EmptyProject" });

      expect(response.status).toBe(200);
      expect(response.body.data.teams).toEqual([]);
    });

    it("should return 400 when project parameter is missing", async () => {
      const response = await request(app).get("/iterations/teams");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "project query parameter is required",
        },
      });
      expect(mockAdoService.getTeams).not.toHaveBeenCalled();
    });

    it("should return 400 when project parameter is empty string", async () => {
      const response = await request(app)
        .get("/iterations/teams")
        .query({ project: "" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.getTeams.mockRejectedValueOnce(
        new Error("Project not found"),
      );

      const response = await request(app)
        .get("/iterations/teams")
        .query({ project: "NonExistentProject" });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "GET_TEAMS_FAILED",
          message: "Project not found",
        },
      });
    });
  });

  describe("GET /iterations/sprints", () => {
    it("should get sprints for a team successfully", async () => {
      const mockSprints = [
        {
          id: "sprint-1",
          name: "25.Q4.07",
          path: "Project\\Team\\2025\\Q4\\25.Q4.07",
          startDate: "2025-01-01T00:00:00Z",
          finishDate: "2025-01-14T00:00:00Z",
        },
        {
          id: "sprint-2",
          name: "25.Q4.08",
          path: "Project\\Team\\2025\\Q4\\25.Q4.08",
          startDate: "2025-01-15T00:00:00Z",
          finishDate: "2025-01-28T00:00:00Z",
        },
      ];

      mockAdoService.getSprints.mockResolvedValueOnce(mockSprints);

      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject", team: "MyTeam" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          sprints: mockSprints,
        },
      });
      expect(mockAdoService.getSprints).toHaveBeenCalledWith(
        "MyProject",
        "MyTeam",
      );
    });

    it("should get sprints with special characters in names", async () => {
      const mockSprints = [
        {
          id: "sprint-1",
          name: "Sprint 1",
          path: "Project-Name\\Team-Name\\Sprint 1",
        },
      ];

      mockAdoService.getSprints.mockResolvedValueOnce(mockSprints);

      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "Project-Name", team: "Team-Name" });

      expect(response.status).toBe(200);
      expect(mockAdoService.getSprints).toHaveBeenCalledWith(
        "Project-Name",
        "Team-Name",
      );
    });

    it("should return empty array when team has no sprints", async () => {
      mockAdoService.getSprints.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject", team: "NewTeam" });

      expect(response.status).toBe(200);
      expect(response.body.data.sprints).toEqual([]);
    });

    it("should return 400 when project parameter is missing", async () => {
      const response = await request(app)
        .get("/iterations/sprints")
        .query({ team: "MyTeam" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "project and team query parameters are required",
        },
      });
      expect(mockAdoService.getSprints).not.toHaveBeenCalled();
    });

    it("should return 400 when team parameter is missing", async () => {
      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
      expect(response.body.error.message).toBe(
        "project and team query parameters are required",
      );
    });

    it("should return 400 when both parameters are missing", async () => {
      const response = await request(app).get("/iterations/sprints");

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "project and team query parameters are required",
      );
    });

    it("should return 400 when project is empty string", async () => {
      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "", team: "MyTeam" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 when team is empty string", async () => {
      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject", team: "" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
    });

    it("should handle service errors with 500 status", async () => {
      mockAdoService.getSprints.mockRejectedValueOnce(
        new Error("Team not found"),
      );

      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject", team: "NonExistentTeam" });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "GET_SPRINTS_FAILED",
          message: "Team not found",
        },
      });
    });

    it("should handle network errors", async () => {
      mockAdoService.getSprints.mockRejectedValueOnce(
        new Error("Network timeout"),
      );

      const response = await request(app)
        .get("/iterations/sprints")
        .query({ project: "MyProject", team: "MyTeam" });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("Network timeout");
    });
  });
});
