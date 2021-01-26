// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

import * as ARIAUtils from './ARIAUtils.js';
import {ContextMenu} from './ContextMenu.js';  // eslint-disable-line no-unused-vars
import {Icon} from './Icon.js';
import {Events as TabbedPaneEvents, TabbedPane} from './TabbedPane.js';
import {ItemsProvider, Toolbar, ToolbarItem, ToolbarMenuButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {createTextChild} from './UIUtils.js';
import {ProvidedView, TabbedViewLocation, View, ViewLocation, ViewLocationResolver} from './View.js';  // eslint-disable-line no-unused-vars
import {getRegisteredLocationResolvers, getRegisteredViewExtensions, registerLocationResolver, registerViewExtension, ViewLocationCategoryValues, ViewLocationValues, ViewPersistence, ViewRegistration} from './ViewRegistration.js';
import {VBox, Widget} from './Widget.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {View}
 */
export class PreRegisteredView {
  /**
   * @param {!ViewRegistration} viewRegistration
   */
  constructor(viewRegistration) {
    /** @type {!ViewRegistration} */
    this._viewRegistration = viewRegistration;
    this._widgetRequested = false;
  }

  /**
   * @override
   */
  title() {
    return this._viewRegistration.title();
  }

  commandPrompt() {
    return this._viewRegistration.commandPrompt();
  }
  /**
   * @override
   */
  isCloseable() {
    return this._viewRegistration.persistence === ViewPersistence.CLOSEABLE;
  }

  /**
   * @override
   */
  isTransient() {
    return this._viewRegistration.persistence === ViewPersistence.TRANSIENT;
  }

  /**
   * @override
   */
  viewId() {
    return this._viewRegistration.id;
  }

  location() {
    return this._viewRegistration.location;
  }

  order() {
    return this._viewRegistration.order;
  }

  settings() {
    return this._viewRegistration.settings;
  }

  tags() {
    if (this._viewRegistration.tags) {
      // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
      return this._viewRegistration.tags.map(tag => tag()).join('\0');
    }
    return undefined;
  }

  persistence() {
    return this._viewRegistration.persistence;
  }

  /**
   * @override
   */
  async toolbarItems() {
    if (this._viewRegistration.hasToolbar) {
      return this.widget().then(widget => /** @type {!ItemsProvider} */ (/** @type {*} */ (widget)).toolbarItems());
    }
    return [];
  }

  /**
   * @override
   */
  async widget() {
    this._widgetRequested = true;
    return this._viewRegistration.loadView();
  }

  /**
   * @override
   */
  async disposeView() {
    if (!this._widgetRequested) {
      return;
    }

    const widget = await this.widget();
    await widget.ownerViewDisposed();
  }

  experiment() {
    return this._viewRegistration.experiment;
  }

  condition() {
    return this._viewRegistration.condition;
  }
}

/**
 * @type {!ViewManager}
 */
let viewManagerInstance;

export class ViewManager {
  /**
   * @private
   */
  constructor() {
    /** @type {!Map<string, !View>} */
    this._views = new Map();
    /** @type {!Map<string, string>} */
    this._locationNameByViewId = new Map();

    // Read override setting for location
    this._locationOverrideSetting = Common.Settings.Settings.instance().createSetting('viewsLocationOverride', {});
    const preferredExtensionLocations = this._locationOverrideSetting.get();

    // Views may define their initial ordering within a location. When the user has not reordered, we use the
    // default ordering as defined by the views themselves.

    /** @type {!Map<string, !Array<!PreRegisteredView>>} */
    const viewsByLocation = new Map();
    for (const view of getRegisteredViewExtensions()) {
      const location = view.location() || 'none';
      const views = viewsByLocation.get(location) || [];
      views.push(view);
      viewsByLocation.set(location, views);
    }

    /** @type {!Array<!PreRegisteredView>} */
    let sortedViewExtensions = [];
    for (const views of viewsByLocation.values()) {
      views.sort((firstView, secondView) => {
        const firstViewOrder = firstView.order();
        const secondViewOrder = secondView.order();
        if (firstViewOrder && secondViewOrder) {
          return firstViewOrder - secondViewOrder;
        }
        return 0;
      });
      sortedViewExtensions = sortedViewExtensions.concat(views);
    }

    for (const view of sortedViewExtensions) {
      const viewId = view.viewId();
      const location = view.location();
      if (this._views.has(viewId)) {
        throw new Error(`Duplicate view id '${viewId}'`);
      }
      this._views.set(viewId, view);
      // Use the preferred user location if available
      const locationName = preferredExtensionLocations[viewId] || location;
      this._locationNameByViewId.set(viewId, locationName);
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
   * @param {string} viewId
   * @returns {string}
   */
  locationNameForViewId(viewId) {
    const locationName = this._locationNameByViewId.get(viewId);
    if (!locationName) {
      throw new Error(`No location name for view with id ${viewId}`);
    }
    return locationName;
  }

  /**
   * Moves a view to a new location
   * @param {string} viewId
   * @param {string} locationName
   * @param {{shouldSelectTab: (boolean), overrideSaving: (boolean)}=} options - Optional parameters for selecting tab and override saving
   */
  moveView(viewId, locationName, options) {
    const defaultOptions = {shouldSelectTab: true, overrideSaving: false};
    const {shouldSelectTab, overrideSaving} = options || defaultOptions;
    if (!viewId || !locationName) {
      return;
    }

    const view = this.view(viewId);
    if (!view) {
      return;
    }

    if (!overrideSaving) {
      // Update the inner map of locations
      this._locationNameByViewId.set(viewId, locationName);

      // Update the settings of location overwrites
      const locations = this._locationOverrideSetting.get();
      locations[viewId] = locationName;
      this._locationOverrideSetting.set(locations);
    }

    // Find new location and show view there
    this.resolveLocation(locationName).then(location => {
      if (!location) {
        throw new Error('Move view: Could not resolve location for view: ' + viewId);
      }
      location._reveal();
      return location.showView(view, undefined, /* userGesture*/ true, /* omitFocus*/ false, shouldSelectTab);
    });
  }

  /**
   * @param {!View} view
   * @return {!Promise<void>}
   */
  revealView(view) {
    const location = locationForView.get(view);
    if (!location) {
      return Promise.resolve();
    }
    location._reveal();
    return location.showView(view);
  }

  /**
   * Show view in location
   * @param {string} viewId
   * @param {string} locationName
   * @param {boolean=} shouldSelectTab
   */
  showViewInLocation(viewId, locationName, shouldSelectTab = true) {
    this.moveView(viewId, locationName, {
      shouldSelectTab,
      overrideSaving: true,
    });
  }

  /**
   * @param {string} viewId
   * @return {View}
   */
  view(viewId) {
    const view = this._views.get(viewId);
    if (!view) {
      throw new Error(`No view with id ${viewId} found!`);
    }
    return view;
  }

  /**
   * @param {string} viewId
   * @return {?Widget}
   */
  materializedWidget(viewId) {
    const view = this.view(viewId);
    if (!view) {
      return null;
    }
    return widgetForView.get(view) || null;
  }

  /**
   * @param {string} viewId
   * @param {boolean=} userGesture
   * @param {boolean=} omitFocus
   * @return {!Promise<void>}
   */
  showView(viewId, userGesture, omitFocus) {
    const view = this._views.get(viewId);
    if (!view) {
      console.error('Could not find view for id: \'' + viewId + '\' ' + new Error().stack);
      return Promise.resolve();
    }

    const locationName = this._locationNameByViewId.get(viewId);

    const location = locationForView.get(view);
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
  async resolveLocation(location) {
    if (!location) {
      return /** @type {!Promise<?_Location>} */ (Promise.resolve(null));
    }
    // TODO(crbug.com/1134103): Remove this call when all ViewLocationResolver lookups are migrated
    const legacyResolverExtensions = Root.Runtime.Runtime.instance()
                                         .extensions(ViewLocationResolver)
                                         .filter(extension => extension.descriptor()['name'] === location);
    const registeredResolvers = getRegisteredLocationResolvers().filter(resolver => resolver.name === location);

    if (legacyResolverExtensions.length + registeredResolvers.length > 1) {
      throw new Error('Duplicate resolver for location: ' + location);
    }
    if (legacyResolverExtensions.length) {
      const resolver = /** @type {!ViewLocationResolver} */ (await legacyResolverExtensions[0].instance());
      return /** @type {?_Location} */ (resolver.resolveLocation(location));
    }
    if (registeredResolvers.length) {
      const resolver = /** @type {!ViewLocationResolver} */ (await registeredResolvers[0].loadResolver());
      return /** @type {?_Location} */ (resolver.resolveLocation(location));
    }
    throw new Error('Unresolved location: ' + location);
  }

  /**
   * @param {function():void=} revealCallback
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
   * @param {function():void=} revealCallback
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
    return Boolean(this._viewsForLocation(location).length);
  }

  /**
   * @param {string} location
   * @return {!Array<!View>}
   */
  _viewsForLocation(location) {
    const result = [];
    for (const [id, view] of this._views.entries()) {
      if (this._locationNameByViewId.get(id) === location) {
        result.push(view);
      }
    }
    return result;
  }
}

/** @type {!WeakMap<!View, !Widget>} */
const widgetForView = new WeakMap();

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
   * @return {!Promise<*>}
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
      widgetForView.set(this._view, widget);
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
      const widget = widgetForView.get(this._view);
      if (widget) {
        widget.show(this.element);
        this._wasShownForTest();
      }
    });
  }

  _wasShownForTest() {
    // This method is sniffed in tests.
  }
}

export class _ExpandableContainerWidget extends VBox {
  /**
   * @param {!View} view
   */
  constructor(view) {
    super(true);
    this.element.classList.add('flex-none');
    this.registerRequiredCSS('ui/viewContainers.css', {enableLegacyPatching: true});

    this._titleElement = document.createElement('div');
    this._titleElement.classList.add('expandable-view-title');
    ARIAUtils.markAsButton(this._titleElement);
    this._titleExpandIcon = Icon.create('smallicon-triangle-right', 'title-expand-icon');
    this._titleElement.appendChild(this._titleExpandIcon);
    const titleText = view.title();
    createTextChild(this._titleElement, titleText);
    ARIAUtils.setAccessibleName(this._titleElement, titleText);
    ARIAUtils.setExpanded(this._titleElement, false);
    this._titleElement.tabIndex = 0;
    self.onInvokeElement(this._titleElement, this._toggleExpanded.bind(this));
    this._titleElement.addEventListener('keydown', this._onTitleKeyDown.bind(this), false);
    this.contentElement.insertBefore(this._titleElement, this.contentElement.firstChild);

    ARIAUtils.setControls(this._titleElement, this.contentElement.createChild('slot'));
    this._view = view;
    expandableContainerForView.set(view, this);
  }

  /**
   * @override
   */
  wasShown() {
    if (this._widget && this._materializePromise) {
      this._materializePromise.then(() => {
        if (this._titleElement.classList.contains('expanded') && this._widget) {
          this._widget.show(this.element);
        }
      });
    }
  }

  /**
   * @return {!Promise<*>}
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
      widgetForView.set(this._view, widget);
      widget.show(this.element);
    }));
    this._materializePromise = Promise.all(promises);
    return this._materializePromise;
  }

  /**
   * @return {!Promise<*>}
   */
  _expand() {
    if (this._titleElement.classList.contains('expanded')) {
      return this._materialize();
    }
    this._titleElement.classList.add('expanded');
    ARIAUtils.setExpanded(this._titleElement, true);
    this._titleExpandIcon.setIconType('smallicon-triangle-down');
    return this._materialize().then(() => {
      if (this._widget) {
        this._widget.show(this.element);
      }
    });
  }

  _collapse() {
    if (!this._titleElement.classList.contains('expanded')) {
      return;
    }
    this._titleElement.classList.remove('expanded');
    ARIAUtils.setExpanded(this._titleElement, false);
    this._titleExpandIcon.setIconType('smallicon-triangle-right');
    this._materialize().then(() => {
      if (this._widget) {
        this._widget.detach();
      }
    });
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
    const keyEvent = /** @type {!KeyboardEvent} */ (event);
    if (keyEvent.key === 'ArrowLeft') {
      this._collapse();
    } else if (keyEvent.key === 'ArrowRight') {
      if (!this._titleElement.classList.contains('expanded')) {
        this._expand();
      } else if (this._widget) {
        this._widget.focus();
      }
    }
  }
}

/** @type {!WeakMap<!View, !_ExpandableContainerWidget>} */
const expandableContainerForView = new WeakMap();

class _Location {
  /**
   * @param {!ViewManager} manager
   * @param {!Widget} widget
   * @param {function():void=} revealCallback
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

  /**
   * @param {!View} view
   * @param {?View=} insertBefore
   * @param {boolean=} userGesture
   * @param {boolean=} omitFocus
   * @param {boolean=} shouldSelectTab
   * @return {!Promise<void>}
   */
  showView(view, insertBefore, userGesture, omitFocus, shouldSelectTab) {
    throw new Error('not implemented');
  }

  /**
   * @param {!View} view
   */
  removeView(view) {
    throw new Error('not implemented');
  }
}

/** @type {!WeakMap<!View, !_Location>} */
const locationForView = new WeakMap();

/**
 * @implements {TabbedViewLocation}
 */
export class _TabbedLocation extends _Location {
  /**
   * @param {!ViewManager} manager
   * @param {function():void=} revealCallback
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

    this._closeableTabSetting = Common.Settings.Settings.instance().createSetting('closeableTabs', {});
    // As we give tabs the capability to be closed we also need to add them to the setting so they are still open
    // until the user decide to close them
    this._setOrUpdateCloseableTabsSetting();

    this._tabOrderSetting = Common.Settings.Settings.instance().createSetting(location + '-tabOrder', {});
    this._tabbedPane.addEventListener(TabbedPaneEvents.TabOrderChanged, this._persistTabOrder, this);
    if (restoreSelection) {
      this._lastSelectedTabSetting = Common.Settings.Settings.instance().createSetting(location + '-selectedTab', '');
    }
    this._defaultTab = defaultTab;

    /** @type {!Map.<string, !View>} */
    this._views = new Map();

    if (location) {
      this.appendApplicableItems(location);
    }
  }

  _setOrUpdateCloseableTabsSetting() {
    // Update the setting value, we respect the closed state decided by the user
    // and append the new tabs with value of true so they are shown open
    const defaultOptionsForTabs = {'security': true};
    const tabs = this._closeableTabSetting.get();
    const newClosable = Object.assign(defaultOptionsForTabs, tabs);
    this._closeableTabSetting.set(newClosable);
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
      locationForView.set(view, this);
      if (view.isTransient()) {
        continue;
      }
      if (!view.isCloseable()) {
        this._appendTab(view);
      } else if (this._closeableTabSetting.get()[id]) {
        this._appendTab(view);
      }
    }

    // If a default tab was provided we open or select it
    if (this._defaultTab) {
      if (this._tabbedPane.hasTab(this._defaultTab)) {
        // If the tabbed pane already has the tab we just have to select it
        this._tabbedPane.selectTab(this._defaultTab);
      } else {
        // If the tab is not present already it can be because:
        // it doesn't correspond to this tabbed location
        // or because it is closed
        const view = Array.from(this._views.values()).find(view => view.viewId() === this._defaultTab);
        if (view) {
          // _defaultTab is indeed part of the views for this tabbed location
          this.showView(view);
        }
      }
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
      const title = view.title();

      if (view.viewId() === 'issues-pane') {
        contextMenu.defaultSection().appendItem(title, () => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.HamburgerMenu);
          this.showView(view, undefined, true);
        });
        continue;
      }

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
    const oldLocation = locationForView.get(view);
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }
    locationForView.set(view, this);
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
   * @param {boolean=} shouldSelectTab
   * @return {!Promise<void>}
   */
  async showView(view, insertBefore, userGesture, omitFocus, shouldSelectTab = true) {
    this.appendView(view, insertBefore);
    if (shouldSelectTab) {
      this._tabbedPane.selectTab(view.viewId(), userGesture);
    }
    if (!omitFocus) {
      this._tabbedPane.focus();
    }
    const widget = /** @type {!ContainerWidget} */ (this._tabbedPane.tabView(view.viewId()));
    await widget._materialize();
  }

  /**
   * @param {!View} view
   * @override
   */
  removeView(view) {
    if (!this._tabbedPane.hasTab(view.viewId())) {
      return;
    }

    locationForView.delete(view);
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
      tabs[id] = false;
      this._closeableTabSetting.set(tabs);
    }
    const view = this._views.get(id);
    if (view) {
      view.disposeView();
    }
  }

  _persistTabOrder() {
    const tabIds = this._tabbedPane.tabIds();
    /** @type {!Object<string, number>} */
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
 */
class _StackLocation extends _Location {
  /**
   * @param {!ViewManager} manager
   * @param {function():void=} revealCallback
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
    const oldLocation = locationForView.get(view);
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }

    let container = this._expandableContainers.get(view.viewId());
    if (!container) {
      locationForView.set(view, this);
      this._manager._views.set(view.viewId(), view);
      container = new _ExpandableContainerWidget(view);
      let beforeElement = null;
      if (insertBefore) {
        const beforeContainer = expandableContainerForView.get(insertBefore);
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
   * @return {!Promise<void>}
   */
  async showView(view, insertBefore) {
    this.appendView(view, insertBefore);
    const container = this._expandableContainers.get(view.viewId());
    if (container) {
      await container._expand();
    }
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
    locationForView.delete(view);
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

/**
 * @typedef {{viewId: string, view: (!ProvidedView|!PreRegisteredView), location: (string|null)}}
 */
// @ts-ignore typedef
export let ViewRegistry;

export {
  ViewRegistration,
  ViewPersistence,
  getRegisteredViewExtensions,
  registerViewExtension,
  ViewLocationValues,
  getRegisteredLocationResolvers,
  registerLocationResolver,
  ViewLocationCategoryValues
};
