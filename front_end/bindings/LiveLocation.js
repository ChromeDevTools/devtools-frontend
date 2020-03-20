// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

/** @interface */
export class LiveLocation {
  /**
   * @return {!Promise<void>}
   */
  update() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  uiLocation() {
    throw new Error('not implemented');
  }

  dispose() {
  }

  /**
   * @return {!Promise<boolean>}
   */
  isBlackboxed() {
    throw new Error('not implemented');
  }
}

/**
 * @implements {LiveLocation}
 * @unrestricted
 */
export class LiveLocationWithPool {
  /**
   * @param {function(!LiveLocation):!Promise<void>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(updateDelegate, locationPool) {
    /** @type {?function(!LiveLocation):!Promise<void>} */
    this._updateDelegate = updateDelegate;
    this._locationPool = locationPool;
    this._locationPool._add(this);

    /** @type {?Promise<void>} */
    this._updatePromise = null;
  }

  /**
   * @override
   */
  async update() {
    if (!this._updateDelegate) {
      return;
    }
    // The following is a basic scheduling algorithm, guaranteeing that
    // {_updateDelegate} is always run atomically. That is, we always
    // wait for an update to finish before we trigger the next run.
    if (this._updatePromise) {
      await this._updatePromise.then(() => this.update());
    } else {
      this._updatePromise = this._updateDelegate(this);
      await this._updatePromise;
      this._updatePromise = null;
    }
  }

  /**
   * @override
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async uiLocation() {
    throw 'Not implemented';
  }

  /**
   * @override
   */
  dispose() {
    this._locationPool._delete(this);
    this._updateDelegate = null;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async isBlackboxed() {
    throw 'Not implemented';
  }
}

/**
 * @unrestricted
 */
export class LiveLocationPool {
  constructor() {
    this._locations = new Set();
  }

  /**
   * @param {!LiveLocation} location
   */
  _add(location) {
    this._locations.add(location);
  }

  /**
   * @param {!LiveLocation} location
   */
  _delete(location) {
    this._locations.delete(location);
  }

  disposeAll() {
    for (const location of this._locations) {
      location.dispose();
    }
  }
}
