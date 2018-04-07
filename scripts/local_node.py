# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Thin wrapper around the local node.js installed as part of chromium DEPS
"""

from os import path
import sys

SCRIPTS_PATH = path.dirname(path.abspath(__file__))
THIRD_PARTY_PATH = path.join(SCRIPTS_PATH, '..', '..', '..', '..')
NODE_PATH = path.join(THIRD_PARTY_PATH, 'node')
ESLINT_PATH = path.join(THIRD_PARTY_PATH, 'devtools-node-modules', 'third_party',
                        'node_modules', '.bin', 'eslint')

try:
    old_sys_path = sys.path[:]
    sys.path.append(NODE_PATH)
    import node
finally:
    sys.path = old_sys_path


def node_path():
    return node.GetBinaryPath()


def eslint_path():
    return ESLINT_PATH
