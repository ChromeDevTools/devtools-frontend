# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Update Chromium to ToT devtools-frontend.
"""

import argparse
import os
import shutil
import subprocess
import sys


def parse_options(cli_args):
    parser = argparse.ArgumentParser(
        description='Roll dependencies from Chromium.')
    parser.add_argument('chromium_dir', help='Chromium directory')
    parser.add_argument('devtools_dir', help='DevTools directory')
    parser.add_argument('reviewer', help='reviewer for the CL')
    return parser.parse_args(cli_args)

def update(options):
    # Update from upstream
    subprocess.check_call(['git', 'fetch', 'origin'],
                          cwd=options.chromium_dir)
    subprocess.check_call(['git', 'checkout', 'origin/master'],
                          cwd=options.chromium_dir)
    subprocess.check_call(['git', 'fetch', 'origin'],
                          cwd=options.devtools_dir)
    # Get commit hashes
    new_rev = subprocess.check_output(['git', 'rev-parse', 'origin/master'],
                                      cwd=options.devtools_dir).strip()
    old_rev = subprocess.check_output(
        ['gclient', 'getdep', '--var=devtools_frontend_revision'],
        cwd=options.chromium_dir).strip()
    rev_range = '%s..%s' % (old_rev[0:10], new_rev[0:10])
    # Create commit message
    message = 'Update third_party/devtools-frontend %s' % rev_range
    message = message + '\n\n'
    message = message + 'https://chromium.googlesource.com/devtools/devtools-frontend/+log/'
    message = message + rev_range
    # Display changes
    subprocess.check_call(['git', 'log', '--oneline', rev_range],
                          cwd=options.devtools_dir)
    # Set deps
    subprocess.check_call(
        ['gclient', 'setdep', '--var=devtools_frontend_revision=%s' % new_rev],
        cwd=options.chromium_dir)
    # Create commit
    subprocess.check_call(['git', 'add', 'DEPS'], cwd=options.chromium_dir)
    subprocess.check_call(
        ['git',
         'checkout',
         '-b',
         'devtools_frontend_%s_%s' % (old_rev[0:5], new_rev[0:5])],
        cwd=options.chromium_dir)
    subprocess.check_call(['git', 'commit', '-m', message],
                          cwd=options.chromium_dir)
    # Upload CL
    subprocess.check_call(
        ['git',
         'cl',
         'upload',
         '-m', message,
         '--tbrs=%s' % options.reviewer,
         '-c'],
        cwd=options.chromium_dir)
    subprocess.check_call(['git', 'cl', 'web'], cwd=options.chromium_dir)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    update(OPTIONS)
