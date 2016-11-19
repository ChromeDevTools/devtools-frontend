// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
Common.OutputStream = function() {};

Common.OutputStream.prototype = {
  /**
   * @param {string} data
   * @param {function(!Common.OutputStream)=} callback
   */
  write(data, callback) {},

  close() {}
};

/**
 * @implements {Common.OutputStream}
 * @unrestricted
 */
Common.StringOutputStream = class {
  constructor() {
    this._data = '';
  }

  /**
   * @override
   * @param {string} chunk
   * @param {function(!Common.OutputStream)=} callback
   */
  write(chunk, callback) {
    this._data += chunk;
  }

  /**
   * @override
   */
  close() {
  }

  /**
   * @return {string}
   */
  data() {
    return this._data;
  }
};
