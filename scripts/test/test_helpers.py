# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Helpers for running unit, e2e, and screenshot tests.
"""

import os
import sys
from subprocess import Popen
import signal

# Add the scripts path, so that we can import the devtools_paths
scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

is_cygwin = sys.platform == 'cygwin'

def check_chrome_binary(chrome_binary):
    return os.path.exists(chrome_binary) and os.path.isfile(chrome_binary) and os.access(chrome_binary, os.X_OK)


def popen(arguments, cwd=devtools_paths.devtools_root_path(), env=os.environ.copy()):
    process = Popen(arguments, cwd=cwd, env=env)
    def handle_signal(signum, frame):
        print('\nSending signal (%i) to process' % signum)
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


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = popen(['cygpath', '-w', filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace('\\', '\\\\')
