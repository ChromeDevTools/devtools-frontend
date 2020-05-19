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
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'legacy', 'legacy-defs.d.ts'),
    # generated protocol definitions
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'generated', 'protocol.d.ts'),
    # generated protocol api interactions
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'front_end', 'generated', 'protocol-proxy-api.d.ts'),
    # Types for W3C FileSystem API
    path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'node_modules', '@types', 'filesystem', 'index.d.ts'),
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
    parser.set_defaults(test_only=False, verify_lib_check=False)

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
    tsconfig['compilerOptions']['declaration'] = True
    tsconfig['compilerOptions']['composite'] = True
    tsconfig['compilerOptions']['sourceMap'] = True
    if (not opts.verify_lib_check):
        tsconfig['compilerOptions']['skipLibCheck'] = True
    tsconfig['compilerOptions']['rootDir'] = get_relative_path_from_output_directory(opts.front_end_directory)
    tsconfig['compilerOptions']['typeRoots'] = opts.test_only and [
        get_relative_path_from_output_directory(TYPES_NODE_MODULES_DIRECTORY)
    ] or []
    tsconfig['compilerOptions']['outDir'] = '.'
    tsconfig['compilerOptions']['tsBuildInfoFile'] = tsbuildinfo_name
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

    if not opts.test_only and not opts.verify_lib_check:
        # We are currently still loading devtools from out/<NAME>/resources/inspector
        # but we generate our sources in out/<NAME>/gen/ (which is the proper location).
        # For now, copy paste the build output back into resources/inspector to keep
        # DevTools loading properly
        copy_all_typescript_sources(sources, path.dirname(tsconfig_output_location))

    return 0


def copy_all_typescript_sources(sources, output_directory):
    front_end_output_location = output_directory
    while path.basename(front_end_output_location) != 'front_end':
        front_end_output_location = path.dirname(front_end_output_location)
    for src in sources:
        if src.endswith('.ts') or src.endswith('_bridge.js'):
            generated_javascript_location = path.join(output_directory, path.basename(src).replace('.ts', '.js'))

            relative_path_from_generated_front_end_folder = path.relpath(generated_javascript_location, front_end_output_location)

            dest = path.join(RESOURCES_INSPECTOR_PATH, relative_path_from_generated_front_end_folder)

            if path.exists(dest):
                os.remove(dest)
            # Make sure that the directory actually exists, otherwise
            # the copy action will throw an error
            dest_directory = path.dirname(dest)
            try:
                os.makedirs(dest_directory)
            except OSError as exc:  # Python >2.5
                if exc.errno == errno.EEXIST and os.path.isdir(dest_directory):
                    pass
                else:
                    raise
            shutil.copy(generated_javascript_location, dest)


if __name__ == '__main__':
    sys.exit(main())
