import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, timeout: process.env.CI ? 180000 : 45000,
 expect:{timeout:process.env.CI?15000:5000},
 use: { baseURL: 'http://127.0.0.1:4198', channel: process.env.CI ? undefined : 'chrome', headless: true, trace: 'retain-on-failure' },
 webServer: [{command:'npm run town:test-server',url:'http://127.0.0.1:4197/api/town/fixtures',reuseExistingServer:false,timeout:30000},{ command: 'npm run preview -- --port 4198 --strictPort', url: 'http://127.0.0.1:4198', env:{IH2_API_PORT:'4197'},reuseExistingServer: false }],
 reporter: [['list'], ['html', {open:'never'}]]
});
