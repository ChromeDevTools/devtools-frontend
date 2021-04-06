// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export class OutputStream {
  /**
   * @param {string} data
   * @return {!Promise.<void>}
   */
  async write(data) {
  }

  /**
   * @return {!Promise.<void>}
   */
  async close() {
  }
}

/**
 * @implements {OutputStream}
 */
export class StringOutputStream {
  constructor() {
    this._data = '';
  }

  /**
   * @override
   * @param {string} chunk
   * @return {!Promise.<void>}
   */
  async write(chunk) {
    this._data += chunk;
  }

  /**
   * @override
   * @return {!Promise.<void>}
   */
  async close() {
  }

  /**
   * @return {string}
   */
  data() {
    return this._data;
  }
}
