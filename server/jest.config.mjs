export default {
  testEnvironment: "node",
  collectCoverageFrom: ["db.js", "!**/node_modules/**"],
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  transform: {},
};
