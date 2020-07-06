// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');

const [, , outputDirectory, entrypointName] = process.argv;

const rawFileName = path.basename(entrypointName, path.extname(entrypointName));
const inputLocation = path.join(outputDirectory, `${rawFileName}.prebundle.d.ts`);
const outputLocation = path.join(outputDirectory, `${rawFileName}.d.ts`);

fs.copyFileSync(inputLocation, outputLocation);
