// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../shell/shell.js';
import '../../panels/mobile_throttling/mobile_throttling-meta.js';
import '../../panels/network/network-meta.js';
import '../../panels/timeline/timeline-meta.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import type * as Resources from '../../panels/application/application.js';
import type * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Main from '../main/main.js';

import * as App from './app/app.js';

const {NodeConnectionsPanel} = App.NodeConnectionsPanel;
const {NodeMainImpl} = App.NodeMain;

const UIStrings = {
  /**
   * @description Text that refers to the network connection.
   */
  connection: 'Connection',
  /**
   * @description A tag of Node.js connection panel that can be searched in the command menu.
   */
  node: 'node',
  /**
   * @description Command for showing the Connection tool.
   */
  showConnection: 'Show Connection',
  /**
   * @description Title of the 'Node' tool in the Network navigator view, which is part of the Sources tool.
   */
  networkTitle: 'Node',
  /**
   * @description Command for showing the 'Node' tool in the Network navigator view, which is part of the Sources tool.
   */
  showNode: 'Show Node',
  /**
   * @description Text in Application panel sidebar of the Application panel.
   */
  application: 'Application',
  /**
   * @description Command for showing the Application tool.
   */
  showApplication: 'Show Application',
} as const;

const str_ = i18n.i18n.registerUIStrings('entrypoints/node_app/node_app.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSourcesModule: (typeof Sources|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('../../panels/sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'node-connection',
  title: i18nLazyString(UIStrings.connection),
  commandPrompt: i18nLazyString(UIStrings.showConnection),
  order: 0,
  async loadView() {
    return new NodeConnectionsPanel();
  },
  tags: [i18nLazyString(UIStrings.node)],
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nLazyString(UIStrings.networkTitle),
  commandPrompt: i18nLazyString(UIStrings.showNode),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView(universe) {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance(
        {forceNew: null, networkProjectManager: universe.networkProjectManager});
  },
});

let loadedResourcesModule: (typeof Resources|undefined);

async function loadResourcesModule(): Promise<typeof Resources> {
  if (!loadedResourcesModule) {
    loadedResourcesModule = await import('../../panels/application/application.js');
  }
  return loadedResourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'resources',
  title: i18nLazyString(UIStrings.application),
  commandPrompt: i18nLazyString(UIStrings.showApplication),
  order: 70,
  async loadView() {
    const Resources = await loadResourcesModule();
    return Resources.ResourcesPanel.ResourcesPanel.instance({
      forceNew: true,
      mode: 'node',
    });
  },
  tags: [],
});

// @ts-expect-error Exposed for legacy layout tests
self.runtime = Root.Runtime.Runtime.instance({forceNew: true});
Common.Runnable.registerEarlyInitializationRunnable(NodeMainImpl.instance);
new Main.MainImpl.MainImpl();
