// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TabbedPane} from './TabbedPane.js';  // eslint-disable-line no-unused-vars
import {ToolbarItem, ToolbarMenuButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {ViewManager} from './ViewManager.js';
import {VBox, Widget} from './Widget.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class View {
  /**
   * @return {string}
   */
  viewId() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  title() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  isCloseable() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  isTransient() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Promise<!Array<!ToolbarItem>>}
   */
  toolbarItems() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Promise<!Widget>}
   */
  widget() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Promise<void>|void}
   */
  disposeView() {}
}

/**
 * @implements {View}
 */
export class SimpleView extends VBox {
  /**
   * @param {string} title
   * @param {boolean=} isWebComponent
   */
  constructor(title, isWebComponent) {
    super(isWebComponent);
    this._title = title;
  }

  /**
   * @override
   * @return {string}
   */
  viewId() {
    return this._title;
  }

  /**
   * @override
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @override
   * @return {boolean}
   */
  isCloseable() {
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  isTransient() {
    return false;
  }

  /**
   * @override
   * @return {!Promise<!Array<!ToolbarItem>>}
   */
  toolbarItems() {
    return Promise.resolve([]);
  }

  /**
   * @override
   * @return {!Promise<!Widget>}
   */
  widget() {
    return (
        /** @type {!Promise<!Widget>} */ (Promise.resolve(this)));
  }

  /**
   * @return {!Promise<void>}
   */
  revealView() {
    return ViewManager.instance().revealView(this);
  }

  /**
   * @override
   */
  disposeView() {
  }
}

/**
 * @interface
 */
export class ViewLocation {
  /**
   * @param {string} locationName
   */
  appendApplicableItems(locationName) {
  }

  /**
   * @param {!View} view
   * @param {?View=} insertBefore
   */
  appendView(view, insertBefore) {
  }

  /**
   * @param {!View} view
   * @param {?View=} insertBefore
   * @param {boolean=} userGesture
   * @return {!Promise<*>}
   */
  showView(view, insertBefore, userGesture) {
    throw new Error('not implemented');
  }

  /**
   * @param {!View} view
   */
  removeView(view) {
  }

  /**
   * @return {!Widget}
   */
  widget() {
    throw new Error('not implemented');
  }
}

/**
 * @interface
 */
export class TabbedViewLocation extends ViewLocation {
  /**
   * @return {!TabbedPane}
   */
  tabbedPane() {
    throw new Error('not implemented');
  }

  /**
   * @return {!ToolbarMenuButton}
   */
  enableMoreTabsButton() {
    throw new Error('not implemented');
  }
}

/**
 * @interface
 */
export class ViewLocationResolver {
  /**
   * @param {string} location
   * @return {?ViewLocation}
   */
  resolveLocation(location) {
    throw new Error('not implemented');
  }
}
