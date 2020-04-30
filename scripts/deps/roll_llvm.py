# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import os
import subprocess
import sys


def parse_options(cli_argv):
    parser = argparse.ArgumentParser(description='Roll a new LLVM version.')
    parser.add_argument('devtools_dir', help='DevTools directory.')
    parser.add_argument('reviewer', help='Reviewer for the CL.')
    parser.add_argument(
        '--dry-run',
        '-n',
        action='store_true',
        help='Skip commiting to gerrit.')
    parser.add_argument(
        '--no-checkout',
        action='store_true',
        help='Skip initial checkout of origin/master.')
    return parser.parse_args(cli_argv)


def update(options):
    # Update from upstream
    if options.no_checkout:
        subprocess.check_call(['git', 'fetch', 'origin'],
                              cwd=options.devtools_dir)
        subprocess.check_call(['git', 'checkout', 'origin/master'],
                              cwd=options.devtools_dir)

    # Pull LLVM
    llvm_dir = os.path.join(options.devtools_dir, 'back_end',
                            'CXXDWARFSymbols', 'third_party', 'llvm')
    subprocess.check_call(['git', 'fetch', 'origin'], cwd=llvm_dir)
    new_rev = subprocess.check_output(['git', 'rev-parse', 'origin/master'],
                                      cwd=llvm_dir).strip()
    old_rev = subprocess.check_output(
        ['gclient', 'getdep', '--var=llvm_revision'],
        cwd=options.devtools_dir).strip()
    rev_range = '%s..%s' % (old_rev[0:10], new_rev[0:10])

    # Create commit message
    message = 'Update back_end/CXXDWARFSymbols/third_party/llvm %s' % rev_range

    subprocess.check_call(
        ['gclient', 'setdep',
         '--var=llvm_revision=%s' % new_rev],
        cwd=options.devtools_dir)
    # Create commit
    subprocess.check_call(['git', 'add', 'DEPS'], cwd=options.devtools_dir)
    subprocess.check_call([
        'git', 'checkout', '-b',
        'roll_llvm_%s_%s' % (old_rev[0:5], new_rev[0:5])
    ],
                          cwd=options.devtools_dir)
    subprocess.check_call(['git', 'commit', '-m', message],
                          cwd=options.devtools_dir)
    # Upload CL
    if options.dry_run:
        subprocess.check_call([
            'git', 'cl', 'upload', '-m', message,
            '--tbrs=%s' % options.reviewer, '-c'
        ],
                              cwd=options.devtools_dir)
        subprocess.check_call(['git', 'cl', 'web'], cwd=options.devtools_dir)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    update(OPTIONS)
