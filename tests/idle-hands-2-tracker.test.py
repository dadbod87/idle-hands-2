"""Meaningful failure/selection cases for the continuation tracker; no runtime/prod access."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('tracker', ROOT / 'tools/idle-hands-2.py')
tracker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tracker)


class TrackerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'proof.md').write_text('Synthetic evidence')
        self.a = dict(id='IH2-000', title='first', goal='first result', status='done',
                      depends_on=[], acceptance=['test'], exclusions=['no prod'], evidence=['proof.md'])
        self.b = dict(id='IH2-010', title='second', goal='second result', status='queued',
                      depends_on=['IH2-000'], acceptance=['test'], exclusions=['no prod'], evidence=[])
        self.board = dict(schema_version=1, tasks=[self.a, self.b])

    def test_valid_dependency_selects_next(self):
        self.assertEqual(tracker.validate(self.board, self.root), [])
        self.assertEqual(tracker.next_task(self.board)['id'], 'IH2-010')

    def test_done_requires_existing_evidence(self):
        self.a['evidence'] = []
        self.assertTrue(tracker.validate(self.board, self.root))
        self.a['evidence'] = ['missing.md']
        self.assertTrue(tracker.validate(self.board, self.root))

    def test_evidence_cannot_escape_or_use_absolute_path(self):
        for path in ['../outside.md', str(self.root / 'proof.md')]:
            self.a['evidence'] = [path]
            self.assertTrue(tracker.validate(self.board, self.root))
        (self.root / 'escape').symlink_to(self.root.parent)
        self.a['evidence'] = ['escape/outside.md']
        self.assertTrue(tracker.validate(self.board, self.root))

    def test_dependency_cycle_and_unknown(self):
        self.a['depends_on'] = ['IH2-010']
        self.assertTrue(any('cycle' in e for e in tracker.validate(self.board, self.root)))
        self.a['depends_on'] = ['IH2-999']
        self.assertTrue(any('unknown' in e for e in tracker.validate(self.board, self.root)))

    def test_cannot_finish_or_start_before_dependency(self):
        self.a['status'] = 'queued'
        for status in ['done', 'in_progress']:
            self.b.update(status=status, evidence=['proof.md'], owner_branch='feature/test')
            self.assertTrue(any('requires completed' in e for e in tracker.validate(self.board, self.root)))

    def test_resume_active_and_disallow_two_active(self):
        self.b.update(status='in_progress', owner_branch='feature/test')
        self.assertEqual(tracker.next_task(self.board)['id'], 'IH2-010')
        self.a.update(status='in_progress', owner_branch='feature/other')
        self.assertTrue(any('Only one' in e for e in tracker.validate(self.board, self.root)))

    def test_blocked_needs_reason_and_independent_work_can_proceed(self):
        self.b['status'] = 'blocked'
        self.assertTrue(tracker.validate(self.board, self.root))
        self.b['blocked_reason'] = 'Needs provider approval'
        c = copy.deepcopy(self.b)
        c.update(id='IH2-020', status='queued')
        self.board['tasks'].append(c)
        self.assertEqual(tracker.validate(self.board, self.root), [])
        self.assertEqual(tracker.next_task(self.board)['id'], 'IH2-020')

    def test_duplicate_id_and_malformed_contract_fail(self):
        self.b['id'] = self.a['id']
        self.assertTrue(tracker.validate(self.board, self.root))
        self.b['id'] = 'IH2-010'
        for key, value in [('acceptance', []), ('depends_on', [1]), ('status', 'almost_done'), ('evidence', 'proof.md')]:
            old = self.b[key]
            self.b[key] = value
            self.assertTrue(tracker.validate(self.board, self.root))
            self.b[key] = old

    def test_finished_has_no_next_and_prompt_is_clear(self):
        self.b.update(status='done', evidence=['proof.md'])
        self.assertIsNone(tracker.next_task(self.board))
        self.assertIn('No dependency-ready task', tracker.prompt(None))
        self.assertIn('IH2-010', tracker.prompt(self.b))

    def test_repository_board_valid_and_next_is_actionable(self):
        board = json.loads((ROOT / tracker.ROADMAP).read_text())
        self.assertEqual(tracker.validate(board, ROOT), [])
        selected = tracker.next_task(board)
        if selected:
            self.assertIn(selected['status'], ['queued', 'in_progress'])
            self.assertIn(selected['id'], tracker.prompt(selected))


if __name__ == '__main__':
    unittest.main()
