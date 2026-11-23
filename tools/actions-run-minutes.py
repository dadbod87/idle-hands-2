#!/usr/bin/env python3
"""Report observed runner time for explicit GitHub Actions runs. Read-only."""

import argparse
import json
import math
import re
import subprocess
import sys
from datetime import datetime


SEQUEL_WORKFLOW = '.github/workflows/sequel-ci.yml'
REQUIRED_JOBS = (
    'domain-build-plan',
    'browser-shard (1/3)',
    'browser-shard (2/3)',
    'browser-shard (3/3)',
    'browser-playtest',
)

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
            'attempts': attempts, 'event': run['event'], 'workflowPath': run.get('path'), 'status': run['status'],
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


def sequel_gate(runs, expected_head, expected_event=None):
    evaluated = []
    for run in runs:
        blockers = []
        if run['commit'] != expected_head:
            blockers.append('different commit')
        if run['workflowPath'] != SEQUEL_WORKFLOW:
            blockers.append('different workflow')
        if expected_event and run['event'] != expected_event:
            blockers.append('different trigger')
        if run['status'] != 'completed' or run['conclusion'] != 'success':
            blockers.append('workflow has no successful conclusion')
        for name in REQUIRED_JOBS:
            jobs = [job for job in run['jobs'] if job['name'] == name]
            if not jobs:
                blockers.append(f'{name} is missing')
                continue
            last_attempt = max(job['firstListedAttempt'] for job in jobs)
            latest = [job for job in jobs if job['firstListedAttempt'] == last_attempt]
            if len(latest) != 1:
                blockers.append(f'{name} is ambiguous')
            elif latest[0]['status'] != 'completed' or latest[0]['conclusion'] != 'success':
                blockers.append(f'{name} has no successful conclusion')
        evaluated.append({'runId': run['runId'], 'ready': not blockers, 'blockers': blockers})
    return {
        'expectedHead': expected_head, 'expectedEvent': expected_event,
        'ready': any(run['ready'] for run in evaluated), 'runs': evaluated,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_ids', nargs='+', type=int)
    parser.add_argument('--repo', default='dadbod87/idle-hands-2')
    parser.add_argument('--require-sequel-head', metavar='SHA',
                        help='Check each selected run against the full sequel commit and all five jobs.')
    parser.add_argument('--require-event', choices=('pull_request', 'push', 'workflow_dispatch'),
                        help='Require this trigger when checking an exact sequel commit.')
    args = parser.parse_args()
    if args.require_sequel_head and not re.fullmatch(r'[0-9a-fA-F]{40}', args.require_sequel_head):
        parser.error('Use the full 40-character commit SHA.')
    if args.require_event and not args.require_sequel_head:
        parser.error('--require-event needs --require-sequel-head.')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo) or any(n < 1 for n in args.run_ids):
        parser.error('Use owner/repository and positive workflow run IDs.')
    try:
        summary = report(args.repo, args.run_ids)
        gate = None
        if args.require_sequel_head:
            gate = sequel_gate(summary['runs'], args.require_sequel_head.lower(), args.require_event)
            summary['exactSequelGate'] = gate
        json.dump(summary, sys.stdout, indent=2)
        print()
        if gate and not gate['ready']:
            parser.exit(2)
    except (OSError, RuntimeError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
