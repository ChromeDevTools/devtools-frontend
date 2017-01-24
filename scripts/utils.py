# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
from os import path
import sys


# Based on http://stackoverflow.com/questions/377017/test-if-executable-exists-in-python.
def which(program):

    def is_executable(fpath):
        return path.isfile(fpath) and os.access(fpath, os.X_OK)

    fpath, fname = path.split(program)
    if fpath:
        if is_executable(program):
            return program
        return None
    env_paths = os.environ["PATH"].split(os.pathsep)
    if sys.platform == "win32":
        env_paths = get_windows_path(env_paths)
    for part in env_paths:
        part = part.strip('\"')
        file = path.join(part, program)
        if is_executable(file):
            return file
        if sys.platform == "win32" and not file.endswith(".exe"):
            file_exe = file + ".exe"
            if is_executable(file_exe):
                return file_exe
    return None


# Use to find 64-bit programs (e.g. Java) when using 32-bit python in Windows
def get_windows_path(env_paths):
    new_env_paths = env_paths[:]
    for env_path in env_paths:
        env_path = env_path.lower()
        if "system32" in env_path:
            new_env_paths.append(env_path.replace("system32", "sysnative"))
    return new_env_paths
