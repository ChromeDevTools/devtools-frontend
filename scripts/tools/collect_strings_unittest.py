#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for collect_strings.py."""

import contextlib
import io
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import collect_strings

DEPRECATION_JSON5 = """\
{
  data: [
    {
      name: "SampleFeature",
      message: "Use `NewAPI` instead.",
      translation_note: "Warning shown when the sample feature is used.",
      milestone: 130,
    },
  ],
}
"""


class CollectStringsTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.root = tmpdir.name
        self.write_file(collect_strings.DEPRECATION_JSON5, DEPRECATION_JSON5)

        # No node script runs for real. The tests check what gets run, and
        # which generated sources exist at that moment.
        self.generated_sources = None
        self.collect_error = None
        patcher = mock.patch.object(subprocess,
                                    'check_call',
                                    side_effect=self.fake_check_call)
        self.check_call = patcher.start()
        self.addCleanup(patcher.stop)

    def write_file(self, relative_path, contents):
        path = os.path.join(self.root, relative_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(contents)

    def fake_check_call(self, command, cwd=None):
        """Records the generated sources; fails when `collect_error` is set."""
        del cwd  # Unused.
        generated_root = command[-1]
        self.generated_sources = {}
        for dirpath, _, filenames in os.walk(generated_root):
            for filename in filenames:
                path = os.path.join(dirpath, filename)
                with open(path, encoding='utf-8') as f:
                    self.generated_sources[os.path.relpath(
                        path, generated_root)] = f.read()
        if self.collect_error:
            raise self.collect_error
        return 0

    def generated_root(self):
        """Returns the directory of generated sources collect-strings.js got."""
        return self.check_call.call_args.args[0][-1]

    def test_runs_collect_strings_js_on_front_end_and_the_generated_sources(
            self):
        code = collect_strings.main([], root=self.root)

        self.assertEqual(code, 0)
        self.check_call.assert_called_once()
        command = self.check_call.call_args.args[0]
        self.assertEqual(command[:-1], [
            sys.executable,
            os.path.join(self.root, 'third_party', 'node', 'node.py'),
            '--output',
            os.path.join(self.root, 'third_party', 'i18n',
                         'collect-strings.js'),
            'front_end',
        ])
        self.assertTrue(os.path.isabs(command[-1]))
        self.assertEqual(self.check_call.call_args.kwargs, {'cwd': self.root})

    def test_generates_deprecation_ts_under_generated_like_the_build(self):
        collect_strings.main([], root=self.root)

        self.assertEqual(list(self.generated_sources),
                         [os.path.join('generated', 'Deprecation.ts')])
        deprecation_ts = self.generated_sources[os.path.join(
            'generated', 'Deprecation.ts')]
        self.assertIn('export const UIStrings = {', deprecation_ts)
        self.assertIn('SampleFeature: "Use `NewAPI` instead.",',
                      deprecation_ts)

    def test_removes_the_generated_sources_afterwards(self):
        collect_strings.main([], root=self.root)

        self.assertTrue(self.generated_sources)
        self.assertFalse(os.path.exists(self.generated_root()))

    def test_removes_the_generated_sources_when_collecting_fails(self):
        self.collect_error = subprocess.CalledProcessError(3, 'node')

        code = collect_strings.main([], root=self.root)

        self.assertEqual(code, 3)
        self.assertTrue(self.generated_sources)
        self.assertFalse(os.path.exists(self.generated_root()))

    def test_rejects_arguments(self):
        with self.assertRaises(SystemExit) as context:
            with contextlib.redirect_stderr(io.StringIO()):
                collect_strings.main(['front_end'], root=self.root)

        self.assertEqual(context.exception.code, 2)
        self.check_call.assert_not_called()


if __name__ == '__main__':
    unittest.main()
