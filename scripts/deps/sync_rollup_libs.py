#!/usr/bin/env python3
# Copyright 2025 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
import os
import shutil
import sys

# The directory where CIPD downloads the binary
SRC_DIR = os.path.join('third_party', 'rollup_libs')
# The root of the node_modules directory
NODE_MODULES_ROOT = 'node_modules'


def main():
    if not os.path.exists(SRC_DIR):
        print(
            f"Source directory {SRC_DIR} does not exist. Skipping Rollup libs sync."
        )
        return 0

    # Ensure node_modules exists (in case npm install hasn't run yet)
    if not os.path.exists(NODE_MODULES_ROOT):
        os.makedirs(NODE_MODULES_ROOT)

    # 1. Find the binary file
    # We look for .node (Mac/Linux) or .exe (Windows)
    binary_file = None
    for f in os.listdir(SRC_DIR):
        if f.endswith('.node') or f.endswith('.exe'):
            binary_file = f
            break

    if not binary_file:
        print(
            f"No native binary found in {SRC_DIR}. This is expected if the platform doesn't need one."
        )
        return 0

    # 2. Derive the package name
    # The binary is named like "rollup-linux-x64-gnu.node".
    # We strip the extension to get the scope name: "rollup-linux-x64-gnu"
    base_name = os.path.splitext(binary_file)[0]
    package_name = f"@rollup/{base_name}"

    # 3. Prepare the destination directory: node_modules/@rollup/rollup-linux-x64-gnu/
    dest_dir = os.path.join(NODE_MODULES_ROOT, '@rollup', base_name)

    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    os.makedirs(dest_dir)

    # 4. Copy the binary
    src_path = os.path.join(SRC_DIR, binary_file)
    dest_path = os.path.join(dest_dir, binary_file)
    shutil.copy2(src_path, dest_path)

    # 5. Create a minimal package.json
    # This is CRITICAL. Without this, Node.js resolution ("require('@rollup/...')")
    # will fail because it won't know that .node file is the entry point.
    pkg_json = {
        "name": package_name,
        "version":
        "4.53.5",  # This can be generic, Rollup checks the existence mostly
        "main": binary_file,
        "files": [binary_file]
    }

    with open(os.path.join(dest_dir, 'package.json'), 'w') as f:
        json.dump(pkg_json, f, indent=2)

    print(f"Synced Rollup native dependency: {package_name} -> {dest_dir}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
