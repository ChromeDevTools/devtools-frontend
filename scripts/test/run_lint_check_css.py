#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import posixpath
import sys
from os import path
from subprocess import Popen

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

# Note: stylelint requires POSIX-formatted paths, even on Windows.
CURRENT_DIRECTORY = posixpath.abspath(posixpath.dirname(sys.argv[0]))
ROOT_DIRECTORY = posixpath.normpath(
    posixpath.join(CURRENT_DIRECTORY, '..', '..'))
FRONT_END_DIRECTORY = posixpath.join(ROOT_DIRECTORY, 'front_end')
DEFAULT_GLOB = posixpath.join(FRONT_END_DIRECTORY, '**', '*.css')


def get_css_files_or_glob():
    files = sys.argv[1:]
    if len(files):
        return files
    return [DEFAULT_GLOB]


def main():
    exec_command = [
        devtools_paths.node_path(),
        path.join(ROOT_DIRECTORY, 'node_modules', 'stylelint', 'bin',
                  'stylelint.js'),
    ]
    exec_command.extend(get_css_files_or_glob())
    exec_command.append('--fix')

    stylelint_proc = Popen(exec_command, cwd=ROOT_DIRECTORY)
    stylelint_proc.communicate()

    sys.exit(stylelint_proc.returncode)


if __name__ == '__main__':
    main()
