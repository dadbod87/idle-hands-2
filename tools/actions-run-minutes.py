#!/usr/bin/env python3
"""Report observed runner time for explicit GitHub Actions runs. Read-only."""

import argparse
import json
import math
import re
import subprocess
import sys
from datetime import datetime


BROWSER_STEPS = {
    'Install pinned Chromium and Ubuntu dependencies',
    'Run assigned browser cases',
}


def seconds(record):
    if not record.get('started_at') or not record.get('completed_at'):
        return None
    start, end = [datetime.fromisoformat(record[field].replace('Z', '+00:00'))
                  for field in ('started_at', 'completed_at')]
    if end < start:
        raise ValueError('GitHub returned reversed job timestamps.')
    return (end - start).total_seconds()


def read_github(endpoint, pages=False):
    command = ['gh', 'api', '-X', 'GET', endpoint]
    if pages:
        command += ['--paginate', '--slurp']
    response = subprocess.run(command, capture_output=True, text=True, timeout=30)
    if response.returncode:
        raise RuntimeError('GitHub could not read ' + endpoint)
    return json.loads(response.stdout)


def report(repo, run_ids, fetch=read_github):
    runs = []
    for run_id in dict.fromkeys(run_ids):
        endpoint = f'repos/{repo}/actions/runs/{run_id}'
        run = fetch(endpoint)
        attempts = run['run_attempt']
        jobs_by_id = {}
        for attempt in range(1, attempts + 1):
            pages = fetch(f'{endpoint}/attempts/{attempt}/jobs?per_page=100', pages=True)
            for page in pages:
                for job in page['jobs']:
                    if job['id'] not in jobs_by_id:
                        jobs_by_id[job['id']] = (attempt, job)
        jobs = []
        for attempt, job in jobs_by_id.values():
            elapsed = None
            if job.get('runner_name') and job['status'] == 'completed':
                elapsed = seconds(job)
            metrics = {step['name']: seconds(step) for step in job.get('steps', [])
                       if step['name'] in BROWSER_STEPS}
            jobs.append({
                'jobId': job['id'], 'name': job['name'], 'firstListedAttempt': attempt,
                'status': job['status'], 'conclusion': job.get('conclusion'),
                'runner': job.get('runner_name'), 'labels': job.get('labels', []),
                'runnerSeconds': elapsed, 'browserStepSeconds': metrics,
            })
        measured = [job['runnerSeconds'] for job in jobs if job['runnerSeconds'] is not None]
        runs.append({
            'runId': run_id, 'url': run['html_url'], 'commit': run['head_sha'],
            'attempts': attempts, 'event': run['event'], 'status': run['status'],
            'conclusion': run.get('conclusion'), 'jobs': jobs,
            'observedRunnerSeconds': sum(measured),
            'observedRunnerMinutes': round(sum(measured) / 60, 2),
            'perJobRoundedMinutes': sum(math.ceil(value / 60) for value in measured),
            'incompleteJobs': sum(job['status'] != 'completed' for job in jobs),
        })
    total = sum(run['observedRunnerSeconds'] for run in runs)
    return {
        'repository': repo, 'workflowCount': len(runs),
        'additionalAttempts': sum(run['attempts'] - 1 for run in runs),
        'observedRunnerMinutes': round(total / 60, 2),
        'perJobRoundedMinutes': sum(run['perJobRoundedMinutes'] for run in runs),
        'method': 'Completed jobs with an assigned runner. Inherited job IDs counted once per workflow. In-progress durations are omitted. This is not an invoice.',
        'runs': runs,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_ids', nargs='+', type=int)
    parser.add_argument('--repo', default='dadbod87/idle-hands-2')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo) or any(n < 1 for n in args.run_ids):
        parser.error('Use owner/repository and positive workflow run IDs.')
    try:
        json.dump(report(args.repo, args.run_ids), sys.stdout, indent=2)
        print()
    except (OSError, RuntimeError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
