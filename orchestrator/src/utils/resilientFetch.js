/**
 * Resilient Fetch Utility
 * Provides robust HTTP fetching with:
 * - Retry logic with exponential backoff
 * - Timeout handling with AbortController
 * - In-memory caching with TTL
 * - Circuit breaker pattern
 * - Detailed error classification
 */

import { logger } from "./logger.js";

// ============================================================================
// Cache Implementation
// ============================================================================

class SwaggerCache {
  constructor(defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now(),
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    let valid = 0;
    let expired = 0;
    const now = Date.now();

    for (const [, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return { valid, expired, total: this.cache.size };
  }
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenRequests = options.halfOpenRequests || 1;

    this.circuits = new Map();
  }

  getCircuit(key) {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: "CLOSED",
        failures: 0,
        lastFailure: null,
        halfOpenAttempts: 0,
      });
    }
    return this.circuits.get(key);
  }

  canRequest(key) {
    const circuit = this.getCircuit(key);

    switch (circuit.state) {
      case "CLOSED":
        return true;

      case "OPEN":
        // Check if we should transition to half-open
        if (Date.now() - circuit.lastFailure > this.resetTimeout) {
          circuit.state = "HALF_OPEN";
          circuit.halfOpenAttempts = 0;
          logger.info(`Circuit breaker for ${key} transitioning to HALF_OPEN`);
          return true;
        }
        return false;

      case "HALF_OPEN":
        return circuit.halfOpenAttempts < this.halfOpenRequests;

      default:
        return true;
    }
  }

  recordSuccess(key) {
    const circuit = this.getCircuit(key);

    if (circuit.state === "HALF_OPEN") {
      circuit.state = "CLOSED";
      circuit.failures = 0;
      logger.info(`Circuit breaker for ${key} CLOSED after successful request`);
    } else {
      circuit.failures = 0;
    }
  }

  recordFailure(key) {
    const circuit = this.getCircuit(key);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.state === "HALF_OPEN") {
      circuit.state = "OPEN";
      logger.warn(
        `Circuit breaker for ${key} OPENED (failed in half-open state)`,
      );
    } else if (circuit.failures >= this.failureThreshold) {
      circuit.state = "OPEN";
      logger.warn(
        `Circuit breaker for ${key} OPENED after ${circuit.failures} failures`,
      );
    }
  }

  getState(key) {
    return this.getCircuit(key).state;
  }

  reset(key) {
    if (key) {
      this.circuits.delete(key);
    } else {
      this.circuits.clear();
    }
  }

  getStats() {
    const stats = {
      open: 0,
      closed: 0,
      halfOpen: 0,
      circuits: {},
    };

    for (const [key, circuit] of this.circuits) {
      stats[
        circuit.state === "CLOSED"
          ? "closed"
          : circuit.state === "OPEN"
            ? "open"
            : "halfOpen"
      ]++;
      stats.circuits[key] = {
        state: circuit.state,
        failures: circuit.failures,
        lastFailure: circuit.lastFailure,
      };
    }

    return stats;
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class FetchError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = "FetchError";
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorTypes = {
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  HTTP_ERROR: "HTTP_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",
  ABORTED: "ABORTED",
  UNKNOWN: "UNKNOWN",
};

// ============================================================================
// Resilient Fetch Implementation
// ============================================================================

// Singleton instances
const swaggerCache = new SwaggerCache();
const circuitBreaker = new CircuitBreaker();

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt, baseDelay = 1000, maxDelay = 10000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25;
  return delay + jitter;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resilient fetch with retry, caching, and circuit breaker
 */
export async function resilientFetch(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = 15000,
    retries = 3,
    retryDelay = 1000,
    maxRetryDelay = 10000,
    useCache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    bypassCircuitBreaker = false,
    parseJson = true,
  } = options;

  const cacheKey = `${method}:${url}`;
  const circuitKey = new URL(url).origin;

  // Check cache first (only for GET requests)
  if (useCache && method === "GET") {
    const cached = swaggerCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${url}`);
      return {
        data: cached,
        fromCache: true,
        circuitState: circuitBreaker.getState(circuitKey),
      };
    }
  }

  // Check circuit breaker
  if (!bypassCircuitBreaker && !circuitBreaker.canRequest(circuitKey)) {
    throw new FetchError(
      `Circuit breaker is OPEN for ${circuitKey}. Service appears to be unavailable.`,
      ErrorTypes.CIRCUIT_OPEN,
      {
        circuitKey,
        state: circuitBreaker.getState(circuitKey),
        willRetryAt: new Date(
          Date.now() + circuitBreaker.resetTimeout,
        ).toISOString(),
      },
    );
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`Fetching ${url} (attempt ${attempt + 1}/${retries + 1})`);

      const response = await fetchWithTimeout(
        url,
        {
          method,
          headers: {
            Accept: "application/json",
            "User-Agent": "QE-Orchestrator-Proxy/2.0",
            ...headers,
          },
          body: body
            ? typeof body === "string"
              ? body
              : JSON.stringify(body)
            : undefined,
        },
        timeout,
      );

      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          ErrorTypes.HTTP_ERROR,
          {
            status: response.status,
            statusText: response.statusText,
            url,
          },
        );
      }

      let data;
      if (parseJson) {
        try {
          data = await response.json();
        } catch (parseErr) {
          throw new FetchError(
            `Failed to parse JSON response: ${parseErr.message}`,
            ErrorTypes.PARSE_ERROR,
            { url, originalError: parseErr.message },
          );
        }
      } else {
        data = await response.text();
      }

      // Success - update circuit breaker and cache
      circuitBreaker.recordSuccess(circuitKey);

      if (useCache && method === "GET") {
        swaggerCache.set(cacheKey, data, cacheTTL);
      }

      return {
        data,
        fromCache: false,
        attempt: attempt + 1,
        circuitState: circuitBreaker.getState(circuitKey),
      };
    } catch (error) {
      lastError = error;

      // Classify the error
      if (error.name === "AbortError") {
        lastError = new FetchError(
          `Request timed out after ${timeout}ms`,
          ErrorTypes.TIMEOUT,
          { url, timeout },
        );
      } else if (error.type === ErrorTypes.CIRCUIT_OPEN) {
        // Don't retry circuit breaker errors
        throw error;
      } else if (!error.type) {
        // Network or unknown error
        lastError = new FetchError(
          error.message || "Network error",
          error.message?.includes("fetch")
            ? ErrorTypes.NETWORK
            : ErrorTypes.UNKNOWN,
          { url, originalError: error.message },
        );
      }

      // Record failure in circuit breaker
      circuitBreaker.recordFailure(circuitKey);

      // Check if we should retry
      if (attempt < retries) {
        const delay = getBackoffDelay(attempt, retryDelay, maxRetryDelay);
        logger.warn(
          `Fetch failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${Math.round(delay)}ms: ${lastError.message}`,
        );
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  logger.error(
    `All ${retries + 1} attempts failed for ${url}: ${lastError.message}`,
  );
  throw lastError;
}

/**
 * Fetch Swagger spec with sensible defaults
 */
export async function fetchSwaggerSpec(url, options = {}) {
  return resilientFetch(url, {
    timeout: 20000, // Swagger specs can be large
    retries: 3,
    useCache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// Exports for cache and circuit breaker management
// ============================================================================

export const cache = {
  get: (key) => swaggerCache.get(key),
  invalidate: (key) => swaggerCache.invalidate(key),
  clear: () => swaggerCache.clear(),
  getStats: () => swaggerCache.getStats(),
};

export const circuit = {
  getState: (key) => circuitBreaker.getState(key),
  reset: (key) => circuitBreaker.reset(key),
  getStats: () => circuitBreaker.getStats(),
};

export default {
  resilientFetch,
  fetchSwaggerSpec,
  cache,
  circuit,
  ErrorTypes,
  FetchError,
};
