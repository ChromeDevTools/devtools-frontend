#!/usr/bin/env python3
# Copyright 2025 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
import os
import shutil
import stat
import sys

# The directory where CIPD downloads the binary
SRC_DIR = os.path.join('third_party', 'rollup_libs')
# The root of the node_modules directory
NODE_MODULES_ROOT = 'node_modules'


def on_rm_error(func, path, exc_info):
    # This error handler is for shutil.rmtree.
    # On Windows, rmtree can fail with PermissionError if a file is read-only.
    # To fix this, we make the file writable and retry the deletion.
    os.chmod(path, stat.S_IWRITE)
    func(path)


def main():
    if not os.path.exists(SRC_DIR):
        print(
            f"Source directory {SRC_DIR} does not exist. Skipping Rollup libs sync."
        )
        return 0

    # Ensure node_modules exists (in case npm install hasn't run yet)
    if not os.path.exists(NODE_MODULES_ROOT):
        os.makedirs(NODE_MODULES_ROOT)

    # 1. Find the binary file recursively
    # We look for .node (Mac/Linux) or .exe (Windows)
    # This handles cases where the CIPD package might have a nested directory.
    binary_file_name = None
    binary_full_path = None

    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.endswith('.node') or f.endswith('.exe'):
                binary_file_name = f
                binary_full_path = os.path.join(root, f)
                break
        if binary_full_path:
            break

    if not binary_full_path:
        print(
            f"No native binary found in {SRC_DIR}. This is expected if the platform doesn't need one."
        )
        return 0

    # 2. Derive the package name
    # Input:  "rollup.linux-x64-gnu.node"
    # Step A: Remove extension -> "rollup.linux-x64-gnu"
    base_name = os.path.splitext(binary_file_name)[0]

    # Step B: Replace dots with dashes
    # Rollup expects "@rollup/rollup-linux-x64-gnu"
    # But the binary is often named "rollup.linux-x64-gnu"
    sanitized_name = base_name.replace('.', '-')

    package_name = f"@rollup/{sanitized_name}"

    # 3. Prepare the destination directory: node_modules/@rollup/rollup-linux-x64-gnu/
    dest_dir = os.path.join(NODE_MODULES_ROOT, '@rollup', sanitized_name)

    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir, onerror=on_rm_error)
    os.makedirs(dest_dir)

    # 4. Copy the binary
    # We rename it to match the sanitized name to be safe, though Rollup
    # mainly cares that 'main' in package.json points to the file on disk.
    dest_file_name = f"{sanitized_name}{os.path.splitext(binary_file_name)[1]}"
    dest_path = os.path.join(dest_dir, dest_file_name)
    shutil.copy2(binary_full_path, dest_path)

    # 5. Create a minimal package.json
    # This is CRITICAL. Without this, Node.js resolution ("require('@rollup/...')")
    # will fail because it won't know that .node file is the entry point.
    pkg_json = {
        "name": package_name,
        "version":
        "4.53.5",  # This can be generic, Rollup checks the existence mostly
        "main": dest_file_name,
        "files": [dest_file_name]
    }

    with open(os.path.join(dest_dir, 'package.json'), 'w') as f:
        json.dump(pkg_json, f, indent=2)

    return 0


if __name__ == '__main__':
    sys.exit(main())
