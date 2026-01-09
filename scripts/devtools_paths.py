# Copyright 2019 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Helper to find the path to the correct third_party directory
"""

from os import path
import sys


# Find the root path of the checkout.
# In the Chromium repository, this is the src/chromium directory.
# In the external repository, standalone build, this is the devtools-frontend directory.
# In the external repository, integrated build, this is the src/chromium directory.
def root_path():
    SCRIPTS_PATH = path.dirname(path.abspath(__file__))
    ABS_DEVTOOLS_PATH = path.dirname(SCRIPTS_PATH)
    PARENT_PATH = path.dirname(ABS_DEVTOOLS_PATH)
    # TODO(1011259): remove Chromium repository handling
    if path.basename(PARENT_PATH) == 'renderer':
        # Chromium repository
        return path.dirname(path.dirname(path.dirname(PARENT_PATH)))
    elif path.basename(PARENT_PATH) == 'devtools-frontend':
        # External repository, integrated build
        return path.dirname(path.dirname(PARENT_PATH))
    else:
        # External repository, standalone build
        return ABS_DEVTOOLS_PATH


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


def rollup_path():
    return path.join(
        node_modules_path(),
        'rollup',
        'dist',
        'bin',
        'rollup',
    )


def package_json_path():
    return path.join(devtools_root_path(), 'package.json')
