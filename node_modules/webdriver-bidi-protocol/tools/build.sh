#!/bin/bash

# @license
# Copyright 2024 Google Inc.
# SPDX-License-Identifier: Apache-2.0

rm -rf src/gen && mkdir src/gen
rm -rf out

git submodule update --init

(cd specs/webdriver-bidi && scripts/cddl/generate.js)
(cd specs/permissions && ../webdriver-bidi/scripts/cddl/generate.js index.html)
(cd specs/web-bluetooth && ../webdriver-bidi/scripts/cddl/generate.js index.bs)

cddlconv specs/webdriver-bidi/all.cddl > src/gen/main.ts
cddlconv specs/permissions/all.cddl > src/gen/permissions.ts
cddlconv specs/web-bluetooth/all.cddl > src/gen/web-bluetooth.ts

(cd specs/webdriver-bidi && git reset --hard HEAD && git clean -fd)
(cd specs/permissions && git reset --hard HEAD && git clean -fd)
(cd specs/web-bluetooth && git reset --hard HEAD && git clean -fd)

git submodule deinit --all

npx tsc -p tsconfig.json
npx tsd
npm run format