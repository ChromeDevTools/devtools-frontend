// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @interface */
export default class LiveLocation {
  update() {
  }

  /**
   * @return {?Workspace.UILocation}
   */
  uiLocation() {
  }

  dispose() {
  }

  /**
   * @return {boolean}
   */
  isBlackboxed() {}
}

/**
 * @implements {LiveLocation}
 * @unrestricted
 */
export class LiveLocationWithPool {
  /**
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(updateDelegate, locationPool) {
    this._updateDelegate = updateDelegate;
    this._locationPool = locationPool;
    this._locationPool._add(this);
  }

  /**
   * @override
   */
  update() {
    this._updateDelegate(this);
  }

  /**
   * @override
   * @return {?Workspace.UILocation}
   */
  uiLocation() {
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
   * @return {boolean}
   */
  isBlackboxed() {
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

/* Legacy exported object */
self.Bindings = self.Bindings || {};

/* Legacy exported object */
Bindings = Bindings || {};

/** @interface */
Bindings.LiveLocation = LiveLocation;

/** @constructor */
Bindings.LiveLocationWithPool = LiveLocationWithPool;

/** @constructor */
Bindings.LiveLocationPool = LiveLocationPool;
