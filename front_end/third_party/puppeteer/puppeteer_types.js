// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Connection {
  /**
   * @param {string} url
   * @param {?} transport
   */
  constructor(url, transport) {}
}

export class Browser {
  /**
   * @param {!Connection} connection
   * @param {!Array<!string>} contextIds
   * @param {boolean} ignoreHTTPSErrors
   * @return {!Promise<!Browser>}
   */
  static async create(connection, contextIds, ignoreHTTPSErrors) {
    return new Browser();
  }

  /**
   * @return {!Promise<!Array<!Page>>}
   */
  async pages() {
    return [];
  }
}

export class Page {
  /**
   * @return Frame
   */
  mainFrame() {
    return new Frame();
  }
}

export class Frame {

}