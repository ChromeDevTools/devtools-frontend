// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Sources from './sources.js';

let loadedSourcesModule: (typeof Sources|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('sources');
    loadedSourcesModule = await import('./sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'sources',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Sources`,
  title: (): Platform.UIString.LocalizedString => ls`Sources`,
  order: 30,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-files',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Filesystem`,
  title: (): Platform.UIString.LocalizedString => ls`Filesystem`,
  order: 3,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.FilesNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-snippets',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Snippets`,
  title: (): Platform.UIString.LocalizedString => ls`Snippets`,
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.SnippetsNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.search-sources-tab',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Search`,
  title: (): Platform.UIString.LocalizedString => ls`Search`,
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SearchSourcesView.SearchSourcesView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-recordings',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Recordings`,
  title: (): Platform.UIString.LocalizedString => ls`Recordings`,
  order: 8,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  experiment: 'recorder',
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.RecordingsNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.quick',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Quick source`,
  title: (): Platform.UIString.LocalizedString => ls`Quick source`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 1000,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.WrapperView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.threads',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Threads`,
  title: (): Platform.UIString.LocalizedString => ls`Threads`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  condition: '!sources.hide_thread_sidebar',
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ThreadsSidebarPane.ThreadsSidebarPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.scopeChain',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Scope`,
  title: (): Platform.UIString.LocalizedString => ls`Scope`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.watch',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Watch`,
  title: (): Platform.UIString.LocalizedString => ls`Watch`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  id: 'sources.jsBreakpoints',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`Breakpoints`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.JavaScriptBreakpointsSidebarPane.JavaScriptBreakpointsSidebarPane.instance();
  },
});
