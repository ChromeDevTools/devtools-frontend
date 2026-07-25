#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Helper wrapper script to run gerrit_client.py from PATH."""

import shutil
import subprocess
import sys


def main():
    client = shutil.which('gerrit_client.py')
    if not client:
        print('gerrit_client.py not found. '
              'Is depot_tools available and added to PATH?')
        sys.exit(1)

    # DevTools specific defaults
    default_args = [
        '--host',
        'https://chromium-review.googlesource.com',
        '--project',
        'devtools/devtools-frontend',
    ]

    # gerrit_client.py expects: <command> [options] [args]
    # We need to extract the command from sys.argv and put it first.
    user_args = sys.argv[1:]
    command = []
    other_args = []
    for i, arg in enumerate(user_args):
        if not arg.startswith('-'):
            command = [arg]
            other_args = user_args[:i] + user_args[i + 1:]
            break
    else:
        other_args = user_args

    full_args = command + default_args + other_args

    rc = subprocess.call(['vpython3', client] + full_args)
    sys.exit(rc)


if __name__ == '__main__':
    main()
