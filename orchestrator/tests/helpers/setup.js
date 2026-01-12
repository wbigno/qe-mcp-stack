/**
 * Global test setup - runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.ANTHROPIC_API_KEY = "test-api-key-12345";
process.env.LOG_LEVEL = "error"; // Suppress logs during tests

// Global test utilities
global.waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
