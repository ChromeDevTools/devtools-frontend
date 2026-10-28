#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for run_with_restat.py."""

import contextlib
import io
import os
import sys
import tempfile
import textwrap
import unittest
from unittest import mock

import run_with_restat

# Some arbitrary time in the past, in nanoseconds.
OLD_MTIME_NS = 1_000_000_000 * 10**9


class RunWithRestatTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.root = tmpdir.name
        self.output = os.path.join(self.root, 'output.ts')

    def run_wrapper(self, *argv):
        """Runs run_with_restat.main() and returns its exit code."""
        with mock.patch.object(sys, 'argv', ['run_with_restat.py', *argv]):
            with self.assertRaises(SystemExit) as cm:
                run_with_restat.main()
        return cm.exception.code

    def write_output(self, content):
        with open(self.output, 'w', encoding='utf-8') as f:
            f.write(content)
        os.utime(self.output, ns=(OLD_MTIME_NS, OLD_MTIME_NS))

    def write_script(self, name, body):
        path = os.path.join(self.root, name)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(textwrap.dedent(body))
        return path

    def test_restores_mtime_of_unchanged_output(self):
        self.write_output('same')
        script = self.write_script(
            'generate.py', """
            import sys
            with open(sys.argv[1], 'w') as f:
                f.write('same')
            """)

        code = self.run_wrapper(self.output, '--', script, self.output)

        self.assertEqual(code, 0)
        self.assertEqual(os.stat(self.output).st_mtime_ns, OLD_MTIME_NS)

    def test_keeps_new_mtime_of_changed_output(self):
        self.write_output('old')
        script = self.write_script(
            'generate.py', """
            import sys
            with open(sys.argv[1], 'w') as f:
                f.write('new')
            """)

        code = self.run_wrapper(self.output, '--', script, self.output)

        self.assertEqual(code, 0)
        self.assertGreater(os.stat(self.output).st_mtime_ns, OLD_MTIME_NS)
        with open(self.output, encoding='utf-8') as f:
            self.assertEqual(f.read(), 'new')

    def test_runs_python_scripts_with_the_running_interpreter(self):
        script = self.write_script(
            'generate.py', """
            import sys
            with open(sys.argv[1], 'w') as f:
                f.write(sys.executable)
            """)

        code = self.run_wrapper(self.output, '--', script, self.output)

        self.assertEqual(code, 0)
        with open(self.output, encoding='utf-8') as f:
            self.assertEqual(f.read(), sys.executable)

    def test_propagates_the_exit_code_and_leaves_outputs_alone(self):
        self.write_output('old')
        script = self.write_script(
            'generate.py', """
            import sys
            with open(sys.argv[1], 'w') as f:
                f.write('partial')
            sys.exit(3)
            """)

        code = self.run_wrapper(self.output, '--', script, self.output)

        self.assertEqual(code, 3)
        # A failed run neither restores nor touches timestamps.
        self.assertGreater(os.stat(self.output).st_mtime_ns, OLD_MTIME_NS)

    def test_rejects_a_missing_separator(self):
        with contextlib.redirect_stderr(io.StringIO()) as stderr:
            code = self.run_wrapper(self.output, sys.executable, '-c', 'pass')

        self.assertEqual(code, 1)
        self.assertIn('Usage:', stderr.getvalue())


if __name__ == '__main__':
    unittest.main()
