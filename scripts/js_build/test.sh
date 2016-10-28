#!/usr/bin/env bash
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"

CHROMIUM_ROOT_PATH=${SCRIPT_PATH}"/../../../../../.."
OUT_PATH=${CHROMIUM_ROOT_PATH}"/out/Release"

ninja -C ${OUT_PATH} -j 1000 chrome blink_tests
npm run build
echo =======================
echo DIFF
diff -rq  ../../release ~/chromium/src/out/Release/resources/inspector | grep -ivE "out/Release/resources/inspector: debug$" | tee "release_mode_diff.txt"
