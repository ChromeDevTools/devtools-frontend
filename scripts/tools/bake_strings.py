#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Bakes the translations of the Translation Console into the locale files.

This is the `bake-strings` script of package.json, which the Translation
Console import runs. It collects the UIStrings of the current sources into
en-US.ctc.json first (see collect_strings.py), as bake-strings.js bakes only
the strings in there into the <locale>.json files of
front_end/core/i18n/locales.
"""

import argparse
import os
import subprocess
import sys

import collect_strings

BAKE_STRINGS_JS = os.path.join('third_party', 'i18n', 'bake-strings.js')
LOCALES_DIR = os.path.join('front_end', 'core', 'i18n', 'locales')


def bake_strings(root):
    """Collects the UIStrings of the checkout at `root` and bakes its locales."""
    collect_strings.collect_strings(root)
    collect_strings.run_node(BAKE_STRINGS_JS, [LOCALES_DIR], root)


def main(argv=None, root=collect_strings.REPO_ROOT):
    """Bakes the strings and returns an exit code."""
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.parse_args(argv)
    try:
        bake_strings(root)
    except subprocess.CalledProcessError as error:
        # node.py has reported the failure.
        return error.returncode
    return 0


if __name__ == '__main__':
    sys.exit(main())
