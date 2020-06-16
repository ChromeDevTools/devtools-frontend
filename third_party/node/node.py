#!/usr/bin/env python
# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from os import path as os_path
import platform
import subprocess
import sys
import os


def GetBinaryPath():
    return os_path.join(
        os_path.dirname(__file__), *{
            'Darwin': ('mac', 'node-darwin-x64', 'bin', 'node'),
            'Linux': ('linux', 'node-linux-x64', 'bin', 'node'),
            'Windows': ('win', 'node.exe'),
        }[platform.system()])


def RunNode(cmd_parts):
    cmd = [GetBinaryPath()] + cmd_parts
    process = subprocess.Popen(cmd, cwd=os.getcwd())
    stdout, stderr = process.communicate()

    if process.returncode is not 0:
        print('%s failed: %s' % (cmd, stderr))
        exit(process.returncode)

    return stdout


if __name__ == '__main__':
    RunNode(sys.argv[1:])
