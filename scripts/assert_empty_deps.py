#!/usr/bin/env python
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import sys
import json
import devtools_paths


def run_assert():
    assert_errors_found = False
    try:
        with open(devtools_paths.package_json_path(), 'r') as pkg_file:
            pkg = json.load(pkg_file)
            if 'dependencies' in pkg:
                print('dependencies property found in package.json')
                assert_errors_found = True
            if 'devDependencies' in pkg:
                print('devDependencies property found in package.json')
                assert_errors_found = True
    except ValueError:
        print('Unable to parse package.json')
        assert_errors_found = True
    except FileNotFoundError:
        print('Unable to find package.json')
        assert_errors_found = True

    return assert_errors_found


errors_found = run_assert()

if errors_found:
    print("ERRORS DETECTED")
    sys.exit(1)
