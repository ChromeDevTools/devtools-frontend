#!/usr/bin/env vpython3
# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from os import path as os_path
import platform
import subprocess
import sys
import os


def get_mac_architecture():
    if platform.machine() == "x86_64":
        is_translated = subprocess.run(
            ["sysctl", "-n", "sysctl.proc_translated"],
            capture_output=True,
            text=True).stdout.strip() == "1"
        return "arm64" if is_translated else "x86_64"
    return platform.machine()


def GetBinaryPath():
    if platform.machine() == 'arm64':
        darwin_path = 'mac_arm64'
        darwin_name = 'node-darwin-arm64'
    else:
        darwin_path = 'mac'
        darwin_name = 'node-darwin-x64'
    relative = {
        'Darwin': (darwin_path, darwin_name, 'bin', 'node'),
        'Linux': ('linux', 'node-linux-x64', 'bin', 'node'),
        'Windows': ('win', 'node.exe'),
    }[platform.system()]
    devtools_checkout_path = os.path.join(os.path.dirname(__file__), *relative)
    if os_path.exists(devtools_checkout_path):
        return devtools_checkout_path
    # Assume we are in a chromium checkout.
    return os_path.join(os.path.dirname(__file__), '..', '..', '..', '..',
                        'node', *relative)

def RunNode(cmd_parts, output=subprocess.PIPE):
    cmd = [GetBinaryPath()] + cmd_parts
    process = subprocess.Popen(cmd,
                               cwd=os.getcwd(),
                               stdout=output,
                               stderr=output,
                               universal_newlines=True)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
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
    RunNode(args, output)
