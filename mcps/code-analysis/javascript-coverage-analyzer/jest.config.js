export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],

  // ES6 module support
  transform: {},

  collectCoverageFrom: ["src/**/*.js", "!src/**/*.d.js"],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
