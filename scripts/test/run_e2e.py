#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run boot perf test on a pre-built chrome or one specified via --chrome-binary.
"""

import argparse
import os
import platform
import re
import subprocess
import sys
import signal

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

import devtools_paths

is_cygwin = sys.platform == 'cygwin'


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Run boot perf test')
    parser.add_argument('--runs', help='Number of runs', type=int)
    parser.add_argument('--chrome-binary', dest='chrome_binary', help='path to Chromium binary')
    return parser.parse_args(cli_args)


def check_chrome_binary(chrome_binary):
    return os.path.exists(chrome_binary) and os.path.isfile(chrome_binary) and os.access(chrome_binary, os.X_OK)


def popen(arguments, cwd=None, env=None, capture=False):
    process = subprocess.Popen(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    if not capture:
        return process

    def handle_signal(signum, frame):
        print 'Sending signal (%i) to process' % signum
        process.send_signal(signum)
        process.terminate()

    # Propagate sigterm / int to the child process.
    original_sigint = signal.getsignal(signal.SIGINT)
    original_sigterm = signal.getsignal(signal.SIGTERM)
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    for line in iter(process.stdout.readline, ''):
        sys.stdout.write(line)
        if process.returncode == 0:
            sys.stdout.write('done')

    # Restore the original sigterm / int handlers.
    signal.signal(signal.SIGINT, original_sigint)
    signal.signal(signal.SIGTERM, original_sigterm)

    return process


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = popen(['cygpath', '-w', filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace('\\', '\\\\')


def compile_typescript_test_files():
    tsc_compile_errors_found = False
    cwd = devtools_paths.devtools_root_path()
    env = os.environ.copy()
    shared_path = os.path.join(cwd, 'test', 'shared')
    e2e_test_path = os.path.join(cwd, 'test', 'e2e')

    # Compile shared code, e.g. helper and runner.
    print("Compiling shared TypeScript")
    exec_command = [devtools_paths.node_path(), devtools_paths.typescript_compiler_path(), '-p', shared_path]
    tsc_compile_proc = popen(exec_command, cwd=cwd, env=env, capture=True)
    tsc_compile_proc.communicate()
    if tsc_compile_proc.returncode != 0:
        tsc_compile_errors_found = True

    # Compile e2e tests, e.g. helper and runner.
    print("Compiling e2e TypeScript")
    exec_command = [devtools_paths.node_path(), devtools_paths.typescript_compiler_path(), '-p', e2e_test_path]
    tsc_compile_proc = popen(exec_command, cwd=cwd, env=env, capture=True)
    tsc_compile_proc.communicate()
    if tsc_compile_proc.returncode != 0:
        tsc_compile_errors_found = True

    return tsc_compile_errors_found


def run_e2e_test(chrome_binary):
    e2e_errors_found = False
    cwd = devtools_paths.devtools_root_path()
    e2e_test_path = os.path.join(cwd, 'test', 'shared', 'runner.js')
    e2e_test_list = os.path.join(cwd, 'test', 'e2e', 'test-list.js')
    exec_command = [devtools_paths.node_path(), e2e_test_path]

    env = os.environ.copy()
    env['CHROME_BIN'] = chrome_binary
    env['TEST_LIST'] = e2e_test_list

    e2e_proc = popen(exec_command, cwd=cwd, env=env, capture=True)
    e2e_proc.communicate()
    if e2e_proc.returncode != 0:
        e2e_errors_found = True

    return e2e_errors_found


def main():
    OPTIONS = parse_options(sys.argv[1:])
    is_cygwin = sys.platform == 'cygwin'
    chrome_binary = None

    # Default to the downloaded / pinned Chromium binary
    downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path()
    if check_chrome_binary(downloaded_chrome_binary):
        chrome_binary = downloaded_chrome_binary

    # Override with the arg value if provided.
    if OPTIONS.chrome_binary:
        chrome_binary = OPTIONS.chrome_binary
        if not check_chrome_binary(chrome_binary):
            print('Unable to find a Chrome binary at \'%s\'' % chrome_binary)
            sys.exit(1)

    if (chrome_binary is None):
        print('Unable to run, no Chrome binary provided')
        sys.exit(1)

    print('Using Chromium binary (%s)\n' % chrome_binary)

    errors_found = False
    try:
        errors_found = compile_typescript_test_files()
        if (errors_found):
            raise Exception('Typescript failed to compile')
        errors_found = run_e2e_test(chrome_binary)
    except Exception as err:
        print(err)

    if errors_found:
        print('ERRORS DETECTED')
        sys.exit(1)


if __name__ == '__main__':
    main()
