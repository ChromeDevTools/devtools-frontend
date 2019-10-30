# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import optparse
import os
import subprocess
import sys

_HERE_PATH = os.path.abspath(os.path.dirname(__file__))
_JS_SCRIPT_PATH = os.path.join(_HERE_PATH, 'generate_devtools_ui_strings.js')
_SRC_PATH = os.path.normpath(os.path.join(_HERE_PATH, '..', '..', '..', '..', '..'))

sys.path.append(os.path.join(_SRC_PATH, 'third_party', 'node'))
# pylint: disable=wrong-import-position
import node  # pylint: disable=import-error
_NODE_PATH = node.GetBinaryPath()


def main():
    parser = optparse.OptionParser(description=__doc__)
    parser.add_option(
        '--root_gen_dir',
        action='store',
        metavar='ROOT_GEN_DIR',
        help='The root directory where the header and cc will be generated.')
    parser.add_option('--output_header', action='store', metavar='OUTPUT_HEADER', help='Generated output .h file for pairs of IDs')
    parser.add_option(
        '--output_cc',
        action='store',
        metavar='OUTPUT_CC',
        help='Generated output .cc file that contains pairs of {front-end string key, IDS_ key}')
    options, _ = parser.parse_args()

    if not options.root_gen_dir:
        parser.error('--root_gen_dir was not specified.')
    if not options.output_header:
        parser.error('--output_header was not specified.')
    if not options.output_header:
        parser.error('--output_cc was not specified.')

    cmd_parts = [
        _NODE_PATH, _JS_SCRIPT_PATH, '--root_gen_dir',
        os.path.abspath(options.root_gen_dir), '--output_header', options.output_header, '--output_cc', options.output_cc
    ]
    process = subprocess.Popen(cmd_parts, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, _ = process.communicate()
    if process.returncode != 0:
        return out


if __name__ == '__main__':
    sys.exit(main())
