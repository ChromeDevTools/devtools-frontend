#!/usr/bin/env python
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run unit tests on a pinned version of chrome after automatically compiling the required files
"""

import argparse
import subprocess
import sys
from os import path

ROOT_DIRECTORY = path.join(path.dirname(path.abspath(__file__)), '..', '..')


def recompile(ninja_build_name, ninja_target_name):
    ninja_proc = subprocess.Popen(['autoninja', '-C', 'out/{}'.format(ninja_build_name), ninja_target_name], cwd=ROOT_DIRECTORY)

    ninja_proc.communicate()

    if ninja_proc.returncode != 0:
        sys.exit(ninja_proc.returncode)
