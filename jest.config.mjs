export default {
  testEnvironment: "node",
  collectCoverageFrom: ["db.js", "!**/node_modules/**"],
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  globalTeardown: "<rootDir>/tests/teardown.js", // Add this line
  transform: {},
};
