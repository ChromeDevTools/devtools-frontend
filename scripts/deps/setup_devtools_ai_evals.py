#!/usr/bin/env python3
#
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Sets up DevTools AI Evals test dependencies during gclient sync.
"""

import sys


def main():
    print(
        'Syncing AI Evals tests... (Turn off with `"checkout_devtools_ai_evals": False` in .gclient)'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
