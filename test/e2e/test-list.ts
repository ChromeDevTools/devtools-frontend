// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';

export const testList = [
  join(__dirname, '.', 'sources', 'script-in-multiple-workers.js'),
  join(__dirname, '.', 'console', 'console-message-format.js'),
];
