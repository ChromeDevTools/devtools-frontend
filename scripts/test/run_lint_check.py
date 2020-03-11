#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os.path as path
import re
import subprocess
import sys
import test_helpers
from subprocess import Popen

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

ROOT_DIRECTORY = path.join(path.dirname(path.abspath(__file__)), '..', '..')
FRONT_END_DIRECTORY = path.join(ROOT_DIRECTORY, 'front_end')
TEST_DIRECTORY = path.join(ROOT_DIRECTORY, 'test')
SCRIPTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'scripts')

FILES_TO_LINT = [FRONT_END_DIRECTORY, TEST_DIRECTORY, SCRIPTS_DIRECTORY]


def main():
    eslintconfig_path = path.join(ROOT_DIRECTORY, '.eslintrc.js')
    scripts_eslintconfig_path = path.join(ROOT_DIRECTORY, 'scripts', '.eslintrc.js')
    eslintignore_path = path.join(ROOT_DIRECTORY, '.eslintignore')
    exec_command = [
        devtools_paths.node_path(),
        devtools_paths.eslint_path(),
        '--config',
        test_helpers.to_platform_path_exact(eslintconfig_path),
        '--config',
        test_helpers.to_platform_path_exact(scripts_eslintconfig_path),
        '--ignore-path',
        test_helpers.to_platform_path_exact(eslintignore_path),
        '--ext',
        '.js,.ts',
        '--fix',
    ] + FILES_TO_LINT

    eslint_proc = Popen(exec_command, cwd=ROOT_DIRECTORY)
    eslint_proc.communicate()

    sys.exit(eslint_proc.returncode)


if __name__ == '__main__':
    main()
