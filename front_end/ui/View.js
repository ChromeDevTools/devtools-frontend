// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export default class View {
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
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  toolbarItems() {
  }

  /**
   * @return {!Promise<!UI.Widget>}
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

/**
 * @implements {View}
 * @unrestricted
 */
export class SimpleView extends UI.VBox {
  /**
   * @param {string} title
   * @param {boolean=} isWebComponent
   */
  constructor(title, isWebComponent) {
    super(isWebComponent);
    this._title = title;
    /** @type {!Array<!UI.ToolbarItem>} */
    this._toolbarItems = [];
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
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  toolbarItems() {
    return Promise.resolve(this.syncToolbarItems());
  }

  /**
   * @return {!Array<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    return this._toolbarItems;
  }

  /**
   * @override
   * @return {!Promise<!UI.Widget>}
   */
  widget() {
    return /** @type {!Promise<!UI.Widget>} */ (Promise.resolve(this));
  }

  /**
   * @param {!UI.ToolbarItem} item
   */
  addToolbarItem(item) {
    this._toolbarItems.push(item);
  }

  /**
   * @return {!Promise}
   */
  revealView() {
    return UI.viewManager.revealView(this);
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
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  toolbarItems() {
    const actionIds = this._extension.descriptor()['actionIds'];
    if (actionIds) {
      const result = actionIds.split(',').map(id => UI.Toolbar.createActionButtonForId(id.trim()));
      return Promise.resolve(result);
    }

    if (this._extension.descriptor()['hasToolbar']) {
      return this.widget().then(widget => /** @type {!UI.ToolbarItem.ItemsProvider} */ (widget).toolbarItems());
    }
    return Promise.resolve([]);
  }

  /**
   * @override
   * @return {!Promise<!UI.Widget>}
   */
  async widget() {
    this._widgetRequested = true;
    const widget = await this._extension.instance();
    if (!(widget instanceof UI.Widget)) {
      throw new Error('view className should point to a UI.Widget');
    }
    widget[_symbol] = this;
    return /** @type {!UI.Widget} */ (widget);
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
   * @return {!UI.Widget}
   */
  widget() {
  }
}

/**
 * @interface
 */
export class TabbedViewLocation extends ViewLocation {
  /**
   * @return {!UI.TabbedPane}
   */
  tabbedPane() {
  }

  /**
   * @return {!UI.ToolbarMenuButton}
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

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @interface */
UI.View = View;

/** @public */
UI.View.widgetSymbol = _widgetSymbol;

/** @constructor */
UI.SimpleView = SimpleView;

/** @constructor */
UI.ProvidedView = ProvidedView;

/** @interface */
UI.ViewLocation = ViewLocation;

/** @interface */
UI.TabbedViewLocation = TabbedViewLocation;

/** @interface */
UI.ViewLocationResolver = ViewLocationResolver;
