#!/usr/bin/env python3
"""Offline, read-only sequel roadmap validation and continuation prompt. No network or subprocesses."""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROADMAP = Path('docs/idle-hands-2/ROADMAP.json')
STATUSES = {'queued', 'in_progress', 'blocked', 'done'}


def validate(board, root):
    errors = []
    if not isinstance(board, dict) or board.get('schema_version') != 1:
        return ['Expected roadmap object with schema_version 1.']
    tasks = board.get('tasks')
    if not isinstance(tasks, list) or not tasks:
        return ['tasks must be a nonempty list.']
    ids = {}
    for i, task in enumerate(tasks):
        if not isinstance(task, dict):
            errors.append(f'Task {i}: expected an object.')
            continue
        tid = task.get('id')
        if not isinstance(tid, str) or not re.fullmatch(r'IH2-\d{3}', tid):
            errors.append(f'Task {i}: invalid ID.')
            continue
        if tid in ids:
            errors.append(f'{tid}: duplicate ID.')
        ids[tid] = task
        for key in ('title', 'goal'):
            if not isinstance(task.get(key), str) or not task[key].strip():
                errors.append(f'{tid}: {key} must be nonempty text.')
        for key in ('acceptance', 'exclusions'):
            value = task.get(key)
            if not isinstance(value, list) or not value or any(not isinstance(x, str) or not x.strip() for x in value):
                errors.append(f'{tid}: {key} must be a nonempty list of text.')
        deps = task.get('depends_on')
        if not isinstance(deps, list) or any(not isinstance(d, str) for d in deps):
            errors.append(f'{tid}: depends_on must be a list of IDs.')
        elif len(deps) != len(set(deps)):
            errors.append(f'{tid}: duplicate dependency.')
        if task.get('status') not in tuple(STATUSES):
            errors.append(f'{tid}: invalid status.')
        if task.get('status') == 'blocked' and not str(task.get('blocked_reason', '')).strip():
            errors.append(f'{tid}: blocked task needs blocked_reason.')
        if task.get('status') == 'in_progress' and not str(task.get('owner_branch', '')).strip():
            errors.append(f'{tid}: in_progress task needs owner_branch.')
        evidence = task.get('evidence')
        if not isinstance(evidence, list) or any(not isinstance(e, str) or not e.strip() for e in evidence):
            errors.append(f'{tid}: evidence must be a list of repository-relative file paths.')
        else:
            if task.get('status') == 'done' and not evidence:
                errors.append(f'{tid}: done task needs evidence.')
            for item in evidence:
                p = Path(item)
                candidate = (root / p).resolve()
                if p.is_absolute() or not candidate.is_relative_to(root.resolve()) or not candidate.is_file():
                    errors.append(f'{tid}: evidence file missing or outside repository: {item}')
    if sum(t.get('status') == 'in_progress' for t in ids.values()) > 1:
        errors.append('Only one task may be in_progress.')
    graph = {}
    for tid, task in ids.items():
        deps = task.get('depends_on', [])
        if not isinstance(deps, list) or any(not isinstance(d, str) for d in deps):
            continue
        graph[tid] = deps
        for dep in deps:
            if dep not in ids:
                errors.append(f'{tid}: unknown dependency {dep}.')
            elif task.get('status') in ('done', 'in_progress') and ids[dep].get('status') != 'done':
                errors.append(f'{tid}: {task["status"]} requires completed dependency {dep}.')
    active, seen = set(), set()
    def visit(tid):
        if tid in active:
            errors.append(f'Dependency cycle at {tid}.')
            return
        if tid in seen:
            return
        active.add(tid)
        for dep in graph.get(tid, []):
            if dep in ids:
                visit(dep)
        active.remove(tid)
        seen.add(tid)
    for tid in ids:
        visit(tid)
    return errors


def next_task(board):
    tasks = board['tasks']
    active = next((t for t in tasks if t['status'] == 'in_progress'), None)
    if active:
        return active
    done = {t['id'] for t in tasks if t['status'] == 'done'}
    return next((t for t in tasks if t['status'] == 'queued' and set(t['depends_on']) <= done), None)


def prompt(task):
    if task is None:
        return 'No dependency-ready task. Inspect blocked reasons and dependencies; do not invent work or treat silence as approval.'
    lines = [f'Continue Idle Hands 2.0: {task["id"]} — {task["title"]}.',
             'Read AGENTS.md and its required state/release docs, then docs/idle-hands-2/{README,BUILD_SYSTEM,DECISIONS,EXPERIENCE_BRIEF,CURRENT_SESSION}.md and the latest handoff.',
             'Fetch current source, inspect concurrent work, use an isolated branch, verify tracker state. Follow the separate sequel repository pointer when present.',
             'Make routine reversible decisions yourself within the recorded scope; free assets only. No paid services, real-player changes or public launch without the required authorization.',
             f'Goal: {task["goal"]}', 'Acceptance:']
    lines += [f'- {a}' for a in task['acceptance']]
    lines += ['Out of scope:'] + [f'- {x}' for x in task['exclusions']]
    lines += ['Complete this one task with reproducible checks and visual evidence where relevant. Update roadmap, decisions, handoff and history; run tracker check. Meet the owning repository release gates. Report exact artifacts, limitations and next task. Never mark unperformed tests as passed.']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'status', 'prompt'])
    args = parser.parse_args()
    try:
        board = json.loads((ROOT / ROADMAP).read_text())
        errors = validate(board, ROOT)
    except (OSError, ValueError) as exc:
        print(f'Roadmap could not be loaded: {exc}', file=sys.stderr)
        return 1
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    selected = next_task(board)
    if args.command == 'check':
        print(f'Valid roadmap: {len(board["tasks"])} tasks. Evidence links exist; acceptance truth requires review.')
    elif args.command == 'prompt':
        print(prompt(selected))
    else:
        for task in board['tasks']:
            print(f'{task["id"]} [{task["status"]}] {task["title"]}')
            if task['status'] == 'blocked':
                print(f'  Blocked: {task["blocked_reason"]}')
        print(f'Next: {selected["id"]} — {selected["title"]}' if selected else 'Next: none ready; inspect dependencies/blocked tasks.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
