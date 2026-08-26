#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Generates the tsconfig.json used by Kythe and code search indexers."""

import argparse
import json
import os
from os import path
import shlex
import sys

_CURRENT_DIR = path.dirname(__file__)
sys.path.append(path.abspath(path.join(_CURRENT_DIR, '..')))
from response_file import expand_response_files


def maybe_update_tsconfig_file(tsconfig_output_location, tsconfig):
    old_contents = None
    if os.path.exists(tsconfig_output_location):
        with open(tsconfig_output_location, encoding="utf8") as fp:
            old_contents = fp.read()

    new_contents = json.dumps(tsconfig, sort_keys=True, indent=2)
    if old_contents is None or new_contents != old_contents:
        try:
            os.makedirs(os.path.dirname(tsconfig_output_location),
                        exist_ok=True)
            with open(tsconfig_output_location, 'w', encoding="utf8") as fp:
                fp.write(new_contents)
        except Exception as e:
            print(
                'Encountered error while writing generated tsconfig in location %s:'
                % tsconfig_output_location)
            print(e)
            return 1

    return 0


def main():
    parser = argparse.ArgumentParser(
        description='Generate indexer tsconfig.json')
    parser.add_argument('--tsconfig-base',
                        type=argparse.FileType('r', encoding='utf8'),
                        required=True,
                        help='Base tsconfig.json configuration')
    parser.add_argument('--sources-list',
                        type=argparse.FileType('r', encoding='utf8'),
                        required=True,
                        help='File containing list of TypeScript source files')
    parser.add_argument('--additional-type-definitions',
                        nargs='*',
                        default=[],
                        help='List of additional TypeScript declaration files')
    parser.add_argument('--tsconfig-output-location',
                        required=True,
                        help='Path to output tsconfig.json')
    parser.add_argument('--front-end-directory',
                        default='.',
                        help='Root directory for front_end source files')

    opts = parser.parse_args(expand_response_files(sys.argv[1:]))

    try:
        tsconfig = json.loads(opts.tsconfig_base.read())
    except Exception as e:
        print('Encountered error while loading base tsconfig:')
        print(e)
        return 1

    tsconfig_output_location = path.join(os.getcwd(),
                                         opts.tsconfig_output_location)
    tsconfig_output_directory = path.dirname(tsconfig_output_location)

    def get_relative_path_from_output_directory(file_to_resolve):
        return path.relpath(path.join(os.getcwd(), file_to_resolve),
                            tsconfig_output_directory)

    sources = shlex.split(opts.sources_list.read())
    all_ts_files = sources + (opts.additional_type_definitions or [])

    tsconfig['files'] = [
        get_relative_path_from_output_directory(x) for x in all_ts_files
    ]
    tsconfig['checkJs'] = True
    tsconfig['compilerOptions']['skipLibCheck'] = True
    tsconfig['compilerOptions'][
        'disableSourceOfProjectReferenceRedirect'] = True
    tsconfig['compilerOptions'][
        'rootDir'] = get_relative_path_from_output_directory(
            opts.front_end_directory)
    tsconfig['compilerOptions']['types'] = []
    tsconfig['compilerOptions']['typeRoots'] = []
    tsconfig['compilerOptions']['module'] = 'esnext'
    tsconfig['compilerOptions']['outDir'] = '.'
    tsconfig['compilerOptions']['target'] = 'ES2023'
    tsconfig['compilerOptions']['lib'] = [
        'dom', 'dom.iterable', 'ES2023', 'ES2024.Promise', 'ESNext.Iterator',
        'ESNext.Collection', 'ESNext.Array'
    ]

    return maybe_update_tsconfig_file(tsconfig_output_location, tsconfig)


if __name__ == '__main__':
    sys.exit(main())
