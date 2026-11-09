#!/usr/bin/env python3
"""Offline integrity check of the pinned upstream Game Studio bundle; never executes it."""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[1]
lock=json.loads((root/'.agents/game-studio.lock.json').read_text())
errors=[]
for entry in lock['files']:
 path=root/entry['path']
 if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=entry['sha256']:
  errors.append('Missing or modified upstream file: '+entry['path'])
for path in (root/'.agents/skills').glob('*/SKILL.md'):
 text=path.read_text()
 if not text.startswith('---\n') or '\nname:' not in text or '\ndescription:' not in text:errors.append('Invalid skill metadata: '+str(path))
 for link in re.findall(r'\]\(([^)]+)\)',text):
  if not '://' in link and not link.startswith('#') and not (path.parent/link.split('#')[0]).exists():errors.append('Broken skill reference: '+str(path)+' -> '+link)
if errors:print('\n'.join(errors),file=sys.stderr);sys.exit(1)
print(f"PASS: {len(lock['files'])} pinned Game Studio files and skill references; upstream {lock['ref']}")
