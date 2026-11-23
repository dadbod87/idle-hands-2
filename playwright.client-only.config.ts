import { defineConfig } from '@playwright/test';
import full from './playwright.config';

const port = Number(process.env.IH2_CLIENT_TEST_PORT ?? 4341);
if (!Number.isInteger(port) || port < 4341 || port > 4359) {
  throw new Error('Choose a disposable client test port from 4341 through 4359.');
}
const engine = process.env.IH2_CLIENT_TEST_BROWSER ?? 'chromium';
if (engine !== 'chromium' && engine !== 'webkit') {
  throw new Error('Choose chromium or webkit for the client-only browser check.');
}
const url = `http://127.0.0.1:${port}`;

// This opt-in configuration starts only the compiled client. Select explicit
// browser-local or intercepted cases. The default config retains full coverage.
export default defineConfig({
  ...full,
  use: { ...full.use, baseURL: url, browserName: engine, channel: undefined },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url,
    env: { IH2_API_PORT: '1' },
    reuseExistingServer: false,
  },
});
