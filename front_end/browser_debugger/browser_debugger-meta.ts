// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as BrowserDebugger from './browser_debugger.js';

let loadedBrowserDebuggerModule: (typeof BrowserDebugger|undefined);

async function loadBrowserDebuggerModule() {
  if (!loadedBrowserDebuggerModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('browser_debugger');
    loadedBrowserDebuggerModule = await import('./browser_debugger.js');
  }
  return loadedBrowserDebuggerModule;
}

UI.ViewManager.registerViewExtension({
  async loadView() {
    const BrowserDebugger = await loadBrowserDebuggerModule();
    return BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane.instance();
  },
  id: 'sources.eventListenerBreakpoints',
  location: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  title: ls`Event Listener Breakpoints`,
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
  title: ls`CSP Violation Breakpoints`,
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
  title: ls`XHR/fetch Breakpoints`,
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
  title: ls`DOM Breakpoints`,
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
  title: ls`Global Listeners`,
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
  title: ls`DOM Breakpoints`,
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
});
