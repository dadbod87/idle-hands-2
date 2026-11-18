import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {browserTarget} from '../tools/browser-target.ts';

const local = {container: 'idle-hands-2-cafe-candidate-pg'};
const base = 'postgres://fixture:private-sentinel@127.0.0.1:55434/ih2_browser';

test('browser reset target accepts only explicit disposable local and CI identities', () => {
  assert.equal(browserTarget(base, local), base);
  for (const name of ['ih2_browser', 'ih2_cafe_browser', 'ih2_neighborhood_browser', 'ih2_housing_browser', 'ih2_housing_review'] as const) {
    assert.equal(new URL(browserTarget(base, local, name)).pathname, '/' + name);
  }
  const ci = base.replace('55434', '5432');
  assert.equal(browserTarget(ci, {ci: 'true', container: 'abcdef123456'}), ci);
  assert.equal(new URL(browserTarget(base.replace('/ih2_browser', '/ih2_neighborhood_browser'), local, 'ih2_neighborhood_browser')).pathname, '/ih2_neighborhood_browser');
});

test('browser reset target refuses protected, implicit, redirected and mismatched targets without URL disclosure', () => {
  const cases: Array<[string | undefined, Parameters<typeof browserTarget>[1]]> = [
    [undefined, local], ['private-sentinel invalid URL', local], [base.replace('55434', '55432'), local],
    [base, {}], [base, {container: 'idle-hands-2-pg'}], [base.replace('55434', '5432'), {ci: 'true', container: 'wrong'}],
    [base.replace('55434', '5432'), {container: 'abcdef123456'}], [base.replace('127.0.0.1', 'remote.example'), local],
    [base + '?host=remote.example', local], [base + '#private-sentinel', local],
    [base.replace('/ih2_browser', '/ih2_preview'), local], [base.replace('postgres:', 'https:'), local],
    [base.replace(':55434', ''), local],
  ];
  for (const [value, options] of cases) assert.throws(() => browserTarget(value, options), error => {
    assert.match((error as Error).message, /explicit matching disposable/);
    assert.doesNotMatch((error as Error).message, /private-sentinel|remote\.example|postgres:\/\//);
    return true;
  });
});

test('every destructive browser entry point refuses absent or protected target before starting', () => {
  for (const file of ['browser-server', 'cafe-browser-server', 'neighborhood-browser-server', 'housing-browser-server', 'run-combined-audit-server']) {
    for (const value of ['', base.replace('55434', '55432')]) {
      const result = spawnSync(process.execPath, ['--experimental-strip-types', 'tools/' + file + '.ts'], {
        env: {...process.env, IH2_BROWSER_DATABASE_URL: value, IH2_NEIGHBORHOOD_BROWSER_DATABASE_URL: value,
          IH2_PG_CONTAINER: local.container, CI: ''}, encoding: 'utf8', timeout: 15000,
      });
      assert.equal(result.status, 1, file + ' must exit on target refusal');
      assert.equal(result.error, undefined);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /explicit matching disposable/);
      assert.doesNotMatch(result.stderr, /private-sentinel|ECONNREFUSED|database connection interrupted/);
    }
  }
});
