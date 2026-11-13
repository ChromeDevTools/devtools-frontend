# Copyright 2019 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Helper to find the path to the correct third_party directory
"""

from os import path
import sys
import platform

try:
    old_sys_path = sys.path[:]
    sys.path.append(path.dirname(path.abspath(__file__)))
    from find_chromium_root import find_chromium_root
finally:
    sys.path = old_sys_path


# Find the root path of the checkout.
# If DevTools is part of a Chromium checkout, this is the chromium/src directory.
# In a standalone checkout, this is the devtools-frontend directory.
# See find_chromium_root.py for how we tell the two apart.
def root_path():
    return find_chromium_root(devtools_root_path()) or devtools_root_path()


# This is the third_party path relative to the root of the checkout.
def third_party_path():
    return path.join(root_path(), 'third_party')


# This points to the node binary downloaded as part of the checkout.
def node_path():
    try:
        old_sys_path = sys.path[:]
        sys.path.append(path.join(third_party_path(), 'node'))
        import node
    finally:
        sys.path = old_sys_path
    return node.GetBinaryPath()


def devtools_root_path():
    return path.dirname((path.dirname(path.abspath(__file__))))


def node_modules_path():
    return path.join(devtools_root_path(), 'node_modules')


def esbuild_path():
    return path.join(devtools_root_path(), 'third_party', 'esbuild', 'esbuild')


def license_checker_path():
    return path.join(node_modules_path(), 'license-checker', 'bin',
                     'license-checker')


def package_json_path():
    return path.join(devtools_root_path(), 'package.json')


def downloaded_chrome_binary_path():
    machine = platform.machine().lower()
    arch = 'arm64' if machine in ('arm64', 'aarch64') else 'x64'

    paths = {
        'linux':
        path.join('chrome-linux', 'chrome-linux64', 'chrome'),
        'darwin':
        path.join(
            f'chrome-mac-{arch}',
            f'chrome-mac-{arch}',
            'Google Chrome for Testing.app',
            'Contents',
            'MacOS',
            'Google Chrome for Testing',
        ),
        'win32':
        path.join('chrome-win', 'chrome-win64', 'chrome.exe'),
    }

    current_os = sys.platform
    if current_os.startswith('linux'):
        current_os = 'linux'

    if current_os not in paths:
        raise NotImplementedError(f"OS {current_os} is not supported.")

    return path.join(devtools_root_path(), 'third_party', 'chrome',
                     paths[current_os])
