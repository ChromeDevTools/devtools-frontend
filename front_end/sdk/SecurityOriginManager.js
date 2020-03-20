// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class SecurityOriginManager extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);

    // if a URL is unreachable, the browser will jump to an error page at
    // 'chrome-error://chromewebdata/', and |this._mainSecurityOrigin| stores
    // its origin. In this situation, the original unreachable URL's security
    // origin will be stored in |this._unreachableMainSecurityOrigin|.
    this._mainSecurityOrigin = '';
    /** @type {?string} */
    this._unreachableMainSecurityOrigin = '';

    /** @type {!Set<string>} */
    this._securityOrigins = new Set();
  }

  /**
   * @param {!Set<string>} securityOrigins
   */
  updateSecurityOrigins(securityOrigins) {
    const oldOrigins = this._securityOrigins;
    this._securityOrigins = securityOrigins;

    for (const origin of oldOrigins) {
      if (!this._securityOrigins.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginRemoved, origin);
      }
    }

    for (const origin of this._securityOrigins) {
      if (!oldOrigins.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginAdded, origin);
      }
    }
  }

  /**
   * @return {!Array<string>}
   */
  securityOrigins() {
    return [...this._securityOrigins];
  }

  /**
   * @return {string}
   */
  mainSecurityOrigin() {
    return this._mainSecurityOrigin;
  }

  /**
   * @return {?string}
   */
  unreachableMainSecurityOrigin() {
    return this._unreachableMainSecurityOrigin;
  }

  /**
   * @param {string} securityOrigin
   * @param {string} unreachableSecurityOrigin
   */
  setMainSecurityOrigin(securityOrigin, unreachableSecurityOrigin) {
    this._mainSecurityOrigin = securityOrigin;
    this._unreachableMainSecurityOrigin = unreachableSecurityOrigin || null;
    this.dispatchEventToListeners(Events.MainSecurityOriginChanged, {
      mainSecurityOrigin: this._mainSecurityOrigin,
      unreachableMainSecurityOrigin: this._unreachableMainSecurityOrigin
    });
  }
}

/** @enum {symbol} */
export const Events = {
  SecurityOriginAdded: Symbol('SecurityOriginAdded'),
  SecurityOriginRemoved: Symbol('SecurityOriginRemoved'),
  MainSecurityOriginChanged: Symbol('MainSecurityOriginChanged')
};

// TODO(jarhar): this is the only usage of Capability.None. Do something about it!
SDKModel.register(SecurityOriginManager, Capability.None, false);
