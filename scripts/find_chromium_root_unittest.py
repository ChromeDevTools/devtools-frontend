#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for find_chromium_root.py."""

import contextlib
import io
import os
import tempfile
import textwrap
import unittest

import find_chromium_root

CHROMIUM_GCLIENT = """
    solutions = [
      {
        "name": "src",
        "url": "https://chromium.googlesource.com/chromium/src.git",
        "managed": False,
        "custom_deps": {},
        "custom_vars": {
          "checkout_pgo_profiles": True,
        },
      },
    ]
    target_os = ["android"]
"""

STANDALONE_GCLIENT = """
    solutions = [
      {
        "name": "devtools-frontend",
        "url": "https://chromium.googlesource.com/devtools/devtools-frontend.git",
        "deps_file": "DEPS",
        "managed": False,
        "custom_deps": {},
      },
    ]
"""


class FindChromiumRootTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        # Resolve symlinks (e.g. /tmp on macOS), so we can compare paths.
        self.tmp = os.path.realpath(tmpdir.name)

    def mkdir(self, *parts):
        directory = os.path.join(self.tmp, *parts)
        os.makedirs(directory, exist_ok=True)
        return directory

    def write_gclient(self, directory, content):
        gclient_file = os.path.join(directory, '.gclient')
        with open(gclient_file, 'w', encoding='utf-8') as f:
            f.write(textwrap.dedent(content))
        return gclient_file

    def test_standalone_checkout(self):
        devtools = self.mkdir('devtools', 'devtools-frontend')
        self.write_gclient(self.mkdir('devtools'), STANDALONE_GCLIENT)

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_no_gclient_file_is_standalone(self):
        devtools = self.mkdir('devtools-frontend')

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_current_location_in_chromium(self):
        src = self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src', 'third_party',
                              'devtools-frontend', 'src')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)

        self.assertEqual(find_chromium_root.find_chromium_root(devtools), src)

    def test_new_location_in_chromium(self):
        src = self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src', 'third_party', 'devtools')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)

        self.assertEqual(find_chromium_root.find_chromium_root(devtools), src)

    def test_trailing_separator_and_relative_segments(self):
        src = self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src', 'third_party', 'devtools')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)

        self.assertEqual(
            find_chromium_root.find_chromium_root(
                os.path.join(devtools, 'scripts', '..') + os.sep), src)

    def test_closest_gclient_file_wins(self):
        # A standalone checkout that happens to be nested in a Chromium
        # checkout.
        self.mkdir('chromium', 'src')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)
        nested = self.mkdir('chromium', 'src', 'nested')
        devtools = self.mkdir('chromium', 'src', 'nested', 'devtools-frontend')
        self.write_gclient(nested, STANDALONE_GCLIENT)

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_not_covered_by_any_solution_is_standalone(self):
        self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'elsewhere', 'devtools-frontend')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_solution_with_common_name_prefix_does_not_match(self):
        self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src-internal', 'devtools')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_multiple_solutions(self):
        src = self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src', 'third_party', 'devtools')
        self.write_gclient(
            self.mkdir('chromium'), """
            solutions = [
              {"name": "src-internal", "url": None},
              {"name": "src", "url": None},
            ]
            """)

        self.assertEqual(find_chromium_root.find_chromium_root(devtools), src)

    @unittest.skipUnless(hasattr(os, 'symlink'), 'requires symlinks')
    def test_symlinked_standalone_checkout(self):
        standalone = self.mkdir('devtools', 'devtools-frontend')
        self.write_gclient(self.mkdir('devtools'), STANDALONE_GCLIENT)
        src = self.mkdir('chromium', 'src')
        self.write_gclient(self.mkdir('chromium'), CHROMIUM_GCLIENT)
        link = os.path.join(self.mkdir('chromium', 'src', 'third_party'),
                            'devtools')
        try:
            os.symlink(standalone, link, True)
        except OSError:
            self.skipTest('unable to create symlinks')

        # Via the symlink we are part of Chromium, via the real path we are
        # a standalone checkout.
        self.assertEqual(find_chromium_root.find_chromium_root(link), src)
        self.assertIsNone(find_chromium_root.find_chromium_root(standalone))

    def test_default_devtools_root_is_the_checkout_of_this_file(self):
        expected = os.path.dirname(
            os.path.dirname(os.path.abspath(find_chromium_root.__file__)))
        self.assertEqual(find_chromium_root._default_devtools_root(), expected)

    def test_gclient_file_is_executed_like_gclient_does(self):
        src = self.mkdir('chromium', 'src')
        devtools = self.mkdir('chromium', 'src', 'third_party', 'devtools')
        self.write_gclient(
            self.mkdir('chromium'), """
            name = "s" + "rc"
            solutions = [{"name": name}]
            """)

        self.assertEqual(find_chromium_root.find_chromium_root(devtools), src)

    def test_version_file_fallback_without_gclient_file(self):
        src = self.mkdir('chromium-1.2.3.4')
        self.mkdir('chromium-1.2.3.4', 'chrome')
        with open(os.path.join(src, 'chrome', 'VERSION'), 'w') as f:
            f.write('MAJOR=1\n')
        devtools = self.mkdir('chromium-1.2.3.4', 'third_party', 'devtools')

        self.assertEqual(find_chromium_root.find_chromium_root(devtools), src)

    def test_version_file_is_ignored_with_gclient_file(self):
        # The `.gclient` file is the source of truth if it exists.
        self.mkdir('chromium', 'src', 'chrome')
        with open(
                os.path.join(self.tmp, 'chromium', 'src', 'chrome', 'VERSION'),
                'w') as f:
            f.write('MAJOR=1\n')
        nested = self.mkdir('chromium', 'src', 'nested')
        devtools = self.mkdir('chromium', 'src', 'nested', 'devtools-frontend')
        self.write_gclient(nested, STANDALONE_GCLIENT)

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))

    def test_invalid_gclient_file_raises(self):
        devtools = self.mkdir('devtools', 'devtools-frontend')
        for content in [
                'solutions = [',
                'solutions = get_solutions()',
                'solutions = "src"',
                'solutions = [{"url": None}]',
        ]:
            with self.subTest(content=content):
                self.write_gclient(self.mkdir('devtools'), content)
                with self.assertRaises(find_chromium_root.GclientParseError):
                    find_chromium_root.find_chromium_root(devtools)

    def test_gclient_file_without_solutions_is_standalone(self):
        devtools = self.mkdir('devtools', 'devtools-frontend')
        self.write_gclient(self.mkdir('devtools'), 'target_os = ["android"]')

        self.assertIsNone(find_chromium_root.find_chromium_root(devtools))


class MainTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.tmp = os.path.realpath(tmpdir.name)

    def run_main(self, devtools_root):
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(
                stderr):
            status = find_chromium_root.main(
                ['--devtools-root', devtools_root])
        return status, stdout.getvalue(), stderr.getvalue()

    def write_gclient(self, content):
        with open(os.path.join(self.tmp, '.gclient'), 'w',
                  encoding='utf-8') as f:
            f.write(textwrap.dedent(content))

    def test_prints_chromium_root(self):
        src = os.path.join(self.tmp, 'src')
        devtools = os.path.join(src, 'third_party', 'devtools')
        os.makedirs(devtools)
        self.write_gclient(CHROMIUM_GCLIENT)

        self.assertEqual(self.run_main(devtools), (0, src + '\n', ''))

    def test_prints_nothing_for_standalone(self):
        devtools = os.path.join(self.tmp, 'devtools-frontend')
        os.makedirs(devtools)
        self.write_gclient(STANDALONE_GCLIENT)

        self.assertEqual(self.run_main(devtools), (0, '', ''))

    def test_fails_for_invalid_gclient_file(self):
        devtools = os.path.join(self.tmp, 'devtools-frontend')
        os.makedirs(devtools)
        self.write_gclient('solutions = [')

        status, stdout, stderr = self.run_main(devtools)
        self.assertEqual(status, 1)
        self.assertEqual(stdout, '')
        self.assertIn('.gclient', stderr)


if __name__ == '__main__':
    unittest.main()
