#!/usr/bin/env python3
# Copyright 2023 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from io import StringIO

import contextlib
import logging
import sys
import unittest

update_goldens = __import__('update_goldens')


class UpdateGoldensTestCase(unittest.TestCase):
    def __init__(self, methodName):
        super().__init__(methodName=methodName)
        self.log = logging.getLogger("TestLog")

    def setUp(self):
        self.orig_stdout = sys.stdout
        self.orig_stderr = sys.stderr
        self.stdout = StringIO()
        self.stderr = StringIO()
        sys.stdout = self.stdout
        sys.stderr = self.stderr
        return super().setUp()

    def tearDown(self):
        sys.stdout = self.orig_stdout
        sys.stderr = self.orig_stderr
        return super().tearDown()

    @contextlib.contextmanager
    def mocking(self, *args):
        old_impls = {}
        for mock_function in args:
            function_name = mock_function.__name__[5:]  # drop 'mock_' prefix
            old_impls[function_name] = update_goldens.__dict__[function_name]
            update_goldens.__dict__[function_name] = mock_function
        yield
        for name, function in old_impls.items():
            update_goldens.__dict__[name] = function

    def try_main(self, *args):
        try:
            update_goldens.main(update_goldens.ProjectConfig(), args)
        except RuntimeError as e:
            self.log.debug(e)
        finally:
            return (self.stdout.getvalue(), self.stderr.getvalue())  # pylint: disable=lost-exception

    def test_no_args(self):
        out, _ = self.try_main()
        self.assertTrue(out.startswith('usage'))

    def test_trigger_triggered(self):
        # pylint: disable=unused-argument
        def mock_screenshot_results(patchset=None):
            return ["dummy result"]

        with self.mocking(mock_screenshot_results):
            out, _ = self.try_main('trigger')
            self.assertEqual(out, update_goldens.WARNING_RESULTS_EXIST + '\n')

    def test_trigger_triggered_ignore(self):
        # pylint: disable=unused-argument
        def mock_screenshot_results(patchset=None):
            return ["dummy result"]

        # pylint: disable=unused-argument
        def mock_run_command(command, verbose, message=None):
            # pylint: disable=attribute-defined-outside-init
            self.captured_command = command

        with self.mocking(mock_screenshot_results, mock_run_command):
            out, _ = self.try_main('trigger', '--ignore-triggered')
            self.assertIn(update_goldens.WARNING_RESULTS_EXIST, out)
            self.assertIn("Ignoring", out)
            self.assertIn(update_goldens.INFO_BUILDERS_TRIGGERED, out)
            self.assertEqual(len(self.captured_command), 11)
            self.assertEqual(self.captured_command[:3], ['git', 'cl', 'try'])


if __name__ == '__main__':
    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
    unittest.main()
