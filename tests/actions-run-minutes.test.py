import runpy
import unittest
from pathlib import Path


report = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'tools/actions-run-minutes.py'))['report']


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


if __name__ == '__main__':
    unittest.main()
