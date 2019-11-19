#!/usr/bin/env python
# -*- coding: UTF-8 -*-
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Builds applications in debug mode:
- Copies the module directories into their destinations.
- Copies app.html as-is.
"""

from os import path
from os.path import join
import os
import shutil
import sys

import modular_build


def main(argv):
    try:
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]
        build_stamp_index = argv.index('--build_stamp')
        build_stamp_path = argv[build_stamp_index + 1]
    except:
        print('Usage: %s app_1 app_2 ... app_N --input_path <input_path> --output_path <output_path>' % argv[0])
        raise

    symlink_dir_or_copy(input_path, output_path)

    with open(build_stamp_path, 'w') as file:
        file.write('stamp')


def symlink_dir_or_copy(src, dest):
    if hasattr(os, 'symlink'):
        if path.exists(dest):
            if os.path.islink(dest):
                os.unlink(dest)
            else:
                shutil.rmtree(dest)
        os.symlink(join(os.getcwd(), src), dest)
    else:
        for filename in os.listdir(src):
            new_src = join(os.getcwd(), src, filename)
            if os.path.isdir(new_src):
                copy_dir(new_src, join(dest, filename))
            else:
                copy_file(new_src, join(dest, filename), safe=True)


def copy_file(src, dest, safe=False):
    if safe and path.exists(dest):
        os.remove(dest)
    shutil.copy(src, dest)


def copy_dir(src, dest):
    if path.exists(dest):
        shutil.rmtree(dest)
    for src_dir, dirs, files in os.walk(src):
        subpath = path.relpath(src_dir, src)
        dest_dir = path.normpath(join(dest, subpath))
        os.makedirs(dest_dir)
        for name in files:
            src_name = join(os.getcwd(), src_dir, name)
            dest_name = join(dest_dir, name)
            copy_file(src_name, dest_name)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
