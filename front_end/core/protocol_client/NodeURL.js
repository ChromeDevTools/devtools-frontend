// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';

export class NodeURL {
  /**
   * @param {!{url: string}} object
   */
  static patch(object) {
    process(object, '');

    /**
     * @param {!{url: string}} object
     * @param {string} path
     */
    function process(object, path) {
      if (object.url && NodeURL._isPlatformPath(object.url, Host.Platform.isWin())) {
        object.url = Common.ParsedURL.ParsedURL.platformPathToURL(object.url);
      }
      for (const entry of Object.entries(object)) {
        const key = entry[0];
        const value = entry[1];
        const entryPath = path + '.' + key;
        if (entryPath !== '.result.result.value' && value !== null && typeof value === 'object') {
          process(/** @type {{url: string}} */ (value), entryPath);
        }
      }
    }
  }

  /**
   * @param {string} fileSystemPath
   * @param {boolean} isWindows
   * @return {boolean}
   */
  static _isPlatformPath(fileSystemPath, isWindows) {
    if (isWindows) {
      const re = /^([a-z]:[\/\\]|\\\\)/i;
      return re.test(fileSystemPath);
    }
    return fileSystemPath.length ? fileSystemPath[0] === '/' : false;
  }
}
