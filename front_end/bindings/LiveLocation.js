// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/** @interface */
WebInspector.LiveLocation = function() {};

WebInspector.LiveLocation.prototype = {
  update: function() {},

  /**
   * @return {?WebInspector.UILocation}
   */
  uiLocation: function() {},

  dispose: function() {},

  /**
   * @return {boolean}
   */
  isBlackboxed: function() {}
};

/**
 * @implements {WebInspector.LiveLocation}
 * @unrestricted
 */
WebInspector.LiveLocationWithPool = class {
  /**
   * @param {function(!WebInspector.LiveLocation)} updateDelegate
   * @param {!WebInspector.LiveLocationPool} locationPool
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
   * @return {?WebInspector.UILocation}
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
};

/**
 * @unrestricted
 */
WebInspector.LiveLocationPool = class {
  constructor() {
    this._locations = new Set();
  }

  /**
   * @param {!WebInspector.LiveLocation} location
   */
  _add(location) {
    this._locations.add(location);
  }

  /**
   * @param {!WebInspector.LiveLocation} location
   */
  _delete(location) {
    this._locations.delete(location);
  }

  disposeAll() {
    for (var location of this._locations)
      location.dispose();
  }
};
