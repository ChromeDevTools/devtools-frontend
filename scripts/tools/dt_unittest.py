#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for dt.py."""

import contextlib
import io
import json
import os
import shlex
import signal
import tempfile
import unittest
from unittest import mock

import dt


class DtTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.root = tmpdir.name

        # No script runs for real. The tests check what dt asks to run.
        patcher = mock.patch.object(dt.subprocess, 'call', return_value=0)
        self.call = patcher.start()
        self.addCleanup(patcher.stop)

    def write_scripts(self, scripts):
        path = os.path.join(self.root, 'package.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump({'scripts': scripts}, f)

    def run_dt(self, *argv):
        """Runs dt.main() and returns its exit code, stdout and stderr."""
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout):
            with contextlib.redirect_stderr(stderr):
                try:
                    code = dt.main(list(argv), root=self.root)
                except SystemExit as exc:
                    # argparse exits for -h and for invalid arguments.
                    code = exc.code
        return code, stdout.getvalue(), stderr.getvalue()

    def commands(self):
        """Returns the commands passed to subprocess.call, in order."""
        return [invocation.args[0] for invocation in self.call.call_args_list]

    def test_runs_script_in_a_shell_from_the_package_root(self):
        self.write_scripts({'build': 'build-it'})

        code, _, _ = self.run_dt('build')

        self.assertEqual(code, 0)
        self.call.assert_called_once_with('build-it',
                                          shell=True,
                                          cwd=self.root,
                                          env=mock.ANY)

    def test_forwards_arguments(self):
        self.write_scripts({'build': 'build-it'})

        self.run_dt('build', 'a', 'b')

        self.assertEqual(self.commands(), ['build-it a b'])

    def test_forwards_options_to_the_script(self):
        self.write_scripts({'build': 'build-it'})

        self.run_dt('build', '--watch', '-d', '--target=Release')

        self.assertEqual(self.commands(),
                         ['build-it --watch -d --target=Release'])

    @unittest.skipIf(os.name == 'nt', 'Quoting is best effort on Windows.')
    def test_quotes_arguments_for_the_shell(self):
        self.write_scripts({'build': 'build-it'})
        args = ['a b', "it's", '"quoted"', '$HOME', '*', '&', '']

        self.run_dt('build', *args)

        # shlex.split approximates how a POSIX shell splits words.
        (command, ) = self.commands()
        self.assertEqual(shlex.split(command), ['build-it'] + args)

    def test_forwards_double_dash_verbatim(self):
        self.write_scripts({'build': 'build-it'})

        self.run_dt('build', '--', 'x', '--', '--')

        self.assertEqual(self.commands(), ['build-it -- x -- --'])

    def test_forwards_help_flag_after_the_script_name(self):
        self.write_scripts({'build': 'build-it'})

        self.run_dt('build', '--help')

        self.assertEqual(self.commands(), ['build-it --help'])

    def test_runs_pre_and_post_scripts_around_the_script(self):
        self.write_scripts({
            'prebuild': 'prebuild-it',
            'build': 'build-it',
            'postbuild': 'postbuild-it',
        })

        code, _, _ = self.run_dt('build', 'x')

        self.assertEqual(code, 0)
        self.assertEqual(self.commands(),
                         ['prebuild-it', 'build-it x', 'postbuild-it'])

    def test_failing_pre_script_skips_the_rest(self):
        self.write_scripts({
            'prebuild': 'prebuild-it',
            'build': 'build-it',
            'postbuild': 'postbuild-it',
        })
        self.call.return_value = 3

        code, _, _ = self.run_dt('build')

        self.assertEqual(code, 3)
        self.assertEqual(self.commands(), ['prebuild-it'])

    def test_failing_script_skips_the_post_script(self):
        self.write_scripts({
            'build': 'build-it',
            'postbuild': 'postbuild-it',
        })
        self.call.return_value = 4

        code, _, _ = self.run_dt('build')

        self.assertEqual(code, 4)
        self.assertEqual(self.commands(), ['build-it'])

    def test_puts_node_modules_bin_first_on_the_path(self):
        self.write_scripts({'build': 'build-it'})

        self.run_dt('build')

        env = self.call.call_args.kwargs['env']
        self.assertEqual(env['PATH'].split(os.pathsep)[0],
                         os.path.join(self.root, 'node_modules', '.bin'))

    def test_lists_scripts_without_arguments(self):
        self.write_scripts({'build': 'make it', 'test': 'run tests'})

        code, stdout, _ = self.run_dt()

        self.assertEqual(code, 0)
        self.assertRegex(stdout, r'build\s+make it')
        self.assertRegex(stdout, r'test\s+run tests')
        self.call.assert_not_called()

    def test_lists_scripts_for_the_help_flag(self):
        self.write_scripts({'build': 'make it'})

        code, stdout, _ = self.run_dt('--help')

        self.assertEqual(code, 0)
        self.assertRegex(stdout, r'build\s+make it')
        self.call.assert_not_called()

    def test_unknown_script_fails(self):
        self.write_scripts({'build': 'build-it'})

        code, _, stderr = self.run_dt('buidl')

        self.assertEqual(code, 2)
        self.assertIn('invalid choice', stderr)
        self.assertIn('buidl', stderr)
        self.assertIn('build', stderr)
        self.call.assert_not_called()

    def test_rejects_unknown_options_before_the_script(self):
        self.write_scripts({'build': 'build-it'})

        code, _, stderr = self.run_dt('--bogus', 'build')

        self.assertEqual(code, 2)
        self.assertIn('--bogus', stderr)
        self.call.assert_not_called()

    def test_reports_ctrl_c_like_a_shell(self):
        self.write_scripts({
            'build': 'build-it',
            'postbuild': 'postbuild-it',
        })
        self.call.side_effect = KeyboardInterrupt

        code, _, _ = self.run_dt('build')

        self.assertEqual(code, 128 + signal.SIGINT)
        self.call.assert_called_once()


if __name__ == '__main__':
    unittest.main()
