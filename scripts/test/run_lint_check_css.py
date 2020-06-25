#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import sys
from os import path
from subprocess import Popen

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

ROOT_DIRECTORY = path.dirname(scripts_path)

# Note: stylelint requires POSIX-formatted paths/globs, even on Windows.
# The forward slash is not a bug.
DEFAULT_GLOB = '**/*.css'


def get_css_files_or_glob():
    files = sys.argv[1:]
    if len(files):
        # TODO(crbug.com/1095940): Use `pathlib.PurePath(...).as_posix`
        # instead of `replace` once we drop support for Python 2.
        files = [f.replace('\\', '/') for f in files]
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
    # If all affected files are excluded due to .stylelintignore, exit gracefully
    exec_command.append('--allow-empty-input')

    stylelint_proc = Popen(exec_command, cwd=ROOT_DIRECTORY)
    stylelint_proc.communicate()

    sys.exit(stylelint_proc.returncode)


if __name__ == '__main__':
    main()
