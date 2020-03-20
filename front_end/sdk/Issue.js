// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {IssuesModel} from './IssuesModel.js';

/**
 * @unrestricted
 */
export class Issue extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} code
   */
  constructor(code) {
    super();
    this._code = code;
    /** @type {!Array<!*>} */
    this._resources = [];
    /** @type {!Map<string, !*>} */
    this._cookies = new Map();
  }

  /**
   * @returns {string}
   */
  code() {
    return this._code;
  }

  /**
   * @returns {!Iterable<!*>}
   */
  cookies() {
    return this._cookies.values();
  }

  /**
   * @returns {number}
   */
  numberOfCookies() {
    return this._cookies.size;
  }

  /**
   * @param {!*} resources
   */
  addInstanceResources(resources) {
    if (!resources) {
      return;
    }

    this._resources.push(resources);

    if (resources.cookies) {
      for (const cookie of resources.cookies) {
        IssuesModel.connectWithIssue(cookie, this);
        const key = JSON.stringify(cookie);
        if (!this._cookies.has(key)) {
          this._cookies.set(key, cookie);
          this.dispatchEventToListeners(Events.CookieAdded, cookie);
        }
      }
    }
  }
}

export const Events = {
  CookieAdded: Symbol('CookieAdded'),
};
