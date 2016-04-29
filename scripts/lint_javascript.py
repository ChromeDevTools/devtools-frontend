#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import os.path as path
import re
import subprocess
import sys

files_to_lint = None

if len(sys.argv) == 2:
    if sys.argv[1] == "--help":
        print("Usage: %s [file|dir|glob]*" % path.basename(sys.argv[0]))
        print
        print(" [file|dir|glob]*  Path or glob to run eslint on.")
        print("                   If absent, the entire frontend will be checked.")
        sys.exit(0)

    else:
        print "Linting only this path:\n %s" % sys.argv[1:]
        files_to_lint = sys.argv[1:]


is_cygwin = sys.platform == "cygwin"


def popen(arguments):
    return subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


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


# Based on http://stackoverflow.com/questions/377017/test-if-executable-exists-in-python.
def which(program):
    def is_exe(fpath):
        return path.isfile(fpath) and os.access(fpath, os.X_OK)

    fpath, fname = path.split(program)
    if fpath:
        if is_exe(program):
            return program
    else:
        for part in os.environ["PATH"].split(os.pathsep):
            part = part.strip("\"")
            exe_file = path.join(part, program)
            if is_exe(exe_file):
                return exe_file
    return None


print "Linting JavaScript with eslint...\n"


def js_lint(files_list=None):
    eslint_errors_found = False

    eslint_path = which("eslint")
    if not eslint_path:
        print "!! Skipping JavaScript linting because eslint is not installed."
        print "!!   npm install -g eslint"
        eslint_errors_found = False  # Linting is opt-in for now, so this is a soft failure
        return eslint_errors_found

    if files_list is None:
        files_list = [devtools_frontend_path]

    eslintconfig_path = path.join(devtools_path, "front_end/.eslintrc.js")
    eslintignore_path = path.join(devtools_path, "front_end/.eslintignore")
    exec_command = [
        eslint_path,
        "--config", to_platform_path_exact(eslintconfig_path),
        "--ignore-path", to_platform_path_exact(eslintignore_path),
        " ".join(files_list)
        ]

    eslint_proc = popen(exec_command)
    (eslint_proc_out, _) = eslint_proc.communicate()
    if eslint_proc.returncode != 0:
        eslint_errors_found = True
    else:
        print "eslint exited successfully"

    print eslint_proc_out


errors_found = js_lint(files_to_lint)

if errors_found:
    print "ERRORS DETECTED"
    sys.exit(1)
else:
    print "OK"
