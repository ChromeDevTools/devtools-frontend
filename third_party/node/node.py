#!/usr/bin/env vpython3
# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import subprocess
import sys
import os

from node_path import GetBinaryPath


def RunNode(cmd_parts, output=subprocess.PIPE):
    cmd = [GetBinaryPath()] + cmd_parts
    env = os.environ.copy()
    if 'NODE_PATH' not in env:
        env['NODE_PATH'] = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '..', '..',
                         'node_modules'))
    process = subprocess.Popen(cmd,
                               cwd=os.getcwd(),
                               env=env,
                               stdout=output,
                               stderr=output,
                               universal_newlines=True)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        if output is not None:
            print('%s failed:\n%s\n%s' % (cmd, stdout, stderr))
        exit(process.returncode)

    return stdout


if __name__ == '__main__':
    args = sys.argv[1:]
    # Accept --output as the first argument, and then remove
    # it from the args entirely if present.
    if len(args) > 0 and args[0] == '--output':
        output = None
        args = sys.argv[2:]
    else:
        output = subprocess.PIPE

    node_flags = []
    rest_args = []
    found_dash_dash = False
    for arg in args:
        if arg == '--':
            found_dash_dash = True
            rest_args.append(arg)
        elif not found_dash_dash and arg.startswith('--inspect'):
            node_flags.append(arg)
        else:
            rest_args.append(arg)
    RunNode(node_flags + rest_args, output)
