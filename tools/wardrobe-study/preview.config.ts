import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'.',
 testMatch:'preview.spec.ts',
 workers:1,
 use:{baseURL:'http://127.0.0.1:4320',channel:'chrome',headless:true},
 webServer:{
  cwd:new URL('../../',import.meta.url).pathname,
  command:'python3 tools/wardrobe-study/create.py && python3 -m http.server 4320 --bind 127.0.0.1 --directory test-results/browser/wardrobe-study',
  url:'http://127.0.0.1:4320',
  reuseExistingServer:false,
 },
});
