#!/usr/bin/env python
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
import subprocess

DEVTOOLS_FRONTEND_CHROMIUM_LOCATION = './third_party/devtools-frontend/src'


def symlink(src, dst):
    os_symlink = getattr(os, 'symlink', None)
    if callable(os_symlink):
        # symlink is only available on Unix
        os_symlink(src, dst)
    else:
        # use mklink on windows
        subprocess.check_call(['mklink', '/D', dst, src], shell=True)


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
    if not os.path.exists(chromium_devtools_path):
        symlink(os.path.normpath(options.devtools_dir), chromium_devtools_path)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    ensure_symlink(OPTIONS)
