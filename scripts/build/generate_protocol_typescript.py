#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Thin Python wrapper around scripts/protocol_typescript/protocol_dts_generator.ts.

generated_ts() in scripts/build/ninja/generated_ts.gni runs Python generators;
this wrapper runs protocol_dts_generator.ts through third_party/node/node.py
with all CLI arguments forwarded.
"""

import os
import sys

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(os.path.join(REPO_DIR, 'third_party', 'node'))
import node  # pylint: disable=wrong-import-position

GENERATOR = os.path.join(REPO_DIR, 'scripts', 'protocol_typescript',
                         'protocol_dts_generator.ts')


def main():
    node.RunNode([GENERATOR] + sys.argv[1:])


if __name__ == '__main__':
    main()
