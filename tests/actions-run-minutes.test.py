import runpy
import unittest
from pathlib import Path


script = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'tools/actions-run-minutes.py'))
report = script['report']
sequel_gate = script['sequel_gate']



class RunMinutes(unittest.TestCase):
    def test_retries_count_each_job_once_and_omit_incomplete_or_skipped(self):
        first = {'id': 41, 'name': 'browser', 'runner_name': 'Ubuntu fixture', 'status': 'completed',
                 'started_at': '2026-11-23T15:00:00Z', 'completed_at': '2026-11-23T15:01:02Z', 'conclusion': 'success'}
        second = {**first, 'id': 42, 'name': 'domain', 'completed_at': '2026-11-23T15:00:35Z'}
        progress = {**first, 'id': 43, 'status': 'in_progress', 'completed_at': None}
        skipped = {**second, 'id': 44, 'runner_name': None, 'conclusion': 'skipped'}
        retrievals = []

        def fetch(endpoint, pages=False):
            retrievals.append(endpoint)
            if not pages:
                return {'run_attempt': 2, 'head_sha': 'abc', 'html_url': 'https://example.test/run',
                        'event': 'pull_request', 'status': 'in_progress'}
            if '/attempts/1/' in endpoint:
                return [{'jobs': [first, skipped]}]
            return [{'jobs': [first]}, {'jobs': [second, progress]}]

        summary = report('someone/game', [10, 10], fetch)
        self.assertEqual(len(retrievals), 3)
        self.assertEqual(summary['workflowCount'], 1)
        self.assertEqual(summary['additionalAttempts'], 1)
        self.assertEqual(summary['observedRunnerMinutes'], 1.62)
        self.assertEqual(summary['perJobRoundedMinutes'], 3)
        run = summary['runs'][0]
        self.assertEqual(run['incompleteJobs'], 1)
        self.assertEqual([job['runnerSeconds'] for job in run['jobs']], [62, None, 35, None])
        self.assertEqual(run['jobs'][0]['firstListedAttempt'], 1)

    def test_exact_sequel_gate_rejects_stale_masked_or_incomplete_checks(self):
        approved_head = 'a' * 40
        jobs = [
            {'name': name, 'status': 'completed', 'conclusion': 'success', 'firstListedAttempt': 1}
            for name in script['REQUIRED_JOBS']
        ]
        nominal = {'runId': 42, 'commit': approved_head, 'workflowPath': script['SEQUEL_WORKFLOW'],
                   'event': 'pull_request', 'status': 'completed', 'conclusion': 'success', 'jobs': jobs}
        self.assertTrue(sequel_gate([nominal], approved_head, 'pull_request')['ready'])
        replacement = [{**jobs[1], 'conclusion': 'failure'}, {**jobs[1], 'firstListedAttempt': 2}]
        retried = {**nominal, 'jobs': [jobs[0], *replacement, *jobs[2:]]}
        self.assertTrue(sequel_gate([retried], approved_head, 'pull_request')['ready'])
        for update, expected in [
            ({'commit': 'b' * 40}, 'different commit'),
            ({'event': 'push'}, 'different trigger'),
            ({'workflowPath': '.github/workflows/another.yml'}, 'different workflow'),
            ({'jobs': jobs[:-2] + jobs[-1:]}, 'browser-shard (3/3) is missing'),
            ({'jobs': jobs + [{**jobs[1], 'status': 'in_progress', 'firstListedAttempt': 2}]},
             'browser-shard (1/3) has no successful conclusion'),
            ({'jobs': jobs + [jobs[1]]}, 'browser-shard (1/3) is ambiguous'),
        ]:
            outcome = sequel_gate([{**nominal, **update}], approved_head, 'pull_request')
            self.assertFalse(outcome['ready'])
            self.assertIn(expected, outcome['runs'][0]['blockers'])


if __name__ == '__main__':
    unittest.main()
