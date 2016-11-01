// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
WebInspector.OutputStream = function() {};

WebInspector.OutputStream.prototype = {
  /**
   * @param {string} data
   * @param {function(!WebInspector.OutputStream)=} callback
   */
  write: function(data, callback) {},

  close: function() {}
};

/**
 * @implements {WebInspector.OutputStream}
 * @unrestricted
 */
WebInspector.StringOutputStream = class {
  constructor() {
    this._data = '';
  }

  /**
   * @override
   * @param {string} chunk
   * @param {function(!WebInspector.OutputStream)=} callback
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
