import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, maxFailures:process.env.CI?1:undefined, timeout: process.env.CI ? 180000 : 45000,
 expect:{timeout:process.env.CI?15000:5000},
 use: { baseURL: 'http://127.0.0.1:4198', channel: process.env.CI ? undefined : 'chrome', headless: true, trace: {mode:'retain-on-failure',screenshots:false,snapshots:true,sources:true}, screenshot:'only-on-failure' },
 webServer: [{command:'node --experimental-strip-types tools/cafe-browser-server.ts',url:'http://127.0.0.1:4207/api/town/fixtures',reuseExistingServer:false,timeout:30000},{command:'npm run preview -- --port 4208 --strictPort',url:'http://127.0.0.1:4208',env:{IH2_API_PORT:'4207'},reuseExistingServer:false},{command:'node --experimental-strip-types tools/neighborhood-browser-server.ts',url:'http://127.0.0.1:4199/api/town/fixtures',reuseExistingServer:false,timeout:30000},{command:'npm run preview -- --port 4196 --strictPort',url:'http://127.0.0.1:4196',env:{IH2_API_PORT:'4199'},reuseExistingServer:false}, {command:'npm run town:test-server',url:'http://127.0.0.1:4197/api/town/fixtures',reuseExistingServer:false,timeout:30000},{ command: 'npm run preview -- --port 4198 --strictPort', url: 'http://127.0.0.1:4198', env:{IH2_API_PORT:'4197'},reuseExistingServer: false }],
 reporter: [['list'], ['html', {open:'never'}]]
});
