// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs').promises;
const path = require('path');
const isDebug = /^\s*is_debug\s*=\s*(.*)/;

/**
 * Tests the args.gn file to ensure that the is_debug flag is set to true.
 * We don't cover every case here, for example where is_debug is redefined
 * in the gn.args several times. Instead we use the first declaration of
 * is_debug's value.
 * @param {string} dirName
 */
async function debugCheck(dirName) {
  const argsFile = path.join(dirName, '..', '..', '..', 'args.gn');
  try {
    const fileDetails = await fs.readFile(argsFile, {encoding: 'utf8'});
    for (const line of fileDetails.split('\n')) {
      if (!isDebug.test(line)) {
        continue;
      }

      const matches = isDebug.exec(line);
      // For any match we expect:
      // 0: the whole line
      // 1: the value itself
      if (!matches || matches.length < 2) {
        return false;
      }

      const value = matches[1].toLowerCase();
      if (value === 'true' || value === '1') {
        return true;
      }

      return false;
    }
    // By default, a DevTools build is always a debug build,
    // unless `is_debug` is explicitly set to false
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = debugCheck;
