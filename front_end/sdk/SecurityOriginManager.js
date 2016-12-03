// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.SecurityOriginManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(SDK.SecurityOriginManager, target);

    this._securityOriginCounter = new Map();
    this._mainSecurityOrigin = '';
  }

  /**
   * @param {!SDK.Target} target
   * @return {!SDK.SecurityOriginManager}
   */
  static fromTarget(target) {
    var securityOriginManager = target.model(SDK.SecurityOriginManager);
    if (!securityOriginManager)
      securityOriginManager = new SDK.SecurityOriginManager(target);
    return securityOriginManager;
  }

  /**
   * @param {string} securityOrigin
   */
  addSecurityOrigin(securityOrigin) {
    var currentCount = this._securityOriginCounter.get(securityOrigin);
    if (!currentCount) {
      this._securityOriginCounter.set(securityOrigin, 1);
      this.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginAdded, securityOrigin);
      return;
    }
    this._securityOriginCounter.set(securityOrigin, currentCount + 1);
  }

  /**
   * @param {string} securityOrigin
   */
  removeSecurityOrigin(securityOrigin) {
    var currentCount = this._securityOriginCounter.get(securityOrigin);
    if (currentCount === 1) {
      this._securityOriginCounter.delete(securityOrigin);
      this.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginRemoved, securityOrigin);
      return;
    }
    this._securityOriginCounter.set(securityOrigin, currentCount - 1);
  }

  /**
   * @return {!Array<string>}
   */
  securityOrigins() {
    return this._securityOriginCounter.keysArray();
  }

  /**
   * @return {string}
   */
  mainSecurityOrigin() {
    return this._mainSecurityOrigin;
  }

  /**
   * @param {string} securityOrigin
   */
  setMainSecurityOrigin(securityOrigin) {
    this._mainSecurityOrigin = securityOrigin;
    this.dispatchEventToListeners(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, securityOrigin);
  }
};

/** @enum {symbol} */
SDK.SecurityOriginManager.Events = {
  SecurityOriginAdded: Symbol('SecurityOriginAdded'),
  SecurityOriginRemoved: Symbol('SecurityOriginRemoved'),
  MainSecurityOriginChanged: Symbol('MainSecurityOriginChanged')
};
