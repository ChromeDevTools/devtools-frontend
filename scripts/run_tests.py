#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import re
import subprocess
import sys

import local_node

is_cygwin = sys.platform == "cygwin"
chrome_binary = None

if len(sys.argv) >= 2:
    chrome_binary = re.sub(r"^\-\-chrome-binary=(.*)", "\\1", sys.argv[1])
    is_executable = os.path.exists(chrome_binary) and os.path.isfile(chrome_binary) and os.access(chrome_binary, os.X_OK)
    if not is_executable:
        print("Unable to find a Chrome binary at \"%s\"" % chrome_binary)
        sys.exit(1)


def popen(arguments, cwd=None, env=None):
    return subprocess.Popen(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = popen(["cygpath", "-w", filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace("\\", "\\\\")


scripts_path = os.path.dirname(os.path.abspath(__file__))
devtools_path = os.path.dirname(scripts_path)

print("Running tests with Karma...")
if (chrome_binary is not None):
    print("Using custom Chrome Binary (%s)\n" % chrome_binary)
else:
    print("Using system Chrome")


def run_tests():
    karma_errors_found = False

    karmaconfig_path = os.path.join(devtools_path, "karma.conf.js")
    exec_command = [local_node.node_path(), local_node.karma_path(), "start", to_platform_path_exact(karmaconfig_path)]

    env = {'NODE_PATH': local_node.node_modules_path()}
    if (chrome_binary is not None):
        env['CHROME_BIN'] = chrome_binary

    karma_proc = popen(exec_command, cwd=devtools_path, env=env)

    (karma_proc_out, _) = karma_proc.communicate()
    if karma_proc.returncode != 0:
        karma_errors_found = True
    else:
        print("Karma exited successfully")

    print(karma_proc_out)
    return karma_errors_found


errors_found = run_tests()

if errors_found:
    print("ERRORS DETECTED")
    sys.exit(1)
