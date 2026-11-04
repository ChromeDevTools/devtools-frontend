#!/usr/bin/env python3
#
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Prepares the emscripten-releases toolchain, which gclient downloads from GCS,
for building the C/C++ debugging extension.

gclient removes the whole GCS dependency directory whenever emscripten is
rolled, so this script runs as a hook after every sync to add:
  * the `.emscripten` config file that emcc reads,
  * the `ld.lld` name for lld, which clang needs for `-fuse-ld=lld`.
"""

import argparse
import os
import platform
import shutil
import sys

CONFIG_TEMPLATE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               'emscripten_config')


def install_config(dest):
    config = os.path.join(dest, '.emscripten')
    with open(CONFIG_TEMPLATE) as f:
        expected = f.read()
    if os.path.isfile(config) and not os.path.islink(config):
        with open(config) as f:
            if f.read() == expected:
                return
    if os.path.lexists(config):
        os.remove(config)
    shutil.copyfile(CONFIG_TEMPLATE, config)


def link_lld(bin_dir):
    if platform.system() == 'Windows':
        return
    ld_lld = os.path.join(bin_dir, 'ld.lld')
    lld = os.path.join(bin_dir, 'lld')
    if os.path.exists(lld) and not os.path.lexists(ld_lld):
        os.symlink('lld', ld_lld)


def script_main(args):
    parser = argparse.ArgumentParser(description='Set up emscripten')
    parser.add_argument('dest', help='emscripten-releases directory')
    options = parser.parse_args(args)

    bin_dir = os.path.join(options.dest, 'install', 'bin')
    if not os.path.isdir(bin_dir):
        sys.stderr.write(
            f'{bin_dir} does not exist. There is no emscripten-releases build '
            'in DEPS for this platform.\n')
        return 0

    install_config(options.dest)
    link_lld(bin_dir)
    return 0


if __name__ == '__main__':
    sys.exit(script_main(sys.argv[1:]))
