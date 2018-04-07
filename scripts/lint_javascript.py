#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os.path as path
import re
import subprocess
import sys

import local_node

files_to_lint = None

if len(sys.argv) >= 2:
    if sys.argv[1] == "--help":
        print("Usage: %s [file|dir|glob]*" % path.basename(sys.argv[0]))
        print
        print(" [file|dir|glob]*  Path or glob to run eslint on.")
        print("                   If absent, the entire frontend will be checked.")
        sys.exit(0)

    else:
        print("Linting only these files:\n %s" % sys.argv[1:])
        files_to_lint = sys.argv[1:]

is_cygwin = sys.platform == "cygwin"


def popen(arguments, cwd=None):
    return subprocess.Popen(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def to_platform_path(filepath):
    if not is_cygwin:
        return filepath
    return re.sub(r"^/cygdrive/(\w)", "\\1:", filepath)


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = popen(["cygpath", "-w", filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace("\\", "\\\\")


scripts_path = path.dirname(path.abspath(__file__))
devtools_path = path.dirname(scripts_path)
devtools_frontend_path = path.join(devtools_path, "front_end")

print("Linting JavaScript with eslint...\n")


def js_lint(files_list=None):
    eslint_errors_found = False

    if files_list is None:
        files_list = [devtools_frontend_path]
    files_list = [file_name for file_name in files_list if not file_name.endswith(".eslintrc.js")]

    eslintconfig_path = path.join(devtools_path, ".eslintrc.js")
    eslintignore_path = path.join(devtools_path, ".eslintignore")
    exec_command = [
        local_node.node_path(),
        local_node.eslint_path(),
        "--config",
        to_platform_path_exact(eslintconfig_path),
        "--ignore-path",
        to_platform_path_exact(eslintignore_path),
    ] + files_list

    eslint_proc = popen(exec_command, cwd=devtools_path)
    (eslint_proc_out, _) = eslint_proc.communicate()
    if eslint_proc.returncode != 0:
        eslint_errors_found = True
    else:
        print("eslint exited successfully")

    print(eslint_proc_out)
    return eslint_errors_found


errors_found = js_lint(files_to_lint)

if errors_found:
    print("ERRORS DETECTED")
    sys.exit(1)
