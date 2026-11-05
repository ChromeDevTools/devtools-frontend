#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for bake_strings.py."""

import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import bake_strings
import collect_strings

DEPRECATION_JSON5 = """\
{
  data: [
    {
      name: "SampleFeature",
      message: "Use `NewAPI` instead.",
      translation_note: "Warning shown when the sample feature is used.",
    },
  ],
}
"""


class BakeStringsTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.root = tmpdir.name
        json5_path = os.path.join(self.root, collect_strings.DEPRECATION_JSON5)
        os.makedirs(os.path.dirname(json5_path))
        with open(json5_path, 'w', encoding='utf-8') as f:
            f.write(DEPRECATION_JSON5)

        # No node script runs for real. The tests check what gets run.
        patcher = mock.patch.object(subprocess, 'check_call', return_value=0)
        self.check_call = patcher.start()
        self.addCleanup(patcher.stop)

    def commands(self):
        """Returns the commands passed to subprocess.check_call, in order."""
        return [call.args[0] for call in self.check_call.call_args_list]

    def test_collects_the_strings_before_baking_them(self):
        code = bake_strings.main([], root=self.root)

        self.assertEqual(code, 0)
        scripts = [command[3] for command in self.commands()]
        self.assertEqual(scripts, [
            os.path.join(self.root, 'third_party', 'i18n',
                         'collect-strings.js'),
            os.path.join(self.root, 'third_party', 'i18n', 'bake-strings.js'),
        ])

    def test_bakes_the_locales_directory_from_the_repository_root(self):
        bake_strings.main([], root=self.root)

        bake = self.check_call.call_args_list[-1]
        self.assertEqual(bake.args[0], [
            sys.executable,
            os.path.join(self.root, 'third_party', 'node', 'node.py'),
            '--output',
            os.path.join(self.root, 'third_party', 'i18n', 'bake-strings.js'),
            os.path.join('front_end', 'core', 'i18n', 'locales'),
        ])
        self.assertEqual(bake.kwargs, {'cwd': self.root})

    def test_does_not_bake_when_collecting_fails(self):
        self.check_call.side_effect = subprocess.CalledProcessError(3, 'node')

        code = bake_strings.main([], root=self.root)

        self.assertEqual(code, 3)
        self.assertEqual(len(self.commands()), 1)

    def test_reports_a_failure_to_bake(self):
        self.check_call.side_effect = [
            0, subprocess.CalledProcessError(4, 'node')
        ]

        code = bake_strings.main([], root=self.root)

        self.assertEqual(code, 4)


if __name__ == '__main__':
    unittest.main()
