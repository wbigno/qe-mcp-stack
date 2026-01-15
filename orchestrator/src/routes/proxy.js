/**
 * Proxy Routes for CarePayment API Access
 * Handles CORS bypass for swagger fetching and API execution
 *
 * Features:
 * - Resilient fetching with retry logic and exponential backoff
 * - In-memory caching with configurable TTL
 * - Circuit breaker pattern for failing services
 * - Timeout handling with AbortController
 * - Detailed error classification
 */

import express from "express";
import { logger } from "../utils/logger.js";
import {
  fetchSwaggerSpec,
  resilientFetch,
  cache,
  circuit,
  ErrorTypes,
  FetchError,
} from "../utils/resilientFetch.js";

const router = express.Router();

/**
 * GET /api/proxy/swagger
 * Proxies swagger spec fetches to bypass CORS restrictions
 * Features:
 *   - Automatic retry with exponential backoff
 *   - Response caching (5 minutes TTL)
 *   - Circuit breaker for failing endpoints
 *   - Configurable timeout
 *
 * Query params:
 *   - url: The swagger spec URL to fetch (required)
 *   - noCache: Set to 'true' to bypass cache
 *   - timeout: Custom timeout in ms (default: 20000)
 */
router.get("/swagger", async (req, res) => {
  const { url, noCache, timeout } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing url parameter",
      errorType: "VALIDATION_ERROR",
    });
  }

  try {
    logger.info(`Proxying swagger fetch: ${url}`);

    const result = await fetchSwaggerSpec(url, {
      useCache: noCache !== "true",
      timeout: timeout ? parseInt(timeout, 10) : 20000,
    });

    // Add metadata to response headers
    res.set("X-Cache-Status", result.fromCache ? "HIT" : "MISS");
    res.set("X-Circuit-State", result.circuitState || "CLOSED");
    if (result.attempt) {
      res.set("X-Retry-Attempts", result.attempt.toString());
    }

    res.json(result.data);
  } catch (error) {
    logger.error(`Error proxying swagger from ${url}:`, error);

    const statusCode = getStatusCodeForError(error);
    const errorResponse = formatErrorResponse(error, url);

    res.status(statusCode).json(errorResponse);
  }
});

/**
 * POST /api/proxy/swagger/invalidate
 * Invalidates cached swagger spec for a URL
 *
 * Body:
 *   - url: The swagger spec URL to invalidate (optional - clears all if not provided)
 */
router.post("/swagger/invalidate", (req, res) => {
  const { url } = req.body;

  if (url) {
    const cacheKey = `GET:${url}`;
    cache.invalidate(cacheKey);
    logger.info(`Invalidated cache for: ${url}`);
    res.json({ success: true, message: `Cache invalidated for ${url}` });
  } else {
    cache.clear();
    logger.info("Cleared all swagger cache");
    res.json({ success: true, message: "All cache cleared" });
  }
});

/**
 * GET /api/proxy/swagger/stats
 * Returns cache and circuit breaker statistics
 */
router.get("/swagger/stats", (req, res) => {
  res.json({
    success: true,
    cache: cache.getStats(),
    circuitBreaker: circuit.getStats(),
  });
});

/**
 * POST /api/proxy/circuit/reset
 * Resets circuit breaker for a specific origin or all
 *
 * Body:
 *   - origin: The origin to reset (optional - resets all if not provided)
 */
router.post("/circuit/reset", (req, res) => {
  const { origin } = req.body;

  circuit.reset(origin || undefined);
  logger.info(
    origin
      ? `Reset circuit breaker for: ${origin}`
      : "Reset all circuit breakers",
  );

  res.json({
    success: true,
    message: origin
      ? `Circuit breaker reset for ${origin}`
      : "All circuit breakers reset",
  });
});

/**
 * POST /api/proxy/execute
 * Proxies API calls to CarePayment services
 * Features:
 *   - Automatic retry for transient failures
 *   - Timeout handling
 *   - Circuit breaker for failing services
 *
 * Body:
 *   - url: Full URL to call (required)
 *   - method: HTTP method (GET, POST, PUT, DELETE, PATCH)
 *   - headers: Optional headers object
 *   - body: Optional request body
 *   - timeout: Optional timeout in ms (default: 30000)
 *   - retries: Optional number of retries (default: 2)
 */
router.post("/execute", async (req, res) => {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    timeout = 30000,
    retries = 2,
  } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing url in request body",
      errorType: "VALIDATION_ERROR",
    });
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
    return res.status(400).json({
      success: false,
      error: `Invalid method: ${method}`,
      errorType: "VALIDATION_ERROR",
    });
  }

  const startTime = Date.now();

  try {
    logger.info(`Proxying API call: ${method} ${url}`);

    const result = await resilientFetch(url, {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      body,
      timeout,
      retries,
      useCache: false, // Don't cache API execution results
      parseJson: true,
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      status: 200,
      statusText: "OK",
      headers: {},
      body: result.data,
      duration,
      url,
      method: method.toUpperCase(),
      circuitState: result.circuitState,
      attempts: result.attempt,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error executing API call to ${url}:`, error);

    // For HTTP errors, extract the status code
    const statusCode = error.details?.status || 500;
    const statusText = error.details?.statusText || error.message;

    res.json({
      success: false,
      status: statusCode,
      statusText,
      error: error.message,
      errorType: error.type || ErrorTypes.UNKNOWN,
      duration,
      url,
      method: method.toUpperCase(),
      details: error.details,
    });
  }
});

/**
 * GET /api/proxy/health
 * Health check for the proxy service
 */
router.get("/health", (req, res) => {
  const cacheStats = cache.getStats();
  const circuitStats = circuit.getStats();

  res.json({
    success: true,
    status: "healthy",
    cache: cacheStats,
    circuitBreaker: {
      open: circuitStats.open,
      closed: circuitStats.closed,
      halfOpen: circuitStats.halfOpen,
    },
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map error types to HTTP status codes
 */
function getStatusCodeForError(error) {
  if (error instanceof FetchError) {
    switch (error.type) {
      case ErrorTypes.TIMEOUT:
        return 504; // Gateway Timeout
      case ErrorTypes.CIRCUIT_OPEN:
        return 503; // Service Unavailable
      case ErrorTypes.HTTP_ERROR:
        return error.details?.status || 502; // Bad Gateway
      case ErrorTypes.NETWORK:
        return 502; // Bad Gateway
      case ErrorTypes.PARSE_ERROR:
        return 502; // Bad Gateway
      default:
        return 500;
    }
  }
  return 500;
}

/**
 * Format error response with detailed information
 */
function formatErrorResponse(error, url) {
  const response = {
    success: false,
    error: error.message,
    errorType: error.type || ErrorTypes.UNKNOWN,
    url,
  };

  if (error instanceof FetchError) {
    response.details = error.details;
    response.timestamp = error.timestamp;

    // Add helpful messages based on error type
    switch (error.type) {
      case ErrorTypes.TIMEOUT:
        response.suggestion =
          "The service is taking too long to respond. Try again later or check if the service is running.";
        break;
      case ErrorTypes.CIRCUIT_OPEN:
        response.suggestion =
          "The service has been failing consistently. The circuit breaker will automatically retry after a cooldown period.";
        response.willRetryAt = error.details?.willRetryAt;
        break;
      case ErrorTypes.NETWORK:
        response.suggestion =
          "Unable to connect to the service. Check if the service is running and accessible.";
        break;
      case ErrorTypes.HTTP_ERROR:
        response.suggestion =
          "The service returned an error. Check the status code for more details.";
        break;
      case ErrorTypes.PARSE_ERROR:
        response.suggestion =
          "The response was not valid JSON. The service may be returning an error page.";
        break;
    }
  }

  return response;
}

export default router;
