#!/usr/bin/env vpython3
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run unit tests on a pinned version of chrome.
"""

import os
import shutil
import sys
import argparse
from pathlib import Path

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

import test_helpers
import devtools_paths

LOG_LEVELS = ['debug', 'info', 'warn', 'error']


def log_message(message, message_log_level, user_set_log_level):
    if LOG_LEVELS.index(message_log_level) >= LOG_LEVELS.index(
            user_set_log_level):
        print(message)


def run_tests(chrome_binary, target, no_text_coverage, no_html_coverage,
              coverage, expanded_reporting, cwd, log_level, mocha_fgrep,
              shuffle):
    karmaconfig_path = os.path.join(cwd, 'out', target, 'gen', 'test',
                                    'unittests', 'karma.conf.js')

    if not os.path.exists(karmaconfig_path):
        log_message('Unable to find Karma config at ' + karmaconfig_path,
                    'error', log_level)
        log_message(
            'Make sure to set the --ninja-build-name argument to the folder name of "out/target"',
            'error', log_level)
        sys.exit(1)

    log_message('Using karma config ' + karmaconfig_path, 'info', log_level)

    exec_command = [
        devtools_paths.node_path(),
        devtools_paths.karma_path(), 'start',
        test_helpers.to_platform_path_exact(karmaconfig_path), '--log-level',
        log_level
    ]

    env = os.environ.copy()
    env['NODE_PATH'] = devtools_paths.node_path()
    if (no_text_coverage is not False):
        env['NO_TEXT_COVERAGE'] = '1'
    if (no_html_coverage is not False):
        env['NO_HTML_COVERAGE'] = '1'
    if (coverage is True):
        env['COVERAGE'] = '1'
    if (expanded_reporting is True):
        env['EXPANDED_REPORTING'] = '1'
    if (chrome_binary is not None):
        env['CHROME_BIN'] = chrome_binary
    if (mocha_fgrep is not None):
        print('Using Mocha --fgrep flag ' + mocha_fgrep)
        env['MOCHA_FGREP'] = mocha_fgrep
    if (shuffle is not False):
        env['SHUFFLE'] = '1'
    exit_code = test_helpers.popen(exec_command, cwd=cwd, env=env)
    if exit_code == 1:
        return True

    return False

def run_unit_tests_on_ninja_build_target(target,
                                         no_text_coverage=True,
                                         no_html_coverage=True,
                                         coverage=False,
                                         expanded_reporting=False,
                                         chrome_binary=None,
                                         cwd=None,
                                         log_level=None,
                                         mocha_fgrep=None,
                                         shuffle=False,
                                         swarming_output_file=None):
    if chrome_binary and not test_helpers.check_chrome_binary(chrome_binary):
        log_message(
            'Chrome binary argument path does not exist or is not executable, reverting to downloaded binary',
            'warn', log_level)
        chrome_binary = None

    if not chrome_binary:
        # Default to the downloaded / pinned Chromium binary
        downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path(
        )
        if test_helpers.check_chrome_binary(downloaded_chrome_binary):
            chrome_binary = downloaded_chrome_binary

    if (chrome_binary is None):
        log_level('Unable to run, no Chrome binary provided', 'error',
                  log_level)
        sys.exit(1)

    log_message('Using Chromium binary (%s)' % chrome_binary, 'info',
                log_level)

    if not cwd:
        cwd = devtools_paths.devtools_root_path()

    log_message('Running tests from %s\n' % cwd, 'info', log_level)

    errors_found = run_tests(chrome_binary, target, no_text_coverage,
                             no_html_coverage, coverage, expanded_reporting,
                             cwd, log_level, mocha_fgrep, shuffle)

    if coverage and not no_html_coverage:
        log_message(
            '\nYou can see the coverage results by opening \033[1mkarma-coverage/index.html\033[0m in a browser\n',
            'info', log_level)
        if swarming_output_file:
            shutil.copytree('karma-coverage',
                            Path(f'{swarming_output_file}/karma-coverage'),
                            dirs_exist_ok=True)

    if errors_found:
        log_message('ERRORS DETECTED', 'error', log_level)

        if not expanded_reporting:
            log_message(
                '\nRun with \033[1m--expanded-reporting\033[0m to get better information about why the tests failed.\n',
                'error', log_level)
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
    parser.add_argument('--expanded-reporting',
                        action='store_true',
                        default=False,
                        dest='expanded_reporting',
                        help='Whether to output expanded report info')
    parser.add_argument('--chrome-binary',
                        dest='chrome_binary',
                        help='Path to Chromium binary')
    parser.add_argument('--cwd',
                        dest='cwd',
                        help='Path to the directory containing the out dir',
                        default=devtools_paths.devtools_root_path())
    parser.add_argument('--mocha-fgrep',
                        dest='mocha_fgrep',
                        help='Run only tests that match this string.')
    parser.add_argument('--invert',
                        dest='invert',
                        default=False,
                        help='Invert the match specified by mocha-fgrep.')
    parser.add_argument('--shuffle',
                        action='store_true',
                        default=False,
                        dest='shuffle',
                        help='Shuffle tests order.')
    parser.add_argument(
        '--log-level',
        dest='log_level',
        default='info',
        choices=LOG_LEVELS,
        help=
        'Set the desired level of logging. This configures logging for the run_auto_unittests and for Karma'
    )
    parser.add_argument('--swarming-output-file',
                        dest='swarming_output_file',
                        default=None,
                        help='Save coverage files to swarming output.')
    args = parser.parse_args(sys.argv[1:])

    run_unit_tests_on_ninja_build_target(
        args.target, args.no_text_coverage, args.no_html_coverage,
        args.coverage, args.expanded_reporting, args.chrome_binary, args.cwd,
        args.log_level, args.mocha_fgrep, args.shuffle,
        args.swarming_output_file)


if __name__ == '__main__':
    main()
