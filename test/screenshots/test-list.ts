// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';

const tests = [
  'hello-world/hello-world.js',
];

export const testList = tests.map(testPath => {
  return join(__dirname, testPath);
});
