// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TabbedPane} from './TabbedPane.js';  // eslint-disable-line no-unused-vars
import {ItemsProvider, Toolbar, ToolbarItem, ToolbarMenuButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {ViewManager} from './ViewManager.js';
import {VBox, Widget} from './Widget.js';

/**
 * @interface
 */
export class View {
  /**
   * @return {string}
   */
  viewId() {
  }

  /**
   * @return {string}
   */
  title() {
  }

  /**
   * @return {boolean}
   */
  isCloseable() {
  }

  /**
   * @return {boolean}
   */
  isTransient() {
  }

  /**
   * @return {!Promise<!Array<!ToolbarItem>>}
   */
  toolbarItems() {
  }

  /**
   * @return {!Promise<!Widget>}
   */
  widget() {
  }

  /**
   * @return {!Promise|undefined}
   */
  disposeView() {}
}

export const _symbol = Symbol('view');
export const _widgetSymbol = Symbol('widget');

// Closure is unhappy with the private access of _widgetSymbol,
// so re-export it under a public symbol.
export const widgetSymbol = _widgetSymbol;

/**
 * @implements {View}
 * @unrestricted
 */
export class SimpleView extends VBox {
  /**
   * @param {string} title
   * @param {boolean=} isWebComponent
   */
  constructor(title, isWebComponent) {
    super(isWebComponent);
    this._title = title;
    this[_symbol] = this;
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
   * @return {!Promise}
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
 * @implements {View}
 * @unrestricted
 */
export class ProvidedView {
  /**
   * @param {!Root.Runtime.Extension} extension
   */
  constructor(extension) {
    this._extension = extension;
  }

  /**
   * @override
   * @return {string}
   */
  viewId() {
    return this._extension.descriptor()['id'];
  }

  /**
   * @override
   * @return {string}
   */
  title() {
    return this._extension.title();
  }

  /**
   * @override
   * @return {boolean}
   */
  isCloseable() {
    return this._extension.descriptor()['persistence'] === 'closeable';
  }

  /**
   * @override
   * @return {boolean}
   */
  isTransient() {
    return this._extension.descriptor()['persistence'] === 'transient';
  }

  /**
   * @override
   * @return {!Promise<!Array<!ToolbarItem>>}
   */
  toolbarItems() {
    const actionIds = this._extension.descriptor()['actionIds'];
    if (actionIds) {
      const result = actionIds.split(',').map(id => Toolbar.createActionButtonForId(id.trim()));
      return Promise.resolve(result);
    }

    if (this._extension.descriptor()['hasToolbar']) {
      return this.widget().then(widget => /** @type {!ItemsProvider} */ (widget).toolbarItems());
    }
    return Promise.resolve([]);
  }

  /**
   * @override
   * @return {!Promise<!Widget>}
   */
  async widget() {
    this._widgetRequested = true;
    const widget = await this._extension.instance();
    if (!(widget instanceof Widget)) {
      throw new Error('view className should point to a UI.Widget');
    }
    widget[_symbol] = this;
    return (
        /** @type {!Widget} */ (widget));
  }

  /**
   * @override
   */
  async disposeView() {
    if (!this._widgetRequested) {
      return;
    }
    const widget = await this.widget();
    widget.ownerViewDisposed();
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
   * @return {!Promise}
   */
  showView(view, insertBefore, userGesture) {
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
  }

  /**
   * @return {!ToolbarMenuButton}
   */
  enableMoreTabsButton() {
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
  }
}
