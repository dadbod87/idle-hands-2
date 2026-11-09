import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, timeout: process.env.CI ? 90000 : 45000,
 use: { baseURL: 'http://127.0.0.1:4198', channel: process.env.CI ? undefined : 'chrome', headless: true, trace: 'retain-on-failure' },
 webServer: { command: 'npm run preview -- --port 4198 --strictPort', url: 'http://127.0.0.1:4198', reuseExistingServer: false },
 reporter: [['list'], ['html', {open:'never'}]]
});
