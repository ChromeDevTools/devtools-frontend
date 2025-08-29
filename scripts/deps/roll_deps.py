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
import json
import os
import subprocess
import sys
import shutil


def node_path(options):
    try:
        old_sys_path = sys.path[:]
        sys.path.append(
            os.path.join(options.devtools_dir, 'third_party', 'node'))
        import node
    finally:
        sys.path = old_sys_path
    return node.GetBinaryPath()


# Files whose location within devtools-frontend matches the upstream location.
FILES = [
    'v8/include/js_protocol.pdl',
    'third_party/blink/renderer/core/css/css_properties.json5',
    'third_party/blink/renderer/core/html/aria_properties.json5',
    'third_party/blink/public/devtools_protocol/domains',
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
    parser = argparse.ArgumentParser(
        description='Roll dependencies from Chromium.')
    parser.add_argument(
        '--ref',
        type=ReferenceMode,
        choices=list(ReferenceMode),
        default=ReferenceMode.Tot,
        help='Defaults to tot. '
        'If tot, fetch origin/main of Chromium repository and use it. '
        'If working-tree, use working tree as is.')
    parser.add_argument('--update-node',
                        action="store_true",
                        default=False,
                        help='If set it syncs nodejs.')
    parser.add_argument(
        '--output',
        default=None,
        help=
        'If set it outputs information about the roll in the specified file.')
    parser.add_argument('chromium_dir', help='path to chromium/src directory')
    parser.add_argument('devtools_dir',
                        help='path to devtools/devtools-frontend directory')
    return parser.parse_args(cli_args)


def update(options):
    subprocess.check_call(['git', 'fetch', 'origin'], cwd=options.chromium_dir)
    subprocess.check_call(['git', 'checkout', 'origin/main'],
                          cwd=options.chromium_dir)
    subprocess.check_call(['gclient', 'sync'], cwd=options.chromium_dir)


def sync_node(options):
    """Node is managed as a standard GCS deps so we run gclient sync but without hooks"""
    subprocess.check_call(['gclient', 'sync', '--nohooks'],
                          cwd=options.devtools_dir)


def replace_ifttt(content):
    # Replace IFTTT tags with skipped versions.
    # Escape "L" as "\x4C" to avoid presubmit failures.
    content = content.replace('\x4CINT.IfChange', '\x4CINT_SKIP.IfChange')
    content = content.replace('\x4CINT.ThenChange', '\x4CINT_SKIP.ThenChange')
    return content


def copy_file_content(from_path, to_path):
    with open(from_path, 'r', encoding='utf-8') as infile:
        content = infile.read()

    content = replace_ifttt(content)

    with open(to_path, 'w', encoding='utf-8') as outfile:
        outfile.write(content)


def copy_files(options):
    for from_path, to_path in FILE_MAPPINGS.items():
        from_path_full = os.path.join(options.chromium_dir,
                                      os.path.normpath(from_path))
        to_path_full = os.path.join(options.devtools_dir,
                                    os.path.normpath(to_path))
        print(f'{os.path.normpath(from_path)} => {os.path.normpath(to_path)}')

        if not os.path.exists(from_path_full):
            if from_path_full.endswith("/domains"):
                continue
            raise Exception(f'{os.path.normpath(from_path)} does not exist')

        # Create destination directory if it doesn't exist
        os.makedirs(os.path.dirname(to_path_full), exist_ok=True)

        if os.path.isdir(from_path_full):
            # Copy files from dirs
            for file in os.listdir(from_path_full):
                file_from_path = os.path.join(from_path_full, file)
                if os.path.isdir(file_from_path):
                    continue
                file_to_path = os.path.join(to_path_full, file)
                copy_file_content(file_from_path, file_to_path)
            continue

        copy_file_content(from_path_full, to_path_full)


def generate_signatures(options):
    print('generating JavaScript native functions signatures from .idl '
          'and typescript definitions')
    subprocess.check_call([
        node_path(options),
        os.path.join(options.devtools_dir, 'scripts', 'javascript_natives',
                     'index.js'), options.chromium_dir, options.devtools_dir
    ])


def generate_protocol_resources(options):
    print('generating protocol resources')
    subprocess.check_call([
        os.path.join(options.devtools_dir, 'scripts', 'deps',
                     'generate_protocol_resources.py'), '--node-path',
        node_path(options)
    ],
                          cwd=options.devtools_dir)


def run_git_cl_format(options):
    print('running `git cl format` to format generated TS files')
    subprocess.check_call(['git', 'cl', 'format', '--js', '--full'],
                          cwd=options.devtools_dir)


def run_eslint(options):
    print('running eslint with --fix for generated files')
    result = subprocess.check_output(
        ['git', 'diff', '--diff-filter=d', '--name-only'],
        cwd=options.devtools_dir).strip()
    generated_source_files = []
    for line in result.split(b'\n'):
        if line.endswith(b'.js') or line.endswith(b'.ts'):
            generated_source_files.append(line)
    subprocess.check_call([
        node_path(options), "--experimental-strip-types",
        "--no-warnings=ExperimentalWarning",
        os.path.join(options.devtools_dir, 'scripts', 'test',
                     'run_lint_check.mjs')
    ] + generated_source_files,
                          cwd=options.devtools_dir)


def files_changed(options):
    return subprocess.check_output(['git', 'diff', '--name-only'],
                                   cwd=options.devtools_dir,
                                   text=True).strip()


def update_deps_revision(options):
    print('updating DEPS revision')
    old_revision = subprocess.check_output(
        ['gclient', 'getdep', '--var=chromium_browser_protocol_revision'],
        cwd=options.devtools_dir,
        text=True).strip()
    new_revision = subprocess.check_output(
        ['git', 'log', '-1', '--pretty=format:%H'],
        cwd=options.chromium_dir,
        text=True).strip()
    subprocess.check_call(
        [
            'gclient', 'setdep',
            f'--var=chromium_browser_protocol_revision={new_revision}'
        ],
        cwd=options.devtools_dir,
    )
    if options.output:
        with open(options.output, 'w', encoding='utf-8') as f:
            json.dump(
                {
                    'old_revision': old_revision,
                    'new_revision': new_revision
                }, f)


def update_readme_revision(options):
    print('updating README.chromium revision')
    readme_path = os.path.join(options.devtools_dir, 'front_end',
                               'third_party', 'chromium', 'README.chromium')

    old_content = ""
    with open(readme_path, 'r', encoding='utf-8') as f:
        old_content = f.read()

    old_revision = ""
    for line in old_content.splitlines():
        if line.startswith('Revision:'):
            old_revision = line.split(':', 1)[1].strip()
            break

    new_revision = subprocess.check_output(
        ['git', 'log', '-1', '--pretty=format:%H'],
        cwd=options.chromium_dir,
        text=True).strip()

    # Replace the old revision with the new revision.
    print(f'-> from {old_revision} to {new_revision}')
    patched_content = old_content.replace(f'Revision: {old_revision}',
                                          f'Revision: {new_revision}')
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(patched_content)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    if OPTIONS.ref == ReferenceMode.Tot:
        update(OPTIONS)
    elif OPTIONS.update_node:
        sync_node(OPTIONS)
    copy_files(OPTIONS)
    generate_signatures(OPTIONS)
    generate_protocol_resources(OPTIONS)
    if files_changed(OPTIONS):
        run_git_cl_format(OPTIONS)
        run_eslint(OPTIONS)
        update_deps_revision(OPTIONS)
        update_readme_revision(OPTIONS)
