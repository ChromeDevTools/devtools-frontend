#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Collects the UIStrings of the DevTools sources into en-US.ctc.json.

This is the `collect-strings` script of package.json, which the Translation
Console export runs. It runs third_party/i18n/collect-strings.js on front_end
and on the sources that the build generates, which the checkout does not
contain: Deprecation.ts (see front_end/generated/BUILD.gn) is generated into a
temporary directory laid out like front_end, so that its UIStrings get the
message keys of the build, `generated/Deprecation.ts | <name>`, and the
directory is removed afterwards.
"""

import argparse
import os
import subprocess
import sys
import tempfile

SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(SCRIPTS_DIR)

sys.path.append(os.path.join(SCRIPTS_DIR, 'build'))
import generate_deprecations  # pylint: disable=wrong-import-position

NODE_PY = os.path.join('third_party', 'node', 'node.py')
COLLECT_STRINGS_JS = os.path.join('third_party', 'i18n', 'collect-strings.js')
# The copy of Blink's deprecation.json5 that scripts/deps/roll_deps.py keeps in
# this repository. The build reads the one under devtools_chromium_deps_root,
# which is this file in a standalone checkout and Chromium's own, possibly
# newer, copy in a Chromium checkout.
DEPRECATION_JSON5 = os.path.join('third_party', 'blink', 'renderer', 'core',
                                 'frame', 'deprecation', 'deprecation.json5')


def run_node(script, args, root):
    """Runs the node script at `script` from `root`, like package.json does.

    Raises subprocess.CalledProcessError when the script fails.
    """
    command = [
        sys.executable,
        os.path.join(root, NODE_PY),
        '--output',
        os.path.join(root, script),
    ] + args
    subprocess.check_call(command, cwd=root)


def generate_sources(generated_root, root):
    """Generates the sources with UIStrings that the build generates.

    They are written to `generated_root` at their paths relative to front_end.
    """
    generate_deprecations.main([
        '--input',
        os.path.join(root, DEPRECATION_JSON5),
        '--output',
        os.path.join(generated_root, 'generated', 'Deprecation.ts'),
    ])


def collect_strings(root):
    """Collects the UIStrings of the checkout at `root` into en-US.ctc.json."""
    with tempfile.TemporaryDirectory(
            prefix='devtools-generated-') as generated_root:
        generate_sources(generated_root, root)
        run_node(COLLECT_STRINGS_JS, ['front_end', generated_root], root)


def main(argv=None, root=REPO_ROOT):
    """Collects the strings and returns an exit code."""
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.parse_args(argv)
    try:
        collect_strings(root)
    except subprocess.CalledProcessError as error:
        # node.py has reported the failure.
        return error.returncode
    return 0


if __name__ == '__main__':
    sys.exit(main())
