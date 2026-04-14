#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import webbrowser
import argparse
import os
import devtools_paths

parser = argparse.ArgumentParser()
parser.add_argument('path')
parser.add_argument('old_file')
parser.add_argument('new_file')
options = parser.parse_args()

webbrowser.register(
    'cft', None,
    webbrowser.BackgroundBrowser(
        devtools_paths.downloaded_chrome_binary_path()))

webbrowser.get('cft').open(
    "file://" +
    os.path.join(os.path.dirname(__file__), 'test', 'screenshots.html') +
    f'?path={options.path}&old={os.path.abspath(options.old_file)}&new={os.path.abspath(options.new_file)}'
)
input("Press Enter to exit...")
