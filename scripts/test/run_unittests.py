#!/usr/bin/env vpython
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run unit tests on a pinned version of chrome.
"""

import os
import platform
import re
from subprocess import Popen
import sys
import signal
import argparse

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

import test_helpers
import devtools_paths


def run_tests(chrome_binary, target, no_text_coverage, no_html_coverage,
              coverage):
    cwd = devtools_paths.devtools_root_path()
    karmaconfig_path = os.path.join(cwd, 'out', target, 'gen', 'test',
                                    'unittests', 'karma.conf.js')

    if not os.path.exists(karmaconfig_path):
        print('Unable to find Karma config at ' + karmaconfig_path)
        print('Make sure to set the --ninja-build-name argument to the folder name of "out/target"')
        sys.exit(1)

    print('Using karma config ' + karmaconfig_path)

    exec_command = [devtools_paths.node_path(), devtools_paths.karma_path(), 'start', test_helpers.to_platform_path_exact(karmaconfig_path)]

    env = os.environ.copy()
    env['NODE_PATH'] = devtools_paths.node_path()
    if (no_text_coverage is not False):
        env['NO_TEXT_COVERAGE'] = '1'
    if (no_html_coverage is not False):
        env['NO_HTML_COVERAGE'] = '1'
    if (coverage is True):
        env['COVERAGE'] = '1'
    if (chrome_binary is not None):
        env['CHROME_BIN'] = chrome_binary
    exit_code = test_helpers.popen(exec_command, cwd=cwd, env=env)
    if exit_code == 1:
        return True

    return False


def run_unit_tests_on_ninja_build_target(target,
                                         no_text_coverage=True,
                                         no_html_coverage=True,
                                         coverage=False,
                                         chrome_binary=None):
    if chrome_binary and not test_helpers.check_chrome_binary(chrome_binary):
        print(
            'Chrome binary argument path does not exist or is not executable, reverting to downloaded binary'
        )
        chrome_binary = None

    if not chrome_binary:
        # Default to the downloaded / pinned Chromium binary
        downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path(
        )
        if test_helpers.check_chrome_binary(downloaded_chrome_binary):
            chrome_binary = downloaded_chrome_binary

    if (chrome_binary is None):
        print('Unable to run, no Chrome binary provided')
        sys.exit(1)

    print('Using Chromium binary (%s)\n' % chrome_binary)

    errors_found = run_tests(chrome_binary, target, no_text_coverage,
                             no_html_coverage, coverage)
    if errors_found:
        print('ERRORS DETECTED')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Run unittests on Ninja targets.')
    parser.add_argument(
        '--target', '-t', default='Default', dest='target', help='The name of the Ninja output directory. Defaults to "Default"')
    parser.add_argument(
        '--no-text-coverage', action='store_true', default=False, dest='no_text_coverage', help='Whether to output text coverage')
    parser.add_argument('--no-html-coverage',
                        action='store_true',
                        default=False,
                        dest='no_html_coverage',
                        help='Whether to output html coverage')
    parser.add_argument('--coverage',
                        action='store_true',
                        default=False,
                        dest='coverage',
                        help='Whether to output coverage')
    parser.add_argument('--chrome-binary',
                        dest='chrome_binary',
                        help='Path to Chromium binary')
    args = parser.parse_args(sys.argv[1:])

    run_unit_tests_on_ninja_build_target(args.target, args.no_text_coverage,
                                         args.no_html_coverage, args.coverage,
                                         args.chrome_binary)


if __name__ == '__main__':
    main()
