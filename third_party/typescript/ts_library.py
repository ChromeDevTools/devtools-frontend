#!/usr/bin/env python3
# Copyright 2019 The Chromium Authors.  All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import argparse
import json
import logging
import os
import subprocess
import sys

from os import path
_CURRENT_DIR = path.join(path.dirname(__file__))

ROOT_DIRECTORY_OF_REPOSITORY = path.join(_CURRENT_DIR, '..', '..')
NODE_MODULES_DIRECTORY = path.join(ROOT_DIRECTORY_OF_REPOSITORY,
                                   'node_modules')
TSC_LOCATION = path.join(NODE_MODULES_DIRECTORY, 'typescript', 'bin', 'tsc')

try:
    old_sys_path = sys.path[:]
    sys.path.append(path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'scripts'))
    import devtools_paths
finally:
    sys.path = old_sys_path
NODE_LOCATION = devtools_paths.node_path()
ESBUILD_LOCATION = devtools_paths.esbuild_path()

BASE_TS_CONFIG_LOCATION = path.join(ROOT_DIRECTORY_OF_REPOSITORY, 'config',
                                    'typescript', 'tsconfig.base.json')
TYPES_NODE_MODULES_DIRECTORY = path.join(NODE_MODULES_DIRECTORY, '@types')
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
    # Types for W3C FileSystem API
    path.join(NODE_MODULES_DIRECTORY, '@types', 'filesystem', 'index.d.ts'),
]


logging.basicConfig(
    level=logging.DEBUG if os.environ.get('TSC_DEBUG') else logging.WARNING)


def runTsc(tsconfig_location):
    cmd = [NODE_LOCATION, TSC_LOCATION, '-p', tsconfig_location]
    logging.info("runTsc: %s", ' '.join(cmd))
    process = subprocess.Popen(cmd,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE,
                               universal_newlines=True)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


def runTscRemote(tsconfig_location, all_ts_files, rewrapper_binary,
                 rewrapper_cfg, rewrapper_exec_root, test_only):
    relative_ts_file_paths = [
        path.relpath(x, rewrapper_exec_root) for x in all_ts_files
    ]

    tsc_lib_directory = path.join(NODE_MODULES_DIRECTORY, 'typescript', 'lib')
    all_d_ts_files = [
        path.relpath(path.join(tsc_lib_directory, f), rewrapper_exec_root)
        for f in os.listdir(tsc_lib_directory) if f.endswith('.d.ts')
    ]

    if test_only:
        # TODO(crbug.com/1139220): Measure whats more performant:
        #     1) Just specify the `node_modules/@types` directory as an input and upload all files.
        #     2) Recursively walk `node_modules/@types` and collect all *.d.ts files and list them
        #        explicitly.
        all_d_ts_files.append(
            path.relpath(TYPES_NODE_MODULES_DIRECTORY, rewrapper_exec_root))

    relative_node_location = path.relpath(NODE_LOCATION, os.getcwd())
    relative_tsc_location = path.relpath(TSC_LOCATION, os.getcwd())
    relative_tsconfig_location = path.relpath(tsconfig_location, os.getcwd())
    relative_tsc_directory = path.relpath(
        path.join(NODE_MODULES_DIRECTORY, 'typescript'), rewrapper_exec_root)

    inputs = ','.join([
        relative_node_location,
        relative_tsc_location,
        path.join(relative_tsc_directory, 'lib', 'tsc.js'),
        path.relpath(tsconfig_location, os.getcwd()),
    ] + relative_ts_file_paths + all_d_ts_files)

    process = subprocess.Popen([
        rewrapper_binary, '-cfg', rewrapper_cfg, '-exec_root',
        rewrapper_exec_root, '-labels=type=tool', '-inputs', inputs,
        '-output_directories',
        path.relpath(path.dirname(tsconfig_location),
                     rewrapper_exec_root), '--', relative_node_location,
        relative_tsc_location, '-p', relative_tsconfig_location
    ],
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE,
                               universal_newlines=True)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


# To ensure that Ninja only rebuilds dependents when the actual content/public API of a TypeScript target changes,
# we need to make sure that the config only changes when it needs to. Therefore, if the content would be equivalent
# to what is already on disk, we don't write and allow Ninja to short-circuit if it can.
def maybe_update_tsconfig_file(tsconfig_output_location, tsconfig):
    old_contents = None
    if os.path.exists(tsconfig_output_location):
        with open(tsconfig_output_location, encoding="utf8") as fp:
            old_contents = fp.read()

    new_contents = json.dumps(tsconfig, sort_keys=True, indent=2)
    if old_contents is None or new_contents != old_contents:
        try:
            with open(tsconfig_output_location, 'w', encoding="utf8") as fp:
                fp.write(new_contents)
        except Exception as e:
            print(
                'Encountered error while writing generated tsconfig in location %s:'
                % tsconfig_output_location)
            print(e)
            return 1

    return 0


# Obtain the timestamps and original content of any previously generated TypeScript files, if any.
# This will be used later in `maybe_reset_timestamps_on_generated_files` to potentially reset
# file timestamps for Ninja.
def compute_previous_generated_file_metadata(sources,
                                             tsconfig_output_directory):
    gen_files = {}
    for src_fname in sources:
        for ext in ['.d.ts', '.js', '.js.map']:
            gen_fname = os.path.basename(src_fname.replace('.ts', ext))
            gen_path = os.path.join(tsconfig_output_directory, gen_fname)
            if os.path.exists(gen_path):
                mtime = os.stat(gen_path).st_mtime
                with open(gen_path, encoding="utf8") as fp:
                    contents = fp.read()
                gen_files[gen_fname] = (mtime, contents)

    return gen_files


# Ninja and TypeScript use different mechanism to determine whether a file is "new". TypeScript
# uses content-based file hashing, whereas Ninja uses file timestamps. Therefore, if we determine
# that `tsc` actually didn't generate new file contents, we reset the timestamp to what it was
# prior to invocation of `ts_library`. Then Ninja will determine nothing has changed and will
# not run dependents.
#
# This also means that if the public API of a target changes, it does run the immediate dependents
# of the target. However, if there is no functional change in the immediate dependents, the timestamps
# of the immediate dependent would be properly reset and any transitive dependents would not be rerun.
def maybe_reset_timestamps_on_generated_files(
        previously_generated_file_metadata, tsconfig_output_directory):
    for gen_fname in previously_generated_file_metadata:
        gen_path = os.path.join(tsconfig_output_directory, gen_fname)
        if os.path.exists(gen_path):
            old_mtime, old_contents = previously_generated_file_metadata[
                gen_fname]
            with open(gen_path, encoding="utf8") as fp:
                new_contents = fp.read()
            if new_contents == old_contents:
                os.utime(gen_path, (old_mtime, old_mtime))


# TypeScript generates `.tsbuildinfo` files for its incremental compilation. These files are used for
# the internal compiler "build" mode which can incrementally compile based on the declaration files of
# any project references. However, since GN "runs the world", GN determines when it should recompile
# certain targets.
#
# We don't include the `.tsbuildinfo` files in the GN `outputs`, since they have historically introduced
# non-determinism in the build system and we don't actually need them. However, a side-effect of not
# including these files in `outputs` is that `ninja -C out/Default -t clean` does not clean up these
# files. This could mean that after cleaning the out directory, a recompilation will start to break,
# since the TypeScript compiler looks at the `.tsbuildinfo` file and sees that none of the source files
# are changed, but it doesn't check that the output files are still there. Therefore, the output files
# are gone and any compilation of a project that depends on the outputs will start to fail.
#
# To avoid any problems, we should simply delete these files. We don't need any information from them,
# since GN already knows what to do. This should also provide a small performance improvement, as the
# TypeScript compiler now no longer need to check for up-to-dateness, which saves a couple of CPU cycles.
def remove_generated_tsbuildinfo_file(tsbuildinfo_output_location):
    # Should technically not happen, but let's code defensively here just in case
    if os.path.exists(tsbuildinfo_output_location):
        os.remove(tsbuildinfo_output_location)


def runEsbuild(opts):
    cmd = [
        ESBUILD_LOCATION,
        '--outdir=' + path.dirname(opts.tsconfig_output_location),
        '--log-level=warning',
        '--sourcemap',
    ]

    if opts.module == 'commonjs':
        cmd += ['--format=cjs']

    cmd += opts.sources

    logging.info('runEsbuild: %s', ' '.join(cmd))
    p = subprocess.run(cmd)
    return p.returncode


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sources', nargs='*', help='List of TypeScript source files')
    parser.add_argument('-deps', '--deps', nargs='*', help='List of Ninja build dependencies')
    parser.add_argument('-dir', '--front_end_directory', required=True, help='Folder that contains source files')
    parser.add_argument('-b', '--tsconfig_output_location', required=True)
    parser.add_argument('--test-only', action='store_true')
    parser.add_argument('--no-emit', action='store_true')
    parser.add_argument('--verify-lib-check', action='store_true')
    parser.add_argument('--is_web_worker', action='store_true')
    parser.add_argument('--module', required=False)
    parser.add_argument('--reset_timestamps', action='store_true')
    parser.add_argument('--use-remoteexec', action='store_true')
    parser.add_argument('--rewrapper-binary', required=False)
    parser.add_argument('--rewrapper-cfg', required=False)
    parser.add_argument('--rewrapper-exec-root', required=False)
    parser.add_argument('--use-esbuild', action='store_true')
    parser.set_defaults(test_only=False,
                        no_emit=False,
                        verify_lib_check=False,
                        reset_timestamps=False,
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
    runs_in_node_environment = opts.module == "commonjs"

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
    tsconfig['compilerOptions']['typeRoots'] = (
        opts.test_only or runs_in_node_environment
    ) and [
        get_relative_path_from_output_directory(TYPES_NODE_MODULES_DIRECTORY)
    ] or []
    if opts.test_only:
        tsconfig['compilerOptions']['types'] = [
            "mocha", "chai", "sinon", "karma-chai-sinon"
        ]
        if runs_in_node_environment:
            tsconfig['compilerOptions']['types'] += ["node"]
    if runs_in_node_environment:
        tsconfig['compilerOptions']['moduleResolution'] = 'node'
        tsconfig['compilerOptions'][
            'baseUrl'] = get_relative_path_from_output_directory(
                NODE_MODULES_DIRECTORY)
    if opts.no_emit:
        tsconfig['compilerOptions']['emitDeclarationOnly'] = True
    tsconfig['compilerOptions']['outDir'] = '.'
    tsconfig['compilerOptions']['tsBuildInfoFile'] = tsbuildinfo_name
    tsconfig['compilerOptions']['lib'] = ['esnext'] + (
        opts.is_web_worker and ['webworker', 'webworker.iterable']
        or ['dom', 'dom.iterable'])

    if maybe_update_tsconfig_file(tsconfig_output_location, tsconfig) == 1:
        return 1

    # If there are no sources to compile, we can bail out and don't call tsc.
    # That's because tsc can successfully compile dependents solely on the
    # the tsconfig.json
    if len(sources) == 0 and not opts.verify_lib_check:
        return 0

    if opts.use_esbuild:
        return runEsbuild(opts)

    previously_generated_file_metadata = compute_previous_generated_file_metadata(
        sources, tsconfig_output_directory)

    use_remote_execution = opts.use_remoteexec and (opts.deps is None
                                                    or len(opts.deps) == 0)
    if use_remote_execution:
        found_errors, stderr = runTscRemote(
            tsconfig_location=tsconfig_output_location,
            all_ts_files=all_ts_files,
            rewrapper_binary=opts.rewrapper_binary,
            rewrapper_cfg=opts.rewrapper_cfg,
            rewrapper_exec_root=opts.rewrapper_exec_root,
            test_only=opts.test_only)
    else:
        found_errors, stderr = runTsc(
            tsconfig_location=tsconfig_output_location)

    if opts.reset_timestamps:
        maybe_reset_timestamps_on_generated_files(
            previously_generated_file_metadata, tsconfig_output_directory)

    remove_generated_tsbuildinfo_file(
        path.join(tsconfig_output_directory, tsbuildinfo_name))

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
