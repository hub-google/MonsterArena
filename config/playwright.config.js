import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '../tests',
  outputDir: '../test-results',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://hub-google.github.io/MonsterArena/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] } },
    },
  ],
});
