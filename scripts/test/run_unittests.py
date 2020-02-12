#!/usr/bin/env python
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run unit tests on a pinned version of chrome.
"""

import os
import platform
import re
from subprocess import Popen
import sys
import signal

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

is_cygwin = sys.platform == 'cygwin'

import devtools_paths


def check_chrome_binary(chrome_binary):
    return os.path.exists(chrome_binary) and os.path.isfile(chrome_binary) and os.access(chrome_binary, os.X_OK)


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = Popen(['cygpath', '-w', filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace('\\', '\\\\')


def popen(arguments, cwd=devtools_paths.devtools_root_path(), env=os.environ.copy()):
    process = Popen(arguments, cwd=cwd, env=env, shell=True)
    def handle_signal(signum, frame):
        print 'Sending signal (%i) to process' % signum
        process.send_signal(signum)
        process.terminate()

    # Propagate sigterm / int to the child process.
    original_sigint = signal.getsignal(signal.SIGINT)
    original_sigterm = signal.getsignal(signal.SIGTERM)
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    process.communicate()

    # Restore the original sigterm / int handlers.
    signal.signal(signal.SIGINT, original_sigint)
    signal.signal(signal.SIGTERM, original_sigterm)

    return process.returncode


def run_tests(chrome_binary):
    cwd = devtools_paths.devtools_root_path()
    karmaconfig_path = os.path.join(cwd, 'karma.conf.js')

    exec_command = '%s %s start %s' % (devtools_paths.node_path(), devtools_paths.karma_path(), to_platform_path_exact(karmaconfig_path))

    env = os.environ.copy()
    env['NODE_PATH'] = devtools_paths.node_path()
    if (chrome_binary is not None):
        env['CHROME_BIN'] = chrome_binary

    exit_code = popen(exec_command, cwd=cwd, env=env)
    if exit_code == 1:
        return True

    return False


def main():
    chrome_binary = None

    # Default to the downloaded / pinned Chromium binary
    downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path()
    if check_chrome_binary(downloaded_chrome_binary):
        chrome_binary = downloaded_chrome_binary

    if (chrome_binary is None):
        print('Unable to run, no Chrome binary provided')
        sys.exit(1)

    print('Using Chromium binary (%s)\n' % chrome_binary)

    errors_found = run_tests(chrome_binary)
    if errors_found:
        print('ERRORS DETECTED')
        sys.exit(1)


if __name__ == '__main__':
    main()
