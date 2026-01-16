export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],

  // ES6 module support
  transform: {},

  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.d.js",
    "!src/index-with-registry.js",
  ],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
