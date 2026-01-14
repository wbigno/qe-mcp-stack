/**
 * Proxy Routes for CarePayment API Access
 * Handles CORS bypass for swagger fetching and API execution
 */

import express from "express";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/proxy/swagger
 * Proxies swagger spec fetches to bypass CORS restrictions
 * Query params:
 *   - url: The swagger spec URL to fetch
 */
router.get("/swagger", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, error: "Missing url parameter" });
  }

  try {
    logger.info(`Proxying swagger fetch: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "QE-Orchestrator-Proxy/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch swagger: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error(`Error proxying swagger from ${url}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      url,
    });
  }
});

/**
 * POST /api/proxy/execute
 * Proxies API calls to CarePayment services
 * Body:
 *   - url: Full URL to call
 *   - method: HTTP method (GET, POST, PUT, DELETE, PATCH)
 *   - headers: Optional headers object
 *   - body: Optional request body
 */
router.post("/execute", async (req, res) => {
  const { url, method = "GET", headers = {}, body } = req.body;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, error: "Missing url in request body" });
  }

  const allowedMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
  ];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return res
      .status(400)
      .json({ success: false, error: `Invalid method: ${method}` });
  }

  try {
    logger.info(`Proxying API call: ${method} ${url}`);

    const startTime = Date.now();

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "QE-Orchestrator-Proxy/1.0",
        ...headers,
      },
    };

    // Add body for methods that support it
    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;

    // Get response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Try to parse as JSON, fall back to text
    let responseBody;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      duration,
      url,
      method: method.toUpperCase(),
    });
  } catch (error) {
    logger.error(`Error executing API call to ${url}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      url,
      method: method.toUpperCase(),
    });
  }
});

export default router;
