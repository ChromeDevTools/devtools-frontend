# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Update manually maintained dependencies from Chromium.
"""

import argparse
import os
import shutil
import subprocess
import sys

FILES = [
    ['v8', 'include', 'js_protocol.pdl'],
    ['third_party', 'blink', 'renderer', 'core', 'css', 'css_properties.json5'],
    ['third_party', 'blink', 'renderer', 'core', 'html', 'aria_properties.json5'],
    ['third_party', 'blink', 'public', 'devtools_protocol', 'browser_protocol.pdl'],
    ['third_party', 'axe-core', 'axe.d.ts'],
    ['third_party', 'axe-core', 'axe.js'],
    ['third_party', 'axe-core', 'axe.min.js'],
    ['third_party', 'axe-core', 'LICENSE'],
]


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Roll dependencies from Chromium.')
    parser.add_argument('chromium_dir', help='Chromium directory')
    parser.add_argument('devtools_dir', help='DevTools directory')
    return parser.parse_args(cli_args)

def update(options):
    subprocess.check_call(['git', 'fetch', 'origin'], cwd=options.chromium_dir)
    subprocess.check_call(['git', 'checkout', 'origin/master'], cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'sync'], cwd=options.chromium_dir)

def copy_files(options):
    for file in FILES:
        shutil.copy(os.path.join(options.chromium_dir, *file), os.path.join(options.devtools_dir, *file))


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    update(OPTIONS)
    copy_files(OPTIONS)
