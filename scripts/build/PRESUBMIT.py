# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

USE_PYTHON3 = True


def _CommonChecks(input_api, output_api):
    # Run the Python unittests of the build scripts and generators.
    return input_api.canned_checks.RunUnitTestsInDirectory(
        input_api,
        output_api,
        '.', [r'^.+_unittest\.py$'],
        run_on_python2=False,
        skip_shebang_check=True)


def CheckChangeOnUpload(input_api, output_api):
    return _CommonChecks(input_api, output_api)


def CheckChangeOnCommit(input_api, output_api):
    return _CommonChecks(input_api, output_api)
