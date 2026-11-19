import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'.',
  workers:1,
  timeout:120_000,
  outputDir:'../../test-results/neighborhood-art-study',
  use:{headless:true,channel:'chrome',baseURL:'http://127.0.0.1:4337'},
  webServer:{
    command:'python3 -m http.server 4337 --bind 127.0.0.1 --directory "$IH2_STREET_STATIC_DIR"',
    env:{IH2_STREET_STATIC_DIR:process.env.IH2_STREET_STATIC_DIR??'dist'},
    cwd:process.cwd(),
    url:'http://127.0.0.1:4337',
    reuseExistingServer:false,
  },
});
