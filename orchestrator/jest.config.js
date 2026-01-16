export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],

  // No transform needed for ES6 modules
  transform: {},

  // Setup file for global test configuration
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/setup.js"],

  // HTML Test Reporter
  reporters: [
    "default", // Keep the default console reporter
    [
      "jest-html-reporters",
      {
        publicPath: "./test-reports",
        filename: "orchestrator-test-report.html",
        pageTitle: "Orchestrator Test Report",
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/swagger/**", // Exclude swagger specs
    "!src/index.js", // Exclude entry point
  ],

  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    "./src/services/": {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    "./src/utils/": {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    "./src/routes/": {
      statements: 35,
      branches: 15,
      functions: 15,
      lines: 35,
    },
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout for tests (30s for integration tests)
  testTimeout: 30000,
};
