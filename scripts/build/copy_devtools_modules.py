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
import shutil
import sys


def main(argv):
    try:
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]
        devtools_modules = argv[1:input_path_flag_index]
    except:
        print 'Usage: %s module_1 module_2 ... module_N --input_path <input_path> --output_path <output_path>' % argv[0]
        raise

    for file_name in devtools_modules:
        shutil.copy(join(input_path, file_name), join(output_path, relpath(file_name, 'front_end')))


if __name__ == '__main__':
    sys.exit(main(sys.argv))
