// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as BrowserDebugger from './browser_debugger.js';
import type * as Sources from '../sources/sources.js';

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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Elements`,
  title: (): Platform.UIString.LocalizedString => ls`Event Listener Breakpoints`,
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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show CSP Violation Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`CSP Violation Breakpoints`,
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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show XHR/fetch Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`XHR/fetch Breakpoints`,
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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show DOM Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`DOM Breakpoints`,
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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Global Listeners`,
  title: (): Platform.UIString.LocalizedString => ls`Global Listeners`,
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
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show DOM Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`DOM Breakpoints`,
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});


UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: (): Platform.UIString.LocalizedString => ls`Page`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Page`,
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
  title: (): Platform.UIString.LocalizedString => ls`Overrides`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Overrides`,
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
  title: (): Platform.UIString.LocalizedString => ls`Content scripts`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Content scripts`,
  order: 5,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.ContentScriptsNavigatorView.instance();
  },
});
