#!/usr/bin/env vpython3
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run unit tests on a pinned version of chrome after automatically compiling the required files
"""

import argparse
import subprocess
import sys
from os import path

import run_unittests
import devtools_paths

build_scripts_path = path.join(path.dirname(path.abspath(__file__)), '..', 'build')
sys.path.append(build_scripts_path)
import efficiently_recompile


def popen(arguments, cwd=None):
    return subprocess.Popen(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def main():
    parser = argparse.ArgumentParser(description='Recompile Ninja targets.')
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
        choices=run_unittests.LOG_LEVELS,
        help=
        'Set the desired level of logging. This configures logging for the run_auto_unittests and for Karma'
    )
    parser.add_argument('--swarming-output-file',
                        dest='swarming_output_file',
                        default=None,
                        help='Save coverage files to swarming output.')
    args = parser.parse_args(sys.argv[1:])

    efficiently_recompile.recompile(args.target, 'test/unittests')
    run_unittests.run_unit_tests_on_ninja_build_target(
        args.target, args.no_text_coverage, args.no_html_coverage,
        args.coverage, args.expanded_reporting, args.chrome_binary, args.cwd,
        args.log_level, args.mocha_fgrep, args.shuffle,
        args.swarming_output_file)


if __name__ == '__main__':
    main()
