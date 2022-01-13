// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');

/**
 * Only write content to a file if the content is different that what it previously contained.
 * The reason for only writing when necessary is that GN uses file timestamps to determine freshness.
 * Therefore, if the file contents hasn't changed, but the timestamp has, GN thinks the file is new.
 *
 * Instead, we can only write when the content is changed, meaning we don't touch a file when it is
 * unchanged. This would preserve the original file timestamps and hence GN can correctly conclude
 * the file output hasn't changed.
 *
 * @param {string} generatedFileLocation Location to write to
 * @param {string} newContents The contents to write (or noop if unchanged with previous content)
 */
module.exports.writeIfChanged = (generatedFileLocation, newContents) => {
  if (fs.existsSync(generatedFileLocation)) {
    if (fs.readFileSync(generatedFileLocation, {encoding: 'utf8', flag: 'r'}) === newContents) {
      return;
    }
  }

  fs.writeFileSync(generatedFileLocation, newContents, {encoding: 'utf-8'});
};
