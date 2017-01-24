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
        application_names = argv[1:input_path_flag_index]
    except:
        print('Usage: %s app_1 app_2 ... app_N --input_path <input_path> --output_path <output_path>' % argv[0])
        raise

    loader = modular_build.DescriptorLoader(input_path)
    for app in application_names:
        descriptors = loader.load_application(app + '.json')
        builder = DebugBuilder(app, descriptors, input_path, output_path)
        builder.build_app()


def symlink_or_copy_file(src, dest, safe=False):
    if safe and path.exists(dest):
        os.remove(dest)
    if hasattr(os, 'symlink'):
        os.symlink(src, dest)
    else:
        shutil.copy(src, dest)


def symlink_or_copy_dir(src, dest):
    if path.exists(dest):
        shutil.rmtree(dest)
    for src_dir, dirs, files in os.walk(src):
        subpath = path.relpath(src_dir, src)
        dest_dir = path.normpath(join(dest, subpath))
        os.mkdir(dest_dir)
        for name in files:
            src_name = join(os.getcwd(), src_dir, name)
            dest_name = join(dest_dir, name)
            symlink_or_copy_file(src_name, dest_name)


# Outputs:
#   <app_name>.html as-is
#   <app_name>.js as-is
#   <module_name>/<all_files>
class DebugBuilder(object):

    def __init__(self, application_name, descriptors, application_dir, output_dir):
        self.application_name = application_name
        self.descriptors = descriptors
        self.application_dir = application_dir
        self.output_dir = output_dir

    def app_file(self, extension):
        return self.application_name + '.' + extension

    def build_app(self):
        if self.descriptors.has_html:
            self._build_html()
        for filename in os.listdir(self.application_dir):
            src = join(os.getcwd(), self.application_dir, filename)
            if os.path.isdir(src):
                symlink_or_copy_dir(src, join(self.output_dir, filename))
            else:
                symlink_or_copy_file(src, join(self.output_dir, filename), safe=True)

    def _build_html(self):
        html_name = self.app_file('html')
        symlink_or_copy_file(join(os.getcwd(), self.application_dir, html_name), join(self.output_dir, html_name), True)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
