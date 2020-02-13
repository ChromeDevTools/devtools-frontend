#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
DEPRECATED: Use run_test_suite.py --test-suite=e2e instead.
"""

import sys
import run_test_suite

if __name__ == '__main__':
    sys.argv.append('--test-suite=e2e')
    run_test_suite.run_test()
