#!/usr/bin/env python3
# Copyright 2023 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""The purpose of this CLI tool is to help you manage changes to screenshots in
 Interaction tests across multiple platforms.

For more information, see test/interactions/README.md.

If you've made changes that impact the screenshots, you'll need to update them
for all supported platforms. Assuming you've committed your changes and
uploaded the CL, you'll need to trigger a dry run in Gerrit or execute the
command:
\x1b[32m git cl try \x1b[0m

After waiting for the dry run to complete, you can execute the command:
\x1b[32m update_goldens_v2.py \x1b[0m

Any failing Interaction test will generate updated screenshots, which will be
downloaded and applied to your local change. Inspect the status of your working
copy for any such screenshot updates. If you have new screenshots and they look
as expected, add, commit, and upload the changes. If you repeat the steps above
without making any additional changes to the code, you should not have any more
screenshot tests failing.
"""

import argparse
import subprocess
import sys

from update_goldens import ProjectConfig, update


def main(project_config, *args):
    parser = build_parser()
    options = parser.parse_args(*args)
    update(project_config, options)


def build_parser():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter, epilog=__doc__)

    parser.add_argument('--wait-sec', type=int,
        help='Wait and retry update every specified number of seconds. ' \
            'Minimum value is 30s to avoid overwhelming Gerrit.')
    parser.set_defaults(func=update)
    parser.add_argument('--verbose',
                        action='store_true',
                        help='Show more debugging info')

    #Deprecated options. These are no longer used, but are kept here
    #to avoid breaking existing scripts."""
    parser.add_argument('--patchset',
                        help='Deprecated. Not used by this tool.')
    parser.add_argument('--ignore-failed',
                        help='Deprecated. Not used by this tool.')
    parser.add_argument('--retry', help='Deprecated. Not used by this tool.')

    return parser


if __name__ == '__main__':
    main(
        ProjectConfig(platforms=['linux', 'mac', 'win64'],
                      builder_prefix='dtf',
                      ignore_failed_builders=True), sys.argv[1:])
