# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Runs an arbitrary command and creates a stamp file upon successful completion.

Usage:
  run_with_stamp.py --stamp <stamp_file> [--] <command> [<command_args>...]

Any argument starting with '@' (e.g. '@path/to/response_file.rsp') is expanded
in-place:
  run_with_stamp.py @{{response_file_name}}
"""

import os
import pathlib
import subprocess
import sys

_SCRIPTS_BUILD_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_BUILD_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_BUILD_DIR)

from response_file import expand_response_files


def main():
    args = expand_response_files(sys.argv[1:])

    stamp_file = None
    command_args = []
    args_iter = iter(args)

    for arg in args_iter:
        if arg == '--stamp':
            try:
                stamp_file = next(args_iter)
            except StopIteration:
                print("Error: --stamp requires a path argument",
                      file=sys.stderr)
                sys.exit(1)
        elif arg.startswith('--stamp='):
            stamp_file = arg[len('--stamp='):]
        elif arg == '--':
            command_args.extend(list(args_iter))
            break
        else:
            command_args.append(arg)
            command_args.extend(list(args_iter))
            break

    if not stamp_file:
        print(
            "Usage: run_with_stamp.py --stamp <stamp_file> [--] <command> [args...]",
            file=sys.stderr)
        sys.exit(1)

    if not command_args:
        print("Error: No command specified to run", file=sys.stderr)
        sys.exit(1)

    ret = subprocess.call(command_args)
    if ret != 0:
        if ret < 0:
            sys.exit(128 - ret)
        sys.exit(ret)

    # Touch / create the stamp file only on exit code 0
    pathlib.Path(stamp_file).touch()
    sys.exit(0)


if __name__ == '__main__':
    main()
