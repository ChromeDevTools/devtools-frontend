#!/usr/bin/env vpython3
# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import pathlib
import subprocess
import sys
import os

from node_path import GetBinaryPath


def RunNode(cmd_parts, output=subprocess.PIPE, node_dir=None):
    cmd = [GetBinaryPath(node_dir)] + cmd_parts
    env = os.environ.copy()
    devtools_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..'))
    if 'NODE_PATH' not in env:
        env['NODE_PATH'] = os.path.join(devtools_root, 'node_modules')
    hook_path = os.path.join(devtools_root, 'scripts', 'node_modules_hook.mjs')
    if os.path.exists(hook_path):
        hook_url = pathlib.Path(hook_path).as_uri()
        node_options = env.get('NODE_OPTIONS', '')
        if 'node_modules_hook.mjs' not in node_options:
            env['NODE_OPTIONS'] = f'{node_options} --import {hook_url}'.strip()
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
    # Accept --node-dir <dir> as the first arguments: the `third_party/node`
    # directory to take the node binary from if this checkout doesn't have
    # its own. The build passes `//third_party/node`, so we don't have to know
    # where DevTools is located inside of a Chromium checkout.
    node_dir = None
    if len(args) > 1 and args[0] == '--node-dir':
        node_dir = args[1]
        args = args[2:]
    # Accept --output as the first argument, and then remove
    # it from the args entirely if present.
    if len(args) > 0 and args[0] == '--output':
        output = None
        args = args[1:]
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
    RunNode(node_flags + rest_args, output, node_dir)
