#!/usr/bin/env vpython
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run the dark theme stylesheet generator.
"""

import os
import sys
import argparse
import subprocess

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths


def run_dark_mode_generator(file_path):
    chrome_binary = devtools_paths.downloaded_chrome_binary_path()

    exec_command = [
        devtools_paths.node_path(),
        'scripts/dark_mode/generate_dark_theme_sheet.js', chrome_binary,
        file_path
    ]
    process = subprocess.Popen(exec_command)
    process.communicate()


def main():
    parser = argparse.ArgumentParser(
        description='Run the dark theme stylesheet generator')
    parser.add_argument(
        '--file',
        '-f',
        dest='file',
        help='The CSS file to generate a dark mode variant from.')
    args = parser.parse_args(sys.argv[1:])

    run_dark_mode_generator(args.file)


if __name__ == '__main__':
    main()
