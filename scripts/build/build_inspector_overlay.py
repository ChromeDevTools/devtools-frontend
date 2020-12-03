#!/usr/bin/env vpython
# -*- coding: UTF-8 -*-
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Builds inspector overlay:
- bundles input js files using rollup
- copies css files as is
"""

from os import path
from os.path import join
from modular_build import read_file, write_file
from itertools import tee

import os
import sys
import subprocess
import rjsmin

try:
    original_sys_path = sys.path
    sys.path = sys.path + [
        path.join(os.path.dirname(os.path.realpath(__file__)), '..')
    ]
    import devtools_paths
finally:
    sys.path = original_sys_path


def check_size(filename, data, max_size):
    assert len(
        data
    ) < max_size, "generated file %s should not exceed max_size of %d bytes. Current size: %d" % (
        filename, max_size, len(data))


def rollup(input_path, output_path, filename, max_size, rollup_plugin):
    target = join(input_path, filename)
    rollup_process = subprocess.Popen(
        [devtools_paths.node_path(),
         devtools_paths.rollup_path()] +
        ['--format', 'iife', '-n', 'InspectorOverlay'] + ['--input', target] +
        ['--plugin', rollup_plugin],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    out, error = rollup_process.communicate()
    if not out:
        raise Exception("rollup failed: " + error)
    min = rjsmin.jsmin(out)
    check_size(filename, min, max_size)
    write_file(join(output_path, filename), min)


def to_pairs(list):
    pairs = []
    while list:
        pairs.append((list.pop(0), list.pop(0)))
    return pairs


def main(argv):
    try:
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]
        rollup_plugin_index = argv.index('--rollup_plugin')
        rollup_plugin = argv[rollup_plugin_index + 1]

        file_names_with_sizes = to_pairs(argv[1:input_path_flag_index])
        for filename, max_size in file_names_with_sizes:
            max_size = int(max_size)
            if filename.endswith(".js"):
                rollup(input_path, output_path, filename, max_size,
                       rollup_plugin)
            if filename.endswith(".css"):
                css_file = read_file(join(input_path, filename))
                check_size(filename, css_file, max_size)
                write_file(join(output_path, filename), css_file)

    except:
        print(
            'Usage: %s filename_1 max_size_1 filename_2 max_size_2 ... filename_N max_size_N --input_path <input_path> --output_path <output_path>'
            % argv[0])
        raise


if __name__ == '__main__':
    sys.exit(main(sys.argv))
