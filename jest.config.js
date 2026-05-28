/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30_000,
  // Run integration tests serially — they share the same MySQL/Redis backends.
  maxWorkers: 1,
};
