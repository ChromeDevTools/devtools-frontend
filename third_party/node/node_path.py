#!/usr/bin/env vpython3
# Copyright 2025 The Chromium Authors. All rights reserved.
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


def GetBinaryPath(node_dir=None):
    """Returns the path to the node binary.

    Args:
      node_dir: The `third_party/node` directory to take the binary from, if
          this checkout doesn't have its own. Inside of a Chromium checkout
          the node binary is only part of Chromium's `//third_party/node`.
    """
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
    if node_dir is not None:
        return os_path.join(node_dir, *relative)
    # Inside of a Chromium checkout, use the node binary of Chromium.
    chromium_root = _FindChromiumRoot()
    if chromium_root is not None:
        return os_path.join(chromium_root, 'third_party', 'node', *relative)
    return devtools_checkout_path


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


if __name__ == '__main__':
    node_path = GetBinaryPath()
    print(node_path)
