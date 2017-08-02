// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

function getOutPath(inputPath) {
  const nonHttpLayoutTestPrefix = 'LayoutTests/inspector';
  const httpLayoutTestPrefix = 'LayoutTests/http/tests/inspector';
  const postfix = inputPath.indexOf(nonHttpLayoutTestPrefix) === -1 ?
      inputPath.slice(inputPath.indexOf(httpLayoutTestPrefix) + httpLayoutTestPrefix.length + 1)
          .replace('.html', '.js') :
      inputPath.slice(inputPath.indexOf(nonHttpLayoutTestPrefix) + nonHttpLayoutTestPrefix.length + 1)
          .replace('.html', '.js');
  const out = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', 'http', 'tests', 'devtools', postfix);
  return out;
}

module.exports = {
  getOutPath,
};
