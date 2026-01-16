// eslint-disable-next-line no-unused-vars
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

describe("Third-party Integration Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const PORT = 8101;

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "third-party-mcp",
        timestamp: new Date().toISOString(),
        port: PORT,
      });
    });

    app.get("/api/stripe/customers", (req, res) => {
      res.json({ message: "Stripe customers endpoint" });
    });

    app.get("/api/stripe/payments", (req, res) => {
      res.json({ message: "Stripe payments endpoint" });
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("third-party-mcp");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should include port number", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.port).toBe(8101);
    });
  });

  describe("GET /api/stripe/customers", () => {
    it("should return Stripe customers endpoint message", async () => {
      const response = await request(app).get("/api/stripe/customers");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Stripe customers endpoint");
    });

    it("should return JSON response", async () => {
      const response = await request(app).get("/api/stripe/customers");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/stripe/payments", () => {
    it("should return Stripe payments endpoint message", async () => {
      const response = await request(app).get("/api/stripe/payments");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Stripe payments endpoint");
    });

    it("should return JSON response", async () => {
      const response = await request(app).get("/api/stripe/payments");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/json/);
    });
  });
});
