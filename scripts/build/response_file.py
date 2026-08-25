# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Utility for recursive in-place response file expansion."""

import os
import shlex


def expand_response_files(args, visited=None):
    """Expands any @response_file arguments in-place recursively."""
    if visited is None:
        visited = set()
    expanded = []
    for arg in args:
        if arg.startswith('@'):
            rsp_path = os.path.abspath(arg[1:])
            if rsp_path in visited:
                raise ValueError(
                    f"Circular response file reference detected: {arg[1:]}")
            visited.add(rsp_path)
            with open(rsp_path, 'r', encoding='utf-8') as f:
                nested_args = shlex.split(f.read())
            expanded.extend(expand_response_files(nested_args, visited))
            visited.remove(rsp_path)
        else:
            expanded.append(arg)
    return expanded
