#!/usr/bin/env python
# -*- coding: UTF-8 -*-
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Copies the modules into the resources folder
"""

from os.path import join, relpath
import shlex
import shutil
import sys

import rjsmin

from modular_build import read_file, write_file


def main(argv):
    try:
        file_list_arg_index = argv.index('--file_list')
        file_list_filename = argv[file_list_arg_index + 1]
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]

        file_list_file = open(file_list_filename, 'r')
        file_list_contents = file_list_file.read()
        devtools_modules = shlex.split(file_list_contents)
    except:
        print('Usage: %s --file_list <response_file_path> --input_path <input_path> --output_path <output_path>' % argv[0])
        raise

    for file_name in devtools_modules:
        file_content = read_file(join(input_path, file_name))
        minified = rjsmin.jsmin(file_content)
        write_file(join(output_path, relpath(file_name, 'front_end')), minified)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
