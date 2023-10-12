#!/usr/bin/env vpython3
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Update manually maintained dependencies from Chromium.
"""

import argparse
import enum
import os
import shutil
import subprocess
import sys


def node_path(options):
    try:
        old_sys_path = sys.path[:]
        sys.path.append(
            os.path.join(options.chromium_dir, 'third_party', 'node'))
        import node
    finally:
        sys.path = old_sys_path
    return node.GetBinaryPath()

# Files whose location within devtools-frontend matches the upstream location.
FILES = [
    'v8/include/js_protocol.pdl',
    'third_party/blink/renderer/core/css/css_properties.json5',
    'third_party/blink/renderer/core/html/aria_properties.json5',
    'third_party/blink/public/devtools_protocol/browser_protocol.pdl',
    'third_party/blink/renderer/core/frame/deprecation/deprecation.json5',
]

# Files whose location within devtools-frontend differs from the upstream location.
FILE_MAPPINGS = {
    # chromium_path => devtools_frontend_path
    'components/variations/proto/devtools/client_variations.js':
    'front_end/third_party/chromium/client-variations/ClientVariations.js',
    'third_party/axe-core/axe.d.ts': 'front_end/third_party/axe-core/axe.d.ts',
    'third_party/axe-core/axe.js': 'front_end/third_party/axe-core/axe.js',
    'third_party/axe-core/axe.min.js':
    'front_end/third_party/axe-core/axe.min.js',
    'third_party/axe-core/LICENSE': 'front_end/third_party/axe-core/LICENSE',
}

for f in FILES:
    FILE_MAPPINGS[f] = f


class ReferenceMode(enum.Enum):
    Tot = 'tot'
    WorkingTree = 'working-tree'

    def __str__(self):
        return self.value


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Roll dependencies from Chromium.')
    parser.add_argument(
        '--ref',
        type=ReferenceMode,
        choices=list(ReferenceMode),
        default=ReferenceMode.Tot,
        help='Defaults to tot. '
        'If tot, fetch origin/main of Chromium repository and use it. '
        'If working-tree, use working tree as is.')
    parser.add_argument('chromium_dir', help='path to chromium/src directory')
    parser.add_argument('devtools_dir',
                        help='path to devtools/devtools-frontend directory')
    return parser.parse_args(cli_args)

def update(options):
    subprocess.check_call(['git', 'fetch', 'origin'], cwd=options.chromium_dir)
    subprocess.check_call(['git', 'checkout', 'origin/main'],
                          cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'sync'], cwd=options.chromium_dir)

def copy_files(options):
    for from_path, to_path in FILE_MAPPINGS.items():
        from_path = os.path.normpath(from_path)
        to_path = os.path.normpath(to_path)
        print('%s => %s' % (from_path, to_path))
        shutil.copy(os.path.join(options.chromium_dir, from_path),
                    os.path.join(options.devtools_dir, to_path))


def generate_signatures(options):
    print(
        'generating JavaScript native functions signatures from .idl and typescript definitions'
    )
    subprocess.check_call([
        node_path(options),
        os.path.join(options.devtools_dir, 'scripts', 'javascript_natives',
                     'index.js'), options.chromium_dir, options.devtools_dir
    ])


def generate_dom_pinned_properties(options):
    print('generating DOM pinned properties dataset from .idl definitions')
    subprocess.check_call([
        node_path(options),
        os.path.join(options.devtools_dir, 'scripts', 'webidl-properties',
                     'index.js'), options.devtools_dir
    ])


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    if OPTIONS.ref == ReferenceMode.Tot:
        update(OPTIONS)
    copy_files(OPTIONS)
    generate_signatures(OPTIONS)
    generate_dom_pinned_properties(OPTIONS)
