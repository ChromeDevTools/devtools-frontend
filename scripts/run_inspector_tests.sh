#!/usr/bin/env bash
# Copyright (c) 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Get the full directory path of this script regardless of where it's run from
# Based on: http://stackoverflow.com/questions/59895/can-a-bash-script-tell-which-directory-it-is-stored-in
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"

CHROMIUM_ROOT_PATH=${SCRIPT_PATH}"/../../../../.."
OUT_PATH=${CHROMIUM_ROOT_PATH}"/out/Release"
RUN_LAYOUT_TEST_PATH=${CHROMIUM_ROOT_PATH}"/blink/tools/run_layout_tests.py"

INSPECTOR_TEST_SUITES="inspector inspector-protocol inspector-enabled http/tests/inspector"

ninja -C ${OUT_PATH} -j 1000 chrome blink_tests
${RUN_LAYOUT_TEST_PATH} ${INSPECTOR_TEST_SUITES} --child-processes=16 "$@"
