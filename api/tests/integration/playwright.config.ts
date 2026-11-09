import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  outputDir: '../../../test-results/api-integration',
  use: { browserName: 'chromium', channel: 'chromium' },
});
