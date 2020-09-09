#!/usr/bin/env python
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
    parser.add_argument('--coverage',
                        action='store_true',
                        default=False,
                        dest='coverage',
                        help='Whether to output coverage')
    args = parser.parse_args(sys.argv[1:])

    efficiently_recompile.recompile(args.target, 'test/unittests')
    run_unittests.run_unit_tests_on_ninja_build_target(args.target,
                                                       args.no_text_coverage,
                                                       args.coverage)


if __name__ == '__main__':
    main()
