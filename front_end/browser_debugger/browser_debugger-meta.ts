// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as BrowserDebugger from './browser_debugger.js';
import type * as Sources from '../sources/sources.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Command for showing the 'Elements' tool
  */
  showElements: 'Show Elements',
  /**
  *@description Title of the 'Event Listener Breakpoints' tool in the bottom sidebar of the Sources tool
  */
  eventListenerBreakpoints: 'Event Listener Breakpoints',
  /**
  *@description Title for showing the 'CSP Violation Breakpoints' tool in the Sources panel
  */
  showCspViolationBreakpoints: 'Show CSP Violation Breakpoints',
  /**
  *@description Title of the 'CSP Violation Breakpoints' tool in the bottom sidebar of the Sources tool
  */
  cspViolationBreakpoints: 'CSP Violation Breakpoints',
  /**
  *@description Command for showing the 'XHR/fetch Breakpoints' in the sources panel
  */
  showXhrfetchBreakpoints: 'Show XHR/fetch Breakpoints',
  /**
  *@description Title of the 'XHR/fetch Breakpoints' tool in the bottom sidebar of the Sources tool
  */
  xhrfetchBreakpoints: 'XHR/fetch Breakpoints',
  /**
  *@description Command for showing the 'DOM Breakpoints' tool in the Elements panel
  */
  showDomBreakpoints: 'Show DOM Breakpoints',
  /**
  *@description Title of the 'DOM Breakpoints' tool in the bottom sidebar of the Sources tool
  */
  domBreakpoints: 'DOM Breakpoints',
  /**
  *@description Command for showing the 'Gobal Listeners' tool in the sources panel
  */
  showGlobalListeners: 'Show Global Listeners',
  /**
  *@description Title of the 'Global Listeners' tool in the bottom sidebar of the Sources tool
  */
  globalListeners: 'Global Listeners',
  /**
  *@description Text that refers to one or a group of webpages
  */
  page: 'Page',
  /**
  *@description Command for showing the 'Page' tab in the Sources panel
  */
  showPage: 'Show Page',
  /**
  *@description Title as part of a tool to override existing configurations
  */
  overrides: 'Overrides',
  /**
  *@description Command for showing the 'Overrides' tool in the Sources panel
  */
  showOverrides: 'Show Overrides',
  /**
  *@description Title for a type of source files
  */
  contentScripts: 'Content scripts',
  /**
  *@description Command for showing the 'Content scripts' tool in the sources panel
  */
  showContentScripts: 'Show Content scripts',
};
const str_ = i18n.i18n.registerUIStrings('browser_debugger/browser_debugger-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedBrowserDebuggerModule: (typeof BrowserDebugger|undefined);

async function loadBrowserDebuggerModule(): Promise<typeof BrowserDebugger> {
  if (!loadedBrowserDebuggerModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('browser_debugger');
    loadedBrowserDebuggerModule = await import('./browser_debugger.js');
  }
  return loadedBrowserDebuggerModule;
}

let loadedSourcesModule: (typeof Sources|undefined);

//  The sources module is imported here because the view with id `navigator-network`
//  is implemented by `NetworkNavigatorView` in sources. It cannot be registered
//  in the sources module as it belongs to the shell app and thus all apps
//  that extend from shell will have such view registered. This would cause a
//  collision with node_app as a separate view with the same id is registered in it.
async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('sources');
    loadedSourcesModule = await import('../sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane.instance();
  },
  id: 'sources.eventListenerBreakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nString(UIStrings.showElements),
  title: i18nString(UIStrings.eventListenerBreakpoints),
  order: 9,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.CSPViolationBreakpointsSidebarPane.CSPViolationBreakpointsSidebarPane.instance();
  },
  id: 'sources.cspViolationBreakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nString(UIStrings.showCspViolationBreakpoints),
  title: i18nString(UIStrings.cspViolationBreakpoints),
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
  },
  id: 'sources.xhrBreakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nString(UIStrings.showXhrfetchBreakpoints),
  title: i18nString(UIStrings.xhrfetchBreakpoints),
  order: 5,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
  },
  id: 'sources.domBreakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nString(UIStrings.showDomBreakpoints),
  title: i18nString(UIStrings.domBreakpoints),
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane.instance();
  },
  id: 'sources.globalListeners',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  commandPrompt: i18nString(UIStrings.showGlobalListeners),
  title: i18nString(UIStrings.globalListeners),
  order: 8,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
  },
  id: 'elements.domBreakpoints',
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  commandPrompt: i18nString(UIStrings.showDomBreakpoints),
  title: i18nString(UIStrings.domBreakpoints),
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});


UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nString(UIStrings.page),
  commandPrompt: i18nString(UIStrings.showPage),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-overrides',
  title: i18nString(UIStrings.overrides),
  commandPrompt: i18nString(UIStrings.showOverrides),
  order: 4,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.OverridesNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-contentScripts',
  title: i18nString(UIStrings.contentScripts),
  commandPrompt: i18nString(UIStrings.showContentScripts),
  order: 5,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.ContentScriptsNavigatorView.instance();
  },
});
