export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  transform: {},

  // HTML Test Reporter
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./test-reports",
        filename: "shared-utilities-test-report.html",
        pageTitle: "Shared Utilities Test Report",
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],

  collectCoverageFrom: ["*.js", "!jest.config.js"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
