// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Network from './network.js';

let loadedNetworkModule: (typeof Network|undefined);

async function loadNetworkModule() {
  if (!loadedNetworkModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('network');
    loadedNetworkModule = await import('./network.js');
  }
  return loadedNetworkModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'network',
  title: ls`Network`,
  order: 40,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.blocked-urls',
  title: ls`Network request blocking`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 60,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.BlockedURLsPane.BlockedURLsPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.config',
  title: ls`Network conditions`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 40,
  tags: [ls`disk cache`, ls`network throttling`, ls`useragent`, ls`user agent`, ls`user-agent`],
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkConfigView.NetworkConfigView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  id: 'network.search-network-tab',
  title: ls`Search`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.SearchNetworkView.instance();
  },
});
