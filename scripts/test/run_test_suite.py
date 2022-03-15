#!/usr/bin/env vpython3
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run tests on a pinned version of chrome.

DEPRECATED: please use run_test_suite.js instead.
"""

import argparse
import os
import sys

ROOT_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..',
                              '..')
scripts_path = os.path.join(ROOT_DIRECTORY, 'scripts')
sys.path.append(scripts_path)

import devtools_paths
import test_helpers


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Run tests')
    parser.add_argument('--chrome-binary',
                        dest='chrome_binary',
                        help='path to Chromium binary')
    parser.add_argument(
        '--test-suite',
        dest='test_suite',
        help=
        'test suite name. DEPRECATED: please use --test-suite-path instead.')
    parser.add_argument(
        '--test-suite-path',
        dest='test_suite_path',
        help=
        'path to test suite, starting from the out/TARGET directory. Should use Linux path separators.'
    )
    parser.add_argument('--test-file',
                        dest='test_file',
                        help='an absolute path for the file to test')
    parser.add_argument(
        '--target',
        '-t',
        default='Default',
        dest='target',
        help='The name of the Ninja output directory. Defaults to "Default"')
    parser.add_argument(
        '--chrome-features',
        dest='chrome_features',
        help=
        'comma separated list of strings passed to --enable-features on the chromium commandline'
    )
    parser.add_argument(
        '--jobs',
        default='1',
        dest='jobs',
        help=
        'The number of parallel runners to use (if supported). Defaults to 1')
    parser.add_argument('--cwd',
                        dest='cwd',
                        help='Path to the directory containing the out dir',
                        default=devtools_paths.devtools_root_path())
    parser.add_argument(
        '--node_modules-path',
        dest='node_modules_path',
        help=
        'Path to the node_modules directory for Node to use. Will use Node defaults if not set.',
        default=None)
    parser.add_argument('test_patterns', nargs='*')
    return parser.parse_args(cli_args)


def run_tests(chrome_binary,
              chrome_features,
              test_suite_path,
              test_suite,
              jobs,
              target,
              cwd=None,
              node_modules_path=None,
              test_patterns=None):
    env = os.environ.copy()
    env['CHROME_BIN'] = chrome_binary
    if chrome_features:
        env['CHROME_FEATURES'] = chrome_features

    if test_patterns:
        env['TEST_PATTERNS'] = ';'.join(test_patterns)

    if jobs:
        env['JOBS'] = jobs

    if target:
        env['TARGET'] = target

    if node_modules_path is not None:
        # Node requires the path to be absolute
        env['NODE_PATH'] = os.path.abspath(node_modules_path)

    if not cwd:
        cwd = devtools_paths.devtools_root_path()

    exec_command = [devtools_paths.node_path()]

    if 'DEBUG_TEST' in env:
        exec_command.append('--inspect')

    exec_command = exec_command + [
        devtools_paths.mocha_path(),
        '--config',
        os.path.join(test_suite_path, '.mocharc.js'),
    ]

    exit_code = test_helpers.popen(exec_command, cwd=cwd, env=env)
    if exit_code != 0:
        return True

    return False


def run_test():
    print(
        "DEPRECATED: run_test_suite.py is deprecated and will be removed in the future.\nPlease use run_test_suite.js which is newer and more robust with handling paths."
    )
    OPTIONS = parse_options(sys.argv[1:])
    is_cygwin = sys.platform == 'cygwin'
    chrome_binary = None
    test_suite = None
    chrome_features = None

    # Default to the downloaded / pinned Chromium binary
    downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path()
    if test_helpers.check_chrome_binary(downloaded_chrome_binary):
        chrome_binary = downloaded_chrome_binary

    # Override with the arg value if provided.
    if OPTIONS.chrome_binary:
        chrome_binary = OPTIONS.chrome_binary
        if not test_helpers.check_chrome_binary(chrome_binary):
            print('Unable to find a Chrome binary at \'%s\'' % chrome_binary)
            sys.exit(1)

    if OPTIONS.chrome_features:
        chrome_features = OPTIONS.chrome_features

    if (chrome_binary is None):
        print('Unable to run, no Chrome binary provided')
        sys.exit(1)

    if OPTIONS.jobs:
        jobs = OPTIONS.jobs

    test_file = OPTIONS.test_file
    test_patterns = OPTIONS.test_patterns
    if test_file:
        test_patterns.append(test_file)

    print('Using Chromium binary ({}{})\n'.format(
        chrome_binary, ' ' + chrome_features if chrome_features else ''))
    print('Using target (%s)\n' % OPTIONS.target)

    if test_file is not None:
        print(
            'The test_file argument is obsolete, just pass the filename as positional argument'
        )
    if test_patterns:
        print('Testing file(s) (%s)' % ', '.join(test_patterns))

    cwd = OPTIONS.cwd
    target = OPTIONS.target
    node_modules_path = OPTIONS.node_modules_path

    print('Running tests from %s\n' % cwd)

    test_suite_path_input = OPTIONS.test_suite_path
    test_suite = OPTIONS.test_suite
    test_suite_parts = None
    if test_suite:
        # test-suite is deprecated and will be removed, but we support it for now to not break the bots until their recipes are updated.
        test_suite_parts = ['gen', 'test', test_suite]
    elif test_suite_path_input:
        # We take the input with Linux path separators, but need to split and join to make sure this works on Windows.
        test_suite_parts = test_suite_path_input.split('/')
    else:
        print(
            'Unable to run, require one of --test-suite or --test-suite-path to be provided.'
        )
        sys.exit(1)

    print('Using Test Suite (%s)\n' % os.path.join(*test_suite_parts))

    test_suite_path = os.path.join(os.path.abspath(cwd), 'out', OPTIONS.target,
                                   *test_suite_parts)

    errors_found = False
    try:
        errors_found = run_tests(chrome_binary,
                                 chrome_features,
                                 test_suite_path,
                                 test_suite,
                                 jobs,
                                 target,
                                 cwd,
                                 node_modules_path,
                                 test_patterns=test_patterns)
    except Exception as err:
        print(err)

    if errors_found:
        print('ERRORS DETECTED')
        sys.exit(1)


if __name__ == '__main__':
    run_test()
