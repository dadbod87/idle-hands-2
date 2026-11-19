import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

export default defineConfig({
 testDir: '.',
 testMatch: 'opening-local.spec.ts',
 outputDir: '../../test-results/browser/opening-study-run',
 workers: 1,
 use: {baseURL: 'http://127.0.0.1:4293', channel: process.env.CI ? undefined : 'chrome', headless: true},
 webServer: {
  command: 'node serve.mjs',
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  url: 'http://127.0.0.1:4293/tools/lodging-study/',
  reuseExistingServer: false,
 },
});
