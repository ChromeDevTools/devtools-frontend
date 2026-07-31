// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as BrowserDebugger from './browser_debugger.js';

const UIStrings = {
  /**
   * @description Command for showing the Event listener breakpoints sidebar in the Sources panel.
   */
  showEventListenerBreakpoints: 'Show Event listener breakpoints',
  /**
   * @description Title of the Event listener breakpoints sidebar in the Sources panel.
   */
  eventListenerBreakpoints: 'Event listener breakpoints',
  /**
   * @description Command for showing the CSP violation breakpoints sidebar in the Sources panel.
   */
  showCspViolationBreakpoints: 'Show CSP violation breakpoints',
  /**
   * @description Title of the CSP violation breakpoints sidebar in the Sources panel.
   */
  cspViolationBreakpoints: 'CSP violation breakpoints',
  /**
   * @description Command for showing the XHR/fetch breakpoints sidebar in the Sources panel.
   */
  showXhrfetchBreakpoints: 'Show XHR/fetch breakpoints',
  /**
   * @description Title of the XHR/fetch breakpoints sidebar in the Sources panel.
   */
  xhrfetchBreakpoints: 'XHR/fetch breakpoints',
  /**
   * @description Command for showing the DOM breakpoints sidebar.
   */
  showDomBreakpoints: 'Show DOM breakpoints',
  /**
   * @description Title of the DOM breakpoints sidebar.
   */
  domBreakpoints: 'DOM breakpoints',
  /**
   * @description Command for showing the Global listeners sidebar in the Sources panel.
   */
  showGlobalListeners: 'Show Global listeners',
  /**
   * @description Title of the Global listeners sidebar in the Sources panel.
   */
  globalListeners: 'Global listeners',
  /**
   * @description Title of the Page tab in the Sources panel.
   */
  page: 'Page',
  /**
   * @description Command for showing the Page tab in the Sources panel.
   */
  showPage: 'Show Page',
  /**
   * @description Title of the Overrides tab in the Sources panel.
   */
  overrides: 'Overrides',
  /**
   * @description Command for showing the Overrides tab in the Sources panel.
   */
  showOverrides: 'Show Overrides',
  /**
   * @description Title of the Content scripts tab in the Sources panel.
   */
  contentScripts: 'Content scripts',
  /**
   * @description Command for showing the Content scripts tab in the Sources panel.
   */
  showContentScripts: 'Show Content scripts',
  /**
   * @description Label for a button in the Sources panel that refreshes the list of global event listeners.
   */
  refreshGlobalListeners: 'Refresh global listeners',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/browser_debugger-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedBrowserDebuggerModule: (typeof BrowserDebugger|undefined);

async function loadBrowserDebuggerModule(): Promise<typeof BrowserDebugger> {
  if (!loadedBrowserDebuggerModule) {
    loadedBrowserDebuggerModule = await import('./browser_debugger.js');
  }
  return loadedBrowserDebuggerModule;
}

function maybeRetrieveContextTypes<T = unknown>(
    getClassCallBack: (loadedBrowserDebuggerModule: typeof BrowserDebugger) => T[]): T[] {
  if (loadedBrowserDebuggerModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedBrowserDebuggerModule);
}

let loadedSourcesModule: (typeof Sources|undefined);

/**
 * The sources module is imported here because the view with id `navigator-network`
 * is implemented by `NetworkNavigatorView` in sources. It cannot be registered
 * in the sources module as it belongs to the shell app and thus all apps
 * that extend from shell will have such view registered. This would cause a
 * collision with node_app as a separate view with the same id is registered in it.
 **/
async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('../sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  loadView: Common.Lazy.lazy(async universe => {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return new BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane(
        universe.eventBreakpointsManager);
  }),
  id: 'sources.event-listener-breakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nLazyString(UIStrings.showEventListenerBreakpoints),
  title: i18nLazyString(UIStrings.eventListenerBreakpoints),
  order: 9,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return new BrowserDebugger.CSPViolationBreakpointsSidebarPane.CSPViolationBreakpointsSidebarPane();
  },
  id: 'sources.csp-violation-breakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nLazyString(UIStrings.showCspViolationBreakpoints),
  title: i18nLazyString(UIStrings.cspViolationBreakpoints),
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
  },
  id: 'sources.xhr-breakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nLazyString(UIStrings.showXhrfetchBreakpoints),
  title: i18nLazyString(UIStrings.xhrfetchBreakpoints),
  order: 5,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
  },
  id: 'sources.dom-breakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nLazyString(UIStrings.showDomBreakpoints),
  title: i18nLazyString(UIStrings.domBreakpoints),
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return new BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane();
  },
  id: 'sources.global-listeners',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nLazyString(UIStrings.showGlobalListeners),
  title: i18nLazyString(UIStrings.globalListeners),
  order: 8,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
  },
  id: 'elements.dom-breakpoints',
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  commandPrompt: i18nLazyString(UIStrings.showDomBreakpoints),
  title: i18nLazyString(UIStrings.domBreakpoints),
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nLazyString(UIStrings.page),
  commandPrompt: i18nLazyString(UIStrings.showPage),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView(universe) {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance(
        {forceNew: null, networkProjectManager: universe.networkProjectManager});
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-overrides',
  title: i18nLazyString(UIStrings.overrides),
  commandPrompt: i18nLazyString(UIStrings.showOverrides),
  order: 4,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  condition: () => !Root.Runtime.Runtime.isTraceApp(),
  async loadView(universe) {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.OverridesNavigatorView.instance(
        {forceNew: null, networkProjectManager: universe.networkProjectManager});
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-content-scripts',
  title: i18nLazyString(UIStrings.contentScripts),
  commandPrompt: i18nLazyString(UIStrings.showContentScripts),
  order: 5,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  condition: () => Root.Runtime.getPathName() !== '/bundled/worker_app.html' && !Root.Runtime.Runtime.isTraceApp(),
  async loadView(universe) {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.ContentScriptsNavigatorView(universe.networkProjectManager);
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'browser-debugger.refresh-global-event-listeners',
  async loadActionDelegate() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return new BrowserDebugger.ObjectEventListenersSidebarPane.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.refreshGlobalListeners),
  iconClass: UI.ActionRegistration.IconClass.REFRESH,
  contextTypes() {
    return maybeRetrieveContextTypes(
        BrowserDebugger =>
            [BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane,
    ]);
  },
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK.DOMModel.DOMNode,
    ];
  },
  async loadProvider() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return new BrowserDebugger.DOMBreakpointsSidebarPane.ContextMenuProvider();
  },
  experiment: undefined,
});

UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
  },
});

UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
  },
});
