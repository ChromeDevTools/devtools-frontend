#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
from os import path as os_path
import platform
import subprocess
import sys
import os


def GetBinaryPath():
    if platform.machine() == 'arm64':
        darwin_path = 'mac-arm64'
    else:
        darwin_path = 'mac-amd64'

    relative = {
        'Darwin': (darwin_path, 'src', 'lib', 'tsc'),
        'Linux': ('linux-amd64', 'src', 'lib', 'tsc'),
        'Windows': ('windows-amd64', 'src', 'lib', 'tsc.exe'),
    }[platform.system()]

    devtools_checkout_path = os_path.join(os_path.dirname(__file__), *relative)
    if os_path.exists(devtools_checkout_path):
        return os_path.normpath(devtools_checkout_path)

    # Inside of a Chromium checkout, use the TypeScript binary of Chromium.
    chromium_root = _FindChromiumRoot()
    if chromium_root is not None:
        return os_path.normpath(
            os_path.join(chromium_root, 'third_party', 'typescript',
                         *relative))
    return os_path.normpath(devtools_checkout_path)


def _FindChromiumRoot():
    """Returns the root of the Chromium checkout DevTools is part of, or None
    for a standalone checkout. See scripts/find_chromium_root.py."""
    scripts_dir = os_path.join(os_path.dirname(os_path.abspath(__file__)),
                               '..', '..', 'scripts')
    old_sys_path = sys.path[:]
    try:
        sys.path.append(scripts_dir)
        from find_chromium_root import find_chromium_root
    finally:
        sys.path = old_sys_path
    return find_chromium_root()


def RunTypeScriptRaw(cmd_parts, stdout=None):
    cmd = [GetBinaryPath()] + cmd_parts
    process = subprocess.Popen(cmd,
                               cwd=os.getcwd(),
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE,
                               universal_newlines=True,
                               encoding='utf-8')
    stdout, stderr = process.communicate()
    return process.returncode, stdout, stderr


def RunTypeScript(cmd_parts, stdout=None):
    code, stdout, stderr = RunTypeScriptRaw(cmd_parts, stdout)
    if code != 0:
        errs = []
        if len(stderr) > 0:
            errs.append("stderr:\n" + stderr)
        if len(stdout) > 0:
            # Handle cases where stderr is empty, even though the command failed, for
            # example https://github.com/microsoft/TypeScript/issues/615
            errs.append("stdout:\n" + stdout)
        errs.append("exit=%d" % code)
        cmd = [GetBinaryPath()] + cmd_parts
        raise RuntimeError('Command \'%s\' failed\n%s' %
                           (' '.join(cmd), '\n'.join(errs)))
    return stdout


if __name__ == '__main__':
    sys.stdout.write(RunTypeScript(sys.argv[1:]))
