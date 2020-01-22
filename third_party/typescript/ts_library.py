# Copyright 2019 The Chromium Authors.  All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import argparse
import sys
import subprocess
import json
import os

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

ROOT_TS_CONFIG_LOCATION = path.join(_CURRENT_DIR, '..', '..', 'tsconfig.json')

GLOBAL_DEFS = path.join(_CURRENT_DIR, '..', '..', 'front_end', 'legacy', 'legacy-defs.d.ts')


def runTsc(tsconfig_location):
    process = subprocess.Popen([NODE_LOCATION, TSC_LOCATION, '-b', tsconfig_location],
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sources', nargs='*', required=True, help='List of TypeScript source files')
    parser.add_argument('-deps', '--deps', nargs='*', help='List of Ninja build dependencies')
    parser.add_argument('-dir', '--front_end_directory', required=True, help='Folder that contains source files')
    parser.add_argument('-b', '--tsconfig_output_location', required=True)
    opts = parser.parse_args()
    with open(ROOT_TS_CONFIG_LOCATION) as root_tsconfig:
        try:
            tsconfig = json.loads(root_tsconfig.read())
        except Exception as e:
            print('Encountered error while loading root tsconfig:')
            print(e)
            return 1
    tsconfig_output_location = path.join(os.getcwd(), opts.tsconfig_output_location)
    tsconfig['files'] = [path.join(os.getcwd(), src) for src in opts.sources] + [path.abspath(GLOBAL_DEFS)]
    if (opts.deps is not None):
        tsconfig['references'] = [{'path': src} for src in opts.deps]
    tsconfig['compilerOptions']['declaration'] = True
    tsconfig['compilerOptions']['composite'] = True
    tsconfig['compilerOptions']['rootDir'] = path.join(os.getcwd(), opts.front_end_directory)
    tsconfig['compilerOptions']['outDir'] = path.dirname(tsconfig_output_location)
    with open(tsconfig_output_location, 'w') as generated_tsconfig:
        try:
            json.dump(tsconfig, generated_tsconfig)
        except Exception as e:
            print('Encountered error while writing generated tsconfig in location %s:' % tsconfig_output_location)
            print(e)
            return 1
    found_errors, stderr = runTsc(tsconfig_location=tsconfig_output_location)
    if found_errors:
        print('')
        print('TypeScript compilation failed. Used tsconfig %s' % tsconfig_output_location)
        print('')
        print(stderr)
        print('')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
