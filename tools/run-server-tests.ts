import {spawn} from 'node:child_process';
process.env.IH2_TEST_DATABASE_URL??='postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_test';
process.env.IH2_HTTP_TEST_DATABASE_URL??='postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_http_test';
process.env.IH2_PG_DOCKER??='1';
const child=spawn(process.execPath,['--experimental-strip-types','--test','tests/server-store.test.ts','tests/server-http.test.ts'],{env:process.env,stdio:'inherit'});child.on('exit',code=>process.exitCode=code??1);
