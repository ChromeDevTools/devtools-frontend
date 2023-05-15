#!/usr/bin/env vpython3
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Ensure Devtools-frontend is properly symlinked on gclient sync

In order to use:
Ensure your .gclient file that manages chromium.src contains this hook
after your list of solutions:

hooks = [
  {
    # Ensure devtools-frontend is symlinked in the correct location
    'name': 'Symlink devtools-frontend',
    'pattern': '.',
    'action': [
        'python',
        '<path>/<to>/devtools-frontend/scripts/deps/ensure_symlink.py',
        '<path>/<to>/src',
        '<path>/<to>/devtools-frontend'
    ],
  }
]
"""

import argparse
import os
import sys
import shutil

DEVTOOLS_FRONTEND_CHROMIUM_LOCATION = './third_party/devtools-frontend/src'


def parse_options(cli_args):
    parser = argparse.ArgumentParser(
        description='Ensure Devtools is symlinked in a full checkout.')
    parser.add_argument('chromium_dir', help='Root of the Chromium Directory')
    parser.add_argument('devtools_dir', help='Root of the DevTools directory')
    return parser.parse_args(cli_args)


def ensure_symlink(options):
    chromium_devtools_path = os.path.normpath(
        os.path.join(options.chromium_dir,
                     DEVTOOLS_FRONTEND_CHROMIUM_LOCATION))
    devtools_path = os.path.abspath(options.devtools_dir)
    if os.path.exists(chromium_devtools_path):
        if not os.path.islink(chromium_devtools_path):
            shutil.rmtree(chromium_devtools_path, ignore_errors=True)
        else:
            os.remove(chromium_devtools_path)
    os.symlink(devtools_path, chromium_devtools_path, True)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    ensure_symlink(OPTIONS)
