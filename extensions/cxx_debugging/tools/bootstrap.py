#!/usr/bin/env python3
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys

CMAKE_DEFAULTS = [
    '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON', '-GNinja',
    '-DLLVM_DEFAULT_TARGET_TRIPLE=wasm32-unknown-unknown',
    '-DLLVM_ENABLE_ZLIB=OFF', '-DLLVM_ENABLE_TERMINFO=OFF',
    '-DLLDB_ENABLE_CURSES=OFF', '-DLLDB_ENABLE_LIBXML2=OFF',
    '-DLLDB_ENABLE_LZMA=OFF'
]


def devtools_dir(source_dir):
    return os.path.dirname(os.path.dirname(source_dir))


def node_path(source_dir):
    return os.path.join(
        devtools_dir(source_dir), 'third_party', 'node', *{
            'Darwin': ('mac', 'node-darwin-x64', 'bin'),
            'Linux': ('linux', 'node-linux-x64', 'bin'),
            'Windows': ('win', ),
        }[platform.system()])


def is_windows():
    return sys.platform == 'cygwin' or sys.platform.startswith('win')


def exec_extension():
    return ".exe" if is_windows() else ""


def get_gomacc(OPTIONS):
    if OPTIONS.no_goma:
        return None
    if OPTIONS.goma:
        return OPTIONS.goma
    else:
        goma_ctl = shutil.which('goma_ctl')
        if goma_ctl:
            depot_tools_dir = os.path.dirname(goma_ctl)
            gomacc = os.path.join(depot_tools_dir, '.cipd_bin', 'gomacc')
            return gomacc
    return None


def call(cmd, verbose=False, **kwargs):
    if verbose:
        sys.stderr.write("Running '{}' ({})\n".format(
            ' '.join(cmd),
            ', '.join('{}={}'.format(k, v) for k, v in kwargs.items())))
    subprocess.check_call(cmd, **kwargs)


def stage1(sysroot_dir, source_dir, OPTIONS):
    sys.stdout.write('Building Stage 1.\n')
    binary_dir = os.path.abspath(
        os.path.join(OPTIONS.build_dir, 'DevTools_CXX_Debugging.stage1'))
    if not os.path.exists(binary_dir):
        os.makedirs(binary_dir)

    cmake_settings = {
        'build_shared': 'OFF' if OPTIONS.static else 'ON',
    }
    cmake_args = [
        OPTIONS.cmake,
        OPTIONS.extension_source,
        *CMAKE_DEFAULTS,
        '-DBUILD_SHARED_LIBS={build_shared}'.format(**cmake_settings),
        '-DCMAKE_BUILD_TYPE=Release',
    ]
    if not OPTIONS.no_sysroot:
        cmake_args.extend(('-DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=ONLY',
                           '-DCMAKE_SYSROOT={}'.format(sysroot_dir)))

    if OPTIONS.cc:
        cmake_args.append('-DCMAKE_C_COMPILER={}'.format(OPTIONS.cc))
    if OPTIONS.cxx:
        cmake_args.append('-DCMAKE_CXX_COMPILER={}'.format(OPTIONS.cxx))
    gomacc = get_gomacc(OPTIONS)
    if gomacc:
        cmake_args.extend(('-DCMAKE_CXX_COMPILER_LAUNCHER={}'.format(gomacc),
                           '-DCMAKE_C_COMPILER_LAUNCHER={}'.format(gomacc)))

    maybe_cmake(binary_dir, cmake_args, OPTIONS.verbose)

    autoninja = shutil.which('autoninja')
    call([
        autoninja, 'lldb-tblgen', 'clang-tblgen', 'llvm-tblgen', 'llvm-dwp',
        'llvm-mc'
    ],
         verbose=OPTIONS.verbose,
         cwd=binary_dir)
    return binary_dir


def stage2(source_dir, stage1_dir, OPTIONS):
    sys.stdout.write('Building Stage 2.\n')
    llvm_tools_dir = os.path.abspath(
        os.path.join(stage1_dir, 'third_party', 'llvm', 'src', 'llvm', 'bin'))
    emcc = os.path.join(devtools_dir(source_dir), 'third_party',
                        'emscripten-releases', 'install', 'emscripten', 'emcc')

    binary_dir = os.path.abspath(
        os.path.join(OPTIONS.build_dir, 'DevTools_CXX_Debugging.stage2'))
    if not os.path.exists(binary_dir):
        os.makedirs(binary_dir)

    cmake_settings = {
        'toolchain_file':
        os.path.join(os.path.dirname(emcc), 'cmake', 'Modules', 'Platform',
                     'Emscripten.cmake'),
        'llvm_dwp':
        os.path.join(llvm_tools_dir, 'llvm-dwp' + exec_extension()),
        'llvm_tblgen':
        os.path.join(llvm_tools_dir, 'llvm-tblgen' + exec_extension()),
        'clang_tblgen':
        os.path.join(llvm_tools_dir, 'clang-tblgen' + exec_extension()),
        'lldb_tblgen':
        os.path.join(llvm_tools_dir, 'lldb-tblgen' + exec_extension()),
        'build_type':
        _build_type(OPTIONS),
    }
    cmake_args = [
        OPTIONS.cmake, OPTIONS.extension_source, *CMAKE_DEFAULTS,
        '-DCMAKE_CXX_FLAGS_RELWITHDEBINFO=-O1 -g -DNDEBUG',
        '-DCMAKE_C_FLAGS_RELWITHDEBINFO=-O1 -g -DNDEBUG',
        '-DCMAKE_EXE_LINKER_FLAGS_RELWITHDEBINFO=-O1 -g -DNDEBUG -gseparate-dwarf',
        '-DCMAKE_CXX_FLAGS_DEBUG=-O0 -g -DNDEBUG',
        '-DCMAKE_EXE_LINKER_FLAGS_DEBUG=-O0 -g -gseparate-dwarf',
        '-DHAVE_POSIX_REGEX=0', '-Derrc_exit_code=0',
        '-Derrc_exit_code__TRYRUN_OUTPUT=0',
        '-DCMAKE_BUILD_TYPE={build_type}'.format(**cmake_settings),
        '-DCMAKE_TOOLCHAIN_FILE={toolchain_file}'.format(**cmake_settings),
        '-DLLVM_DWP={llvm_dwp}'.format(**cmake_settings),
        '-DLLVM_TABLEGEN={llvm_tblgen}'.format(**cmake_settings),
        '-DCLANG_TABLEGEN={clang_tblgen}'.format(**cmake_settings),
        '-DLLDB_TABLEGEN={lldb_tblgen}'.format(**cmake_settings)
    ]
    if is_windows():
        cmake_args.append('-DLLVM_HOST_TRIPLE=x86_64')

    if OPTIONS.split_dwarf:
        cmake_args.extend([
            '-DCXX_DEBUGGING_USE_SPLIT_DWARF=ON',
            '-DLLVM_USE_SPLIT_DWARF=ON',
        ])
    else:
        cmake_args.extend([
            '-DCXX_DEBUGGING_USE_SPLIT_DWARF=OFF',
            '-DLLVM_USE_SPLIT_DWARF=OFF',
        ])

    if OPTIONS.gdwarf_5:
        cmake_args.extend(['-DCXX_DEBUGGING_ENABLE_DWARF5=ON'])
    else:
        cmake_args.extend(['-DCXX_DEBUGGING_ENABLE_DWARF5=OFF'])

    if OPTIONS.pubnames:
        cmake_args.extend(['-DCXX_DEBUGGING_ENABLE_PUBNAMES=ON'])
    else:
        cmake_args.extend(['-DCXX_DEBUGGING_ENABLE_PUBNAMES=OFF'])

    if OPTIONS.skip_dwp:
        cmake_args.extend(['-DCXX_DEBUGGING_DWO_ONLY=ON'])
    else:
        cmake_args.extend(['-DCXX_DEBUGGING_DWO_ONLY=OFF'])

    if OPTIONS.release_version or OPTIONS.release:
        cmake_args.extend([
            '-DCXX_DEBUGGING_BUILD_REVISION={0}'.format(OPTIONS.release_version
                                                        or 0)
        ])
        cmake_args.extend([
            '-DCXX_DEBUGGING_BUILD_PATCH={0}'.format(OPTIONS.patch_level or 0)
        ])

    if OPTIONS.sanitize:
        cmake_args.append('-DCXX_DEBUGGING_USE_SANITIZERS=ON')
    else:
        cmake_args.append('-DCXX_DEBUGGING_USE_SANITIZERS=OFF')

    maybe_cmake(binary_dir, cmake_args, OPTIONS.verbose)

    gomacc = get_gomacc(OPTIONS)
    num_cores = os.cpu_count()
    env = os.environ.copy()
    if gomacc:
        env['EM_COMPILER_WRAPPER'] = gomacc
        # autoninja does not recognize the environment variable, so set the
        # jobs manually
        num_cores *= int(os.environ.get('NINJA_CORE_MULTIPLIER', '40'))
    else:
        num_cores += 2

    if not OPTIONS.no_check:
        call(['ninja', '-j%d' % num_cores, 'all', 'check-extension'],
             verbose=OPTIONS.verbose,
             cwd=binary_dir,
             env=env)
    else:
        call(['ninja', '-j%d' % num_cores, 'all'],
             verbose=OPTIONS.verbose,
             cwd=binary_dir,
             env=env)
    return binary_dir


def maybe_cmake(binary_dir, cmake_args, verbose):
    # Re-run `cmake` when the build.ninja doesn't exist, or when cmake args have changed
    build_ninja = os.path.abspath(os.path.join(binary_dir, 'build.ninja'))
    cmake_args_file = os.path.abspath(
        os.path.join(binary_dir, 'cmake.args.json'))
    if os.path.exists(build_ninja) and os.path.exists(cmake_args_file):
        with open(cmake_args_file, 'r') as f:
            try:
                prev_args = json.load(f)
                if prev_args == cmake_args:
                    # Nothing changed; cmake unnecessary
                    return
            except json.JSONDecodeError:
                pass  # Ignore invalid json file
    sys.stdout.write('cmake args have changed.\n')
    call(cmake_args, verbose=verbose, cwd=binary_dir)
    with open(cmake_args_file, 'w') as f:
        json.dump(cmake_args, f)


def _build_type(options):
    if options.release or options.release_version:
        return 'Release'
    elif options.debug:
        return 'Debug'
    else:
        return 'RelWithDebInfo'


def script_main(args):
    source_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_dir = os.path.dirname(os.path.dirname(source_dir))
    third_party = os.path.join(repo_dir, 'third_party')
    clang_dir = os.path.join(third_party, 'emscripten-releases', 'install',
                             'bin')
    cmake_dir = os.path.join(third_party, 'cmake', 'bin')
    sysroot_dir = find_sysroot(repo_dir)

    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('-cmake',
                        default=shutil.which('cmake', path=cmake_dir),
                        help='Path to the cmake configure tool.')
    parser.add_argument('-goma',
                        default=shutil.which('gomacc'),
                        help='Path to the goma compiler launcher (gomacc).')
    parser.add_argument('-cc',
                        default=shutil.which('clang', path=clang_dir),
                        help='The C compiler.')
    parser.add_argument('-cxx',
                        default=shutil.which('clang++', path=clang_dir),
                        help='The C++ compiler.')
    parser.add_argument('-extension-source',
                        default=source_dir,
                        help='Path to alternate repo for source.')
    parser.add_argument('-check', action='store_true')  # TODO(pfaffe) remove
    parser.add_argument('-verbose', action='store_true')
    parser.add_argument('-stage1', help='Path to a pre-built stage 1')
    parser.add_argument('-static',
                        action='store_true',
                        default=True,
                        help='Link the first stage statically.')
    parser.add_argument('-dynamic',
                        action='store_false',
                        default=True,
                        dest='static',
                        help='Link the first stage dynamically.')
    parser.add_argument('-sysroot', default='')  # TODO(pfaffe) remove
    parser.add_argument('-no-goma',
                        action='store_true',
                        help='Build without goma.')
    parser.add_argument('-no-sysroot',
                        action='store_true',
                        help='Disable sysroot.')
    parser.add_argument('-no-check',
                        action='store_true',
                        help='Skip running tests.')
    parser.add_argument('-infra',
                        action='store_true',
                        help='Configure the build for the buildbots.')
    parser.add_argument('-debug',
                        action='store_true',
                        help='Build a debug version.')
    parser.add_argument(
        '-release',
        action='store_true',
        help='Build a release instead of a debug version. (deprecated)')
    parser.add_argument(
        '-release-version',
        type=int,
        default=None,
        help='Provide a version number for building a release,'
        'instead of building a debug version. (deprecates -release)')
    parser.add_argument(
        '-patch-level',
        type=int,
        default=0,
        help='Provide a version patch level for building a release,'
        'instead of building a debug version. (deprecates -release)')
    parser.add_argument('-split-dwarf',
                        action='store_true',
                        help='Build with split-dwarf support.')
    parser.add_argument('-pubnames',
                        action='store_true',
                        help='Build with split-dwarf support.')
    parser.add_argument('-gdwarf-5',
                        action='store_true',
                        help='Build with DWARF5 debug info.')
    parser.add_argument(
        '-skip-dwp',
        action='store_true',
        help='In combination with -split-dwarf, builds dwos but not the dwp.')
    parser.add_argument('-sanitize',
                        action='store_true',
                        help='Enable sanitizers')
    parser.add_argument('build_dir')
    OPTIONS = parser.parse_args(args)

    if OPTIONS.infra:
        OPTIONS.static = True
        OPTIONS.verbose = True
        if OPTIONS.no_check:
            sys.stderr.write('-infra overrides -no-check')
        OPTIONS.no_check = False
        if OPTIONS.no_sysroot:
            sys.stderr.write('-infra overrides -no-sysroot')
        OPTIONS.no_sysroot = False

    if OPTIONS.sysroot:
        sys.stderr.write('The -sysroot option is deprecated and has no effect')
    if OPTIONS.check:
        sys.stderr.write('The -check option is deprecated and has no effect')

    if OPTIONS.stage1:
        stage1_dir = OPTIONS.stage1
    else:
        stage1_dir = stage1(sysroot_dir, source_dir, OPTIONS)
    stage2(source_dir, stage1_dir, OPTIONS)


def find_sysroot(repo_dir):
    build_linux = os.path.join(repo_dir, 'build', 'linux')
    sysroots = [
        os.path.join(build_linux, f) for f in os.listdir(build_linux)
        if os.path.isdir(os.path.join(build_linux, f))
        and re.match('debian_.*_amd64-sysroot', f)
    ]
    assert len(sysroots) >= 1, 'No sysroot found!'
    assert len(sysroots) <= 1, 'Too many sysroots found!'
    return sysroots[0]


if __name__ == '__main__':
    script_main(sys.argv[1:])
