import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'.',
 testMatch:'preview.spec.ts',
 workers:1,
 use:{baseURL:'http://127.0.0.1:4312',channel:'chrome',headless:true},
 webServer:{
  cwd:new URL('../../',import.meta.url).pathname,
  command:'node --experimental-strip-types tools/create-snack-offer-study.ts && python3 -m http.server 4312 --bind 127.0.0.1 --directory test-results/browser/snack-offer-study',
  url:'http://127.0.0.1:4312',
  reuseExistingServer:false,
 },
});
