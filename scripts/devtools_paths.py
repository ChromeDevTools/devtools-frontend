# Copyright 2019 The Chromium Authors. All rights reserved.
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
    elif path.basename(PARENT_PATH) == 'third_party':
        # External repository, integrated build
        return path.dirname(PARENT_PATH)
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


DEVTOOLS_ROOT_PATH = path.join(path.dirname(__file__), '..')


def node_modules_path():
    SCRIPTS_PATH = path.dirname(path.abspath(__file__))
    ABS_DEVTOOLS_PATH = path.dirname(SCRIPTS_PATH)
    PARENT_PATH = path.dirname(ABS_DEVTOOLS_PATH)
    # TODO(1011259): remove Chromium repository handling
    if path.basename(PARENT_PATH) == 'renderer':
        # While in Chromium repo, node modules are hosted in //third_party/devtools-node-modules.
        return path.join(root_path(), 'third_party', 'devtools-node-modules', 'third_party', 'node_modules')
    else:
        # In the external repo, node modules are hosted in root.
        return path.join(root_path(), 'node_modules')


def eslint_path():
    return path.join(node_modules_path(), 'eslint', 'bin', 'eslint.js')


def karma_path():
    return path.join(node_modules_path(), 'karma', 'bin', 'karma')


def package_json_path():
    return path.join(DEVTOOLS_ROOT_PATH, 'package.json')
