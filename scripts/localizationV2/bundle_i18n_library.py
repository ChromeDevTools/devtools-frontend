# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import optparse
import os
import subprocess
import sys

try:
    original_sys_path = sys.path
    sys.path = sys.path + [
        os.path.join(os.path.dirname(os.path.realpath(__file__)), '..')
    ]
    import devtools_paths
finally:
    sys.path = original_sys_path

_HERE_PATH = os.path.abspath(os.path.dirname(__file__))
_JS_SCRIPT_PATH = os.path.join(_HERE_PATH, 'buildi18nBundle.js')

_NODE_PATH = devtools_paths.node_path()


def main():
    parser = optparse.OptionParser(description=__doc__)
    parser.add_option(
        '--output_path',
        action='store',
        help='The root directory where the library will be bundled.')
    parser.add_option('--i18n_path',
                      action='store',
                      help='The path to the i18n library.')
    options, _ = parser.parse_args()

    if not options.output_path:
        parser.error('--output_path was not specified.')

    if not options.i18n_path:
        parser.error('--i18n_path was not specified.')

    cmd_parts = [
        _NODE_PATH, _JS_SCRIPT_PATH, '--output_path',
        os.path.abspath(options.output_path), '--i18n_path',
        os.path.abspath(options.i18n_path), '--minify'
    ]
    process = subprocess.Popen(cmd_parts,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    out, _ = process.communicate()
    if process.returncode != 0:
        return out


if __name__ == '__main__':
    sys.exit(main())
