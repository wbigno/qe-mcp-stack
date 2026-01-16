module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["index.js"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000, // STDIO processes may take longer
};
