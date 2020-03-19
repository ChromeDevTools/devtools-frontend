// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ARIAUtils from './ARIAUtils.js';

import {ContextMenu} from './ContextMenu.js';  // eslint-disable-line no-unused-vars
import {Icon} from './Icon.js';
import {Events as TabbedPaneEvents, TabbedPane} from './TabbedPane.js';
import {Toolbar, ToolbarItem, ToolbarMenuButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {ProvidedView, TabbedViewLocation, View, ViewLocation, ViewLocationResolver, widgetSymbol,} from './View.js';  // eslint-disable-line no-unused-vars
import {VBox, Widget} from './Widget.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!ViewManager}
 */
let viewManagerInstance;

/**
 * @unrestricted
 */
export class ViewManager {
  /**
   * @private
   */
  constructor() {
    /** @type {!Map<string, !View>} */
    this._views = new Map();
    /** @type {!Map<string, string>} */
    this._locationNameByViewId = new Map();

    for (const extension of self.runtime.extensions('view')) {
      const descriptor = extension.descriptor();
      this._views.set(descriptor['id'], new ProvidedView(extension));
      this._locationNameByViewId.set(descriptor['id'], descriptor['location']);
    }
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!viewManagerInstance || forceNew) {
      viewManagerInstance = new ViewManager();
    }

    return viewManagerInstance;
  }

  /**
   * @param {!Array<!ToolbarItem>} toolbarItems
   * @return {?Element}
   */
  static _createToolbar(toolbarItems) {
    if (!toolbarItems.length) {
      return null;
    }
    const toolbar = new Toolbar('');
    for (const item of toolbarItems) {
      toolbar.appendToolbarItem(item);
    }
    return toolbar.element;
  }

  /**
   * @param {!View} view
   * @return {!Promise}
   */
  revealView(view) {
    const location = /** @type {?_Location} */ (view[_Location.symbol]);
    if (!location) {
      return Promise.resolve();
    }
    location._reveal();
    return location.showView(view);
  }

  /**
   * @param {string} viewId
   * @return {?View}
   */
  view(viewId) {
    return this._views.get(viewId);
  }

  /**
   * @param {string} viewId
   * @return {?Widget}
   */
  materializedWidget(viewId) {
    const view = this.view(viewId);
    return view ? view[widgetSymbol] : null;
  }

  /**
   * @param {string} viewId
   * @param {boolean=} userGesture
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  showView(viewId, userGesture, omitFocus) {
    const view = this._views.get(viewId);
    if (!view) {
      console.error('Could not find view for id: \'' + viewId + '\' ' + new Error().stack);
      return Promise.resolve();
    }

    const locationName = this._locationNameByViewId.get(viewId);

    const location = view[_Location.symbol];
    if (location) {
      location._reveal();
      return location.showView(view, undefined, userGesture, omitFocus);
    }

    return this.resolveLocation(locationName).then(location => {
      if (!location) {
        throw new Error('Could not resolve location for view: ' + viewId);
      }
      location._reveal();
      return location.showView(view, undefined, userGesture, omitFocus);
    });
  }

  /**
   * @param {string=} location
   * @return {!Promise<?_Location>}
   */
  resolveLocation(location) {
    if (!location) {
      return /** @type {!Promise<?_Location>} */ (Promise.resolve(null));
    }

    const resolverExtensions =
        self.runtime.extensions(ViewLocationResolver).filter(extension => extension.descriptor()['name'] === location);
    if (!resolverExtensions.length) {
      throw new Error('Unresolved location: ' + location);
    }
    const resolverExtension = resolverExtensions[0];
    return resolverExtension.instance().then(
        resolver => /** @type {?_Location} */ (resolver.resolveLocation(location)));
  }

  /**
   * @param {function()=} revealCallback
   * @param {string=} location
   * @param {boolean=} restoreSelection
   * @param {boolean=} allowReorder
   * @param {?string=} defaultTab
   * @return {!TabbedViewLocation}
   */
  createTabbedLocation(revealCallback, location, restoreSelection, allowReorder, defaultTab) {
    return new _TabbedLocation(this, revealCallback, location, restoreSelection, allowReorder, defaultTab);
  }

  /**
   * @param {function()=} revealCallback
   * @param {string=} location
   * @return {!ViewLocation}
   */
  createStackLocation(revealCallback, location) {
    return new _StackLocation(this, revealCallback, location);
  }

  /**
   * @param {string} location
   * @return {boolean}
   */
  hasViewsForLocation(location) {
    return !!this._viewsForLocation(location).length;
  }

  /**
   * @param {string} location
   * @return {!Array<!View>}
   */
  _viewsForLocation(location) {
    const result = [];
    for (const id of this._views.keys()) {
      if (this._locationNameByViewId.get(id) === location) {
        result.push(this._views.get(id));
      }
    }
    return result;
  }
}


/**
 * @unrestricted
 */
export class ContainerWidget extends VBox {
  /**
   * @param {!View} view
   */
  constructor(view) {
    super();
    this.element.classList.add('flex-auto', 'view-container', 'overflow-auto');
    this._view = view;
    this.element.tabIndex = -1;
    ARIAUtils.markAsTabpanel(this.element);
    ARIAUtils.setAccessibleName(this.element, ls`${view.title()} panel`);
    this.setDefaultFocusedElement(this.element);
  }

  /**
   * @return {!Promise}
   */
  _materialize() {
    if (this._materializePromise) {
      return this._materializePromise;
    }
    const promises = [];
    // TODO(crbug.com/1006759): Transform to async-await
    promises.push(this._view.toolbarItems().then(toolbarItems => {
      const toolbarElement = ViewManager._createToolbar(toolbarItems);
      if (toolbarElement) {
        this.element.insertBefore(toolbarElement, this.element.firstChild);
      }
    }));
    promises.push(this._view.widget().then(widget => {
      // Move focus from |this| to loaded |widget| if any.
      const shouldFocus = this.element.hasFocus();
      this.setDefaultFocusedElement(null);
      this._view[widgetSymbol] = widget;
      widget.show(this.element);
      if (shouldFocus) {
        widget.focus();
      }
    }));
    this._materializePromise = Promise.all(promises);
    return this._materializePromise;
  }

  /**
   * @override
   */
  wasShown() {
    this._materialize().then(() => {
      this._view[widgetSymbol].show(this.element);
      this._wasShownForTest();
    });
  }

  _wasShownForTest() {
    // This method is sniffed in tests.
  }
}

/**
 * @unrestricted
 */
export class _ExpandableContainerWidget extends VBox {
  /**
   * @param {!View} view
   */
  constructor(view) {
    super(true);
    this.element.classList.add('flex-none');
    this.registerRequiredCSS('ui/viewContainers.css');

    this._titleElement = createElementWithClass('div', 'expandable-view-title');
    ARIAUtils.markAsButton(this._titleElement);
    this._titleExpandIcon = Icon.create('smallicon-triangle-right', 'title-expand-icon');
    this._titleElement.appendChild(this._titleExpandIcon);
    const titleText = view.title();
    this._titleElement.createTextChild(titleText);
    ARIAUtils.setAccessibleName(this._titleElement, titleText);
    ARIAUtils.setExpanded(this._titleElement, false);
    this._titleElement.tabIndex = 0;
    self.onInvokeElement(this._titleElement, this._toggleExpanded.bind(this));
    this._titleElement.addEventListener('keydown', this._onTitleKeyDown.bind(this), false);
    this.contentElement.insertBefore(this._titleElement, this.contentElement.firstChild);

    ARIAUtils.setControls(this._titleElement, this.contentElement.createChild('slot'));
    this._view = view;
    view[_ExpandableContainerWidget._symbol] = this;
  }

  /**
   * @override
   */
  wasShown() {
    if (this._widget) {
      this._materializePromise.then(() => this._widget.show(this.element));
    }
  }

  /**
   * @return {!Promise}
   */
  _materialize() {
    if (this._materializePromise) {
      return this._materializePromise;
    }
    // TODO(crbug.com/1006759): Transform to async-await
    const promises = [];
    promises.push(this._view.toolbarItems().then(toolbarItems => {
      const toolbarElement = ViewManager._createToolbar(toolbarItems);
      if (toolbarElement) {
        this._titleElement.appendChild(toolbarElement);
      }
    }));
    promises.push(this._view.widget().then(widget => {
      this._widget = widget;
      this._view[widgetSymbol] = widget;
      widget.show(this.element);
    }));
    this._materializePromise = Promise.all(promises);
    return this._materializePromise;
  }

  /**
   * @return {!Promise}
   */
  _expand() {
    if (this._titleElement.classList.contains('expanded')) {
      return this._materialize();
    }
    this._titleElement.classList.add('expanded');
    ARIAUtils.setExpanded(this._titleElement, true);
    this._titleExpandIcon.setIconType('smallicon-triangle-down');
    return this._materialize().then(() => this._widget.show(this.element));
  }

  _collapse() {
    if (!this._titleElement.classList.contains('expanded')) {
      return;
    }
    this._titleElement.classList.remove('expanded');
    ARIAUtils.setExpanded(this._titleElement, false);
    this._titleExpandIcon.setIconType('smallicon-triangle-right');
    this._materialize().then(() => this._widget.detach());
  }

  /**
   * @param {!Event} event
   */
  _toggleExpanded(event) {
    if (event.type === 'keydown' && event.target !== this._titleElement) {
      return;
    }
    if (this._titleElement.classList.contains('expanded')) {
      this._collapse();
    } else {
      this._expand();
    }
  }

  /**
   * @param {!Event} event
   */
  _onTitleKeyDown(event) {
    if (event.target !== this._titleElement) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      this._collapse();
    } else if (event.key === 'ArrowRight') {
      if (!this._titleElement.classList.contains('expanded')) {
        this._expand();
      } else if (this._widget) {
        this._widget.focus();
      }
    }
  }
}

_ExpandableContainerWidget._symbol = Symbol('container');

/**
 * @unrestricted
 */
class _Location {
  /**
   * @param {!ViewManager} manager
   * @param {!Widget} widget
   * @param {function()=} revealCallback
   */
  constructor(manager, widget, revealCallback) {
    this._manager = manager;
    this._revealCallback = revealCallback;
    this._widget = widget;
  }

  /**
   * @return {!Widget}
   */
  widget() {
    return this._widget;
  }

  _reveal() {
    if (this._revealCallback) {
      this._revealCallback();
    }
  }
}

_Location.symbol = Symbol('location');

/**
 * @implements {TabbedViewLocation}
 * @unrestricted
 */
export class _TabbedLocation extends _Location {
  /**
   * @param {!ViewManager} manager
   * @param {function()=} revealCallback
   * @param {string=} location
   * @param {boolean=} restoreSelection
   * @param {boolean=} allowReorder
   * @param {?string=} defaultTab
   */
  constructor(manager, revealCallback, location, restoreSelection, allowReorder, defaultTab) {
    const tabbedPane = new TabbedPane();
    if (allowReorder) {
      tabbedPane.setAllowTabReorder(true);
    }

    super(manager, tabbedPane, revealCallback);
    this._tabbedPane = tabbedPane;
    this._allowReorder = allowReorder;

    this._tabbedPane.addEventListener(TabbedPaneEvents.TabSelected, this._tabSelected, this);
    this._tabbedPane.addEventListener(TabbedPaneEvents.TabClosed, this._tabClosed, this);
    // Note: go via self.Common for globally-namespaced singletons.
    this._closeableTabSetting = Common.Settings.Settings.instance().createSetting(location + '-closeableTabs', {});
    // Note: go via self.Common for globally-namespaced singletons.
    this._tabOrderSetting = Common.Settings.Settings.instance().createSetting(location + '-tabOrder', {});
    this._tabbedPane.addEventListener(TabbedPaneEvents.TabOrderChanged, this._persistTabOrder, this);
    if (restoreSelection) {
      // Note: go via self.Common for globally-namespaced singletons.
      this._lastSelectedTabSetting = Common.Settings.Settings.instance().createSetting(location + '-selectedTab', '');
    }
    this._defaultTab = defaultTab;

    /** @type {!Map.<string, !View>} */
    this._views = new Map();

    if (location) {
      this.appendApplicableItems(location);
    }
  }

  /**
   * @override
   * @return {!Widget}
   */
  widget() {
    return this._tabbedPane;
  }

  /**
   * @override
   * @return {!TabbedPane}
   */
  tabbedPane() {
    return this._tabbedPane;
  }

  /**
   * @override
   * @return {!ToolbarMenuButton}
   */
  enableMoreTabsButton() {
    const moreTabsButton = new ToolbarMenuButton(this._appendTabsToMenu.bind(this));
    this._tabbedPane.leftToolbar().appendToolbarItem(moreTabsButton);
    this._tabbedPane.disableOverflowMenu();
    return moreTabsButton;
  }

  /**
   * @override
   * @param {string} locationName
   */
  appendApplicableItems(locationName) {
    const views = this._manager._viewsForLocation(locationName);
    if (this._allowReorder) {
      let i = 0;
      const persistedOrders = this._tabOrderSetting.get();
      const orders = new Map();
      for (const view of views) {
        orders.set(view.viewId(), persistedOrders[view.viewId()] || (++i) * _TabbedLocation.orderStep);
      }
      views.sort((a, b) => orders.get(a.viewId()) - orders.get(b.viewId()));
    }

    for (const view of views) {
      const id = view.viewId();
      this._views.set(id, view);
      view[_Location.symbol] = this;
      if (view.isTransient()) {
        continue;
      }
      if (!view.isCloseable()) {
        this._appendTab(view);
      } else if (this._closeableTabSetting.get()[id]) {
        this._appendTab(view);
      }
    }
    if (this._defaultTab && this._tabbedPane.hasTab(this._defaultTab)) {
      this._tabbedPane.selectTab(this._defaultTab);
    } else if (this._lastSelectedTabSetting && this._tabbedPane.hasTab(this._lastSelectedTabSetting.get())) {
      this._tabbedPane.selectTab(this._lastSelectedTabSetting.get());
    }
  }

  /**
   * @param {!ContextMenu} contextMenu
   */
  _appendTabsToMenu(contextMenu) {
    const views = Array.from(this._views.values());
    views.sort((viewa, viewb) => viewa.title().localeCompare(viewb.title()));
    for (const view of views) {
      const title = Common.UIString.UIString(view.title());
      contextMenu.defaultSection().appendItem(title, this.showView.bind(this, view, undefined, true));
    }
  }

  /**
   * @param {!View} view
   * @param {number=} index
   */
  _appendTab(view, index) {
    this._tabbedPane.appendTab(
        view.viewId(), view.title(), new ContainerWidget(view), undefined, false,
        view.isCloseable() || view.isTransient(), index);
  }

  /**
   * @override
   * @param {!View} view
   * @param {?View=} insertBefore
   */
  appendView(view, insertBefore) {
    if (this._tabbedPane.hasTab(view.viewId())) {
      return;
    }
    const oldLocation = view[_Location.symbol];
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }
    view[_Location.symbol] = this;
    this._manager._views.set(view.viewId(), view);
    this._views.set(view.viewId(), view);
    let index = undefined;
    const tabIds = this._tabbedPane.tabIds();
    if (this._allowReorder) {
      const orderSetting = this._tabOrderSetting.get();
      const order = orderSetting[view.viewId()];
      for (let i = 0; order && i < tabIds.length; ++i) {
        if (orderSetting[tabIds[i]] && orderSetting[tabIds[i]] > order) {
          index = i;
          break;
        }
      }
    } else if (insertBefore) {
      for (let i = 0; i < tabIds.length; ++i) {
        if (tabIds[i] === insertBefore.viewId()) {
          index = i;
          break;
        }
      }
    }
    this._appendTab(view, index);

    if (view.isCloseable()) {
      const tabs = this._closeableTabSetting.get();
      const tabId = view.viewId();
      if (!tabs[tabId]) {
        tabs[tabId] = true;
        this._closeableTabSetting.set(tabs);
      }
    }
    this._persistTabOrder();
  }

  /**
   * @override
   * @param {!View} view
   * @param {?View=} insertBefore
   * @param {boolean=} userGesture
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  showView(view, insertBefore, userGesture, omitFocus) {
    this.appendView(view, insertBefore);
    this._tabbedPane.selectTab(view.viewId(), userGesture);
    if (!omitFocus) {
      this._tabbedPane.focus();
    }
    const widget = /** @type {!ContainerWidget} */ (this._tabbedPane.tabView(view.viewId()));
    return widget._materialize();
  }

  /**
   * @param {!View} view
   * @override
   */
  removeView(view) {
    if (!this._tabbedPane.hasTab(view.viewId())) {
      return;
    }

    delete view[_Location.symbol];
    this._manager._views.delete(view.viewId());
    this._tabbedPane.closeTab(view.viewId());
    this._views.delete(view.viewId());
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabSelected(event) {
    const tabId = /** @type {string} */ (event.data.tabId);
    if (this._lastSelectedTabSetting && event.data['isUserGesture']) {
      this._lastSelectedTabSetting.set(tabId);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabClosed(event) {
    const id = /** @type {string} */ (event.data['tabId']);
    const tabs = this._closeableTabSetting.get();
    if (tabs[id]) {
      delete tabs[id];
      this._closeableTabSetting.set(tabs);
    }
    this._views.get(id).disposeView();
  }

  _persistTabOrder() {
    const tabIds = this._tabbedPane.tabIds();
    const tabOrders = {};
    for (let i = 0; i < tabIds.length; i++) {
      tabOrders[tabIds[i]] = (i + 1) * _TabbedLocation.orderStep;
    }

    const oldTabOrder = this._tabOrderSetting.get();
    const oldTabArray = Object.keys(oldTabOrder);
    oldTabArray.sort((a, b) => oldTabOrder[a] - oldTabOrder[b]);
    let lastOrder = 0;
    for (const key of oldTabArray) {
      if (key in tabOrders) {
        lastOrder = tabOrders[key];
        continue;
      }
      tabOrders[key] = ++lastOrder;
    }
    this._tabOrderSetting.set(tabOrders);
  }
}

_TabbedLocation.orderStep = 10;  // Keep in sync with descriptors.

/**
 * @implements {ViewLocation}
 * @unrestricted
 */
class _StackLocation extends _Location {
  /**
   * @param {!ViewManager} manager
   * @param {function()=} revealCallback
   * @param {string=} location
   */
  constructor(manager, revealCallback, location) {
    const vbox = new VBox();
    super(manager, vbox, revealCallback);
    this._vbox = vbox;

    /** @type {!Map<string, !_ExpandableContainerWidget>} */
    this._expandableContainers = new Map();

    if (location) {
      this.appendApplicableItems(location);
    }
  }

  /**
   * @override
   * @param {!View} view
   * @param {?View=} insertBefore
   */
  appendView(view, insertBefore) {
    const oldLocation = view[_Location.symbol];
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }

    let container = this._expandableContainers.get(view.viewId());
    if (!container) {
      view[_Location.symbol] = this;
      this._manager._views.set(view.viewId(), view);
      container = new _ExpandableContainerWidget(view);
      let beforeElement = null;
      if (insertBefore) {
        const beforeContainer = insertBefore[_ExpandableContainerWidget._symbol];
        beforeElement = beforeContainer ? beforeContainer.element : null;
      }
      container.show(this._vbox.contentElement, beforeElement);
      this._expandableContainers.set(view.viewId(), container);
    }
  }

  /**
   * @override
   * @param {!View} view
   * @param {?View=} insertBefore
   * @return {!Promise}
   */
  showView(view, insertBefore) {
    this.appendView(view, insertBefore);
    const container = this._expandableContainers.get(view.viewId());
    return container._expand();
  }

  /**
   * @param {!View} view
   * @override
   */
  removeView(view) {
    const container = this._expandableContainers.get(view.viewId());
    if (!container) {
      return;
    }

    container.detach();
    this._expandableContainers.delete(view.viewId());
    delete view[_Location.symbol];
    this._manager._views.delete(view.viewId());
  }

  /**
   * @override
   * @param {string} locationName
   */
  appendApplicableItems(locationName) {
    for (const view of this._manager._viewsForLocation(locationName)) {
      this.appendView(view);
    }
  }
}
