import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'.',
  testMatch:['profile.spec.ts','door-delay.spec.ts'],
  workers:1,
  timeout:120_000,
  outputDir:'../../test-results/bootstrap-art',
  use:{headless:true,channel:'chrome',baseURL:'http://127.0.0.1:4320'},
  webServer:{
    command:'python3 -m http.server 4320 --bind 127.0.0.1 --directory "$IH2_BOOT_ART_STATIC_DIR"',
    env:{IH2_BOOT_ART_STATIC_DIR:process.env.IH2_BOOT_ART_STATIC_DIR??'dist'},
    cwd:process.cwd(),
    url:'http://127.0.0.1:4320',
    reuseExistingServer:false,
  },
});
