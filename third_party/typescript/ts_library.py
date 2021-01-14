# Copyright 2019 The Chromium Authors.  All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import argparse
import errno
import sys
import subprocess
import json
import os
import shutil
import collections

from os import path
_CURRENT_DIR = path.join(path.dirname(__file__))
TSC_LOCATION = path.join(_CURRENT_DIR, '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')

try:
    old_sys_path = sys.path[:]
    sys.path.append(path.join(_CURRENT_DIR, '..', '..', 'scripts'))
    import devtools_paths
finally:
    sys.path = old_sys_path
NODE_LOCATION = devtools_paths.node_path()

ROOT_DIRECTORY_OF_REPOSITORY = path.join(_CURRENT_DIR, '..', '..')
BASE_TS_CONFIG_LOCATION = path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'tsconfig.base.json')
TYPES_NODE_MODULES_DIRECTORY = path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'node_modules', '@types')
RESOURCES_INSPECTOR_PATH = path.join(os.getcwd(), 'resources', 'inspector')

GLOBAL_TYPESCRIPT_DEFINITION_FILES = [
    # legacy definitions used to help us bridge Closure and TypeScript
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'legacy',
              'legacy-defs.d.ts'),
    # global definitions that we need
    # e.g. TypeScript doesn't provide ResizeObserver definitions so we host them ourselves
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'global_typings',
              'global_defs.d.ts'),
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'global_typings',
              'request_idle_callback.d.ts'),
    # generated protocol definitions
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'generated',
              'protocol.d.ts'),
    # generated protocol api interactions
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'generated',
              'protocol-proxy-api.d.ts'),
    # Types for W3C FileSystem API
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'node_modules', '@types',
              'filesystem', 'index.d.ts'),
    # Global types required for our usage of ESTree (coming from Acorn)
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'node_modules', '@types', 'estree',
              'index.d.ts'),
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'legacy',
              'estree-legacy.d.ts'),
    # CodeMirror types
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'node_modules', '@types',
              'codemirror', 'index.d.ts'),
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'legacy',
              'codemirror-legacy.d.ts'),
]


def runTsc(tsconfig_location):
    process = subprocess.Popen([NODE_LOCATION, TSC_LOCATION, '-p', tsconfig_location],
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sources', nargs='*', help='List of TypeScript source files')
    parser.add_argument('-deps', '--deps', nargs='*', help='List of Ninja build dependencies')
    parser.add_argument('-dir', '--front_end_directory', required=True, help='Folder that contains source files')
    parser.add_argument('-b', '--tsconfig_output_location', required=True)
    parser.add_argument('--test-only', action='store_true')
    parser.add_argument('--verify-lib-check', action='store_true')
    parser.add_argument('--is_web_worker', action='store_true')
    parser.add_argument('--module', required=False)
    parser.set_defaults(test_only=False,
                        verify_lib_check=False,
                        module='esnext')

    opts = parser.parse_args()
    with open(BASE_TS_CONFIG_LOCATION) as root_tsconfig:
        try:
            tsconfig = json.loads(root_tsconfig.read())
        except Exception as e:
            print('Encountered error while loading root tsconfig:')
            print(e)
            return 1
    tsconfig_output_location = path.join(os.getcwd(), opts.tsconfig_output_location)
    tsconfig_output_directory = path.dirname(tsconfig_output_location)
    tsbuildinfo_name = path.basename(tsconfig_output_location) + '.tsbuildinfo'

    def get_relative_path_from_output_directory(file_to_resolve):
        return path.relpath(path.join(os.getcwd(), file_to_resolve), tsconfig_output_directory)

    sources = opts.sources or []

    all_ts_files = sources + GLOBAL_TYPESCRIPT_DEFINITION_FILES
    tsconfig['files'] = [get_relative_path_from_output_directory(x) for x in all_ts_files]

    if (opts.deps is not None):
        tsconfig['references'] = [{'path': src} for src in opts.deps]
    tsconfig['compilerOptions']['module'] = opts.module
    if (not opts.verify_lib_check):
        tsconfig['compilerOptions']['skipLibCheck'] = True
    tsconfig['compilerOptions']['rootDir'] = get_relative_path_from_output_directory(opts.front_end_directory)
    tsconfig['compilerOptions']['typeRoots'] = opts.test_only and [
        get_relative_path_from_output_directory(TYPES_NODE_MODULES_DIRECTORY)
    ] or []
    if opts.test_only:
        tsconfig['compilerOptions']['moduleResolution'] = 'node'
    tsconfig['compilerOptions']['outDir'] = '.'
    tsconfig['compilerOptions']['tsBuildInfoFile'] = tsbuildinfo_name
    tsconfig['compilerOptions']['lib'] = ['esnext'] + (
        opts.is_web_worker and ['webworker', 'webworker.iterable']
        or ['dom', 'dom.iterable'])

    with open(tsconfig_output_location, 'w') as generated_tsconfig:
        try:
            json.dump(tsconfig, generated_tsconfig)
        except Exception as e:
            print('Encountered error while writing generated tsconfig in location %s:' % tsconfig_output_location)
            print(e)
            return 1

    # If there are no sources to compile, we can bail out and don't call tsc.
    # That's because tsc can successfully compile dependents solely on the
    # the tsconfig.json
    if len(sources) == 0 and not opts.verify_lib_check:
        return 0

    found_errors, stderr = runTsc(tsconfig_location=tsconfig_output_location)
    if found_errors:
        print('')
        print('TypeScript compilation failed. Used tsconfig %s' % opts.tsconfig_output_location)
        print('')
        print(stderr)
        print('')
        return 1

    return 0



if __name__ == '__main__':
    sys.exit(main())
