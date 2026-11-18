#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Thin Python wrapper around scripts/protocol_typescript/protocol_dts_generator.ts.

generated_ts() in scripts/build/ninja/generated_ts.gni runs Python generators;
this wrapper runs protocol_dts_generator.ts through the node.py in the
directory passed as `--node-dir`, with all other CLI arguments forwarded.

The build passes `//third_party/node`: the DEPS checkout in a standalone build
and Chromium's own copy in a Chromium build. This way we don't have to know
where DevTools is located inside of the Chromium checkout.
"""

import argparse
import os
import sys

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

GENERATOR = os.path.join(REPO_DIR, 'scripts', 'protocol_typescript',
                         'protocol_dts_generator.ts')


def main(argv):
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument('--node-dir',
                        default=os.path.join(REPO_DIR, 'third_party', 'node'),
                        help='Directory that contains node.py.')
    options, generator_args = parser.parse_known_args(argv)

    sys.path.append(os.path.abspath(options.node_dir))
    import node  # pylint: disable=import-outside-toplevel,import-error

    node.RunNode([GENERATOR] + generator_args)


if __name__ == '__main__':
    main(sys.argv[1:])
