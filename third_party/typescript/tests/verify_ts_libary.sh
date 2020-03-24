# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

ROOT_DIRECTORY=$(dirname "$0")

rm -rf $ROOT_DIRECTORY/out/fixtures

gn gen --root=$ROOT_DIRECTORY/fixtures/simple_dep $ROOT_DIRECTORY/out/fixtures/simple_dep
autoninja -C $ROOT_DIRECTORY/out/fixtures/simple_dep simple_dep


gn gen --root=$ROOT_DIRECTORY/fixtures/test_dep $ROOT_DIRECTORY/out/fixtures/test_dep
autoninja -C $ROOT_DIRECTORY/out/fixtures/test_dep test_dep