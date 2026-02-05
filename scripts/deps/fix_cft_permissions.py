#!/usr/bin/env python3
#
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Used to fix execution permissions on the pre-built Chrome for Testing.
"""

import os
import stat
import sys
import platform

from set_lpac_acls import set_lpac_acls


def cft_binary_location():
    if sys.platform == 'linux':
        return 'third_party/chrome/chrome-linux/chrome-linux64/chrome'
    elif sys.platform == 'darwin':
        arch = 'arm64' if platform.processor().startswith('arm') else 'x64'
        return f'third_party/chrome/chrome-mac-{arch}/chrome-mac-{arch}/Google Chrome for Testing.app/Contents'
    elif sys.platform == 'win32':
        return 'third_party/chrome/chrome-win/chrome-win64/chrome.exe'


def handleAccessDeniedOnWindows(func, path, exc):
    if not os.name == 'nt':
        raise exc
    if not os.access(path, os.W_OK):
        # Is the error an access error?
        print("Retrying due to access error...")
        os.chmod(path, stat.S_IWUSR)
        func(path)
    else:
        raise exc


def fix_permissions():
    # Fix permissions.
    cft_path = os.path.abspath(cft_binary_location())
    if os.path.isfile(cft_path):
        os.chmod(cft_path, 0o555)
        # On Linux, the crashpad_handler binary needs the +x bit, too.
        crashpad = os.path.join(os.path.dirname(cft_path),
                                'chrome_crashpad_handler')
        if os.path.isfile(crashpad):
            os.chmod(crashpad, 0o555)
    else:
        # Doing this recursively is necessary for MacOS bundles.
        for root, dirs, files in os.walk(cft_path):
            for f in files:
                os.chmod(os.path.join(root, f), 0o555)

    # On Windows we have to setup LPAC ACLs for the binary.
    # See https://bit.ly/31yqMJR.
    if os.name == 'nt':
        set_lpac_acls(os.path.dirname(cft_path))


if __name__ == '__main__':
    fix_permissions()
