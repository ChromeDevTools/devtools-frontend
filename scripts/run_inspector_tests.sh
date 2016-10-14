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
ALL_TESTS=" inspector** http/tests/inspector**"
DEBUG_FLAG=" --additional-driver-flag='--debug-devtools'"

COMMAND=${RUN_LAYOUT_TEST_PATH}

#ninja -C ${OUT_PATH} devtools_frontend_resources
if [ $1 == "-d" ]
then
    shift
    COMMAND=${COMMAND}${DEBUG_FLAG}
fi

if [ $# -eq 0 ]
then
    COMMAND=${COMMAND}${ALL_TESTS}
else
    COMMAND=${COMMAND}" $@"
fi

${COMMAND}
