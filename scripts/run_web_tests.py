#!/usr/bin/python

# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Integrate into Chromium and run webtests.
"""

import argparse
import os
import shutil
import subprocess
import sys


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Integrate into Chromium and run webtests.')
    parser.add_argument('chromium_dir', help='Chromium directory')
    parser.add_argument('devtools_dir', help='DevTools directory')
    parser.add_argument('--nopatch', help='skip patching', action='store_true')
    parser.add_argument('--nobuild', help='skip building', action='store_true')
    return parser.parse_args(cli_args)


def patch(options):
    subprocess.check_call(['git', 'fetch', 'origin'], cwd=options.chromium_dir)
    subprocess.check_call(['git', 'checkout', 'origin/lkgr'], cwd=options.chromium_dir)
    DEVTOOLS_PATH = os.path.abspath(options.devtools_dir)
    PATCH_FILE = os.path.join(DEVTOOLS_PATH, 'scripts', 'chromium.patch')
    subprocess.check_call(['git', 'apply', PATCH_FILE], cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'setdep', '--var=devtools_frontend_url=file://%s' % DEVTOOLS_PATH], cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'setdep', '--var=devtools_frontend_revision=FETCH_HEAD'], cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'sync'], cwd=options.chromium_dir)


def build(options):
    subprocess.check_call(['autoninja', '-C', 'out/Release', 'blink_tests'], cwd=options.chromium_dir)


def run(options):
    subprocess.check_call(
        [os.path.join(options.chromium_dir, 'third_party', 'blink', 'tools', 'run_web_tests.py'), 'http/tests/devtools/'])


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    if not OPTIONS.nopatch:
        patch(OPTIONS)
    if not OPTIONS.nobuild:
        build(OPTIONS)
    run(OPTIONS)
