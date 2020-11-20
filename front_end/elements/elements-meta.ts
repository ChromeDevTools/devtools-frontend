// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

async function loadElementsModule() {
  // Side-effect import resources in module.json
  await Root.Runtime.Runtime.instance().loadModulePromise('elements');

  return import('./elements.js');
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'elements',
  title: ls`Elements`,
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: false,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.ElementsPanel.ElementsPanel.instance();
  },
  experiment: undefined,
  condition: undefined,
  settings: undefined,
  tags: undefined,
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  id: 'elements.eventListeners',
  title: ls`Event Listeners`,
  order: 5,
  hasToolbar: true,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.EventListenersWidget.EventListenersWidget.instance();
  },
  settings: undefined,
  experiment: undefined,
  condition: undefined,
  tags: undefined,
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  id: 'elements.domProperties',
  title: ls`Properties`,
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.PropertiesWidget.PropertiesWidget.instance();
  },
  settings: undefined,
  condition: undefined,
  tags: undefined,
  hasToolbar: undefined,
  experiment: undefined,
});

UI.ViewManager.registerViewExtension({
  experiment: UI.UIUtils.Experiment.CAPTURE_NODE_CREATION_STACKS,
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  id: 'elements.domCreation',
  title: ls`Stack Trace`,
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.NodeStackTraceWidget.NodeStackTraceWidget.instance();
  },
  condition: undefined,
  settings: undefined,
  tags: undefined,
  hasToolbar: undefined,
});

UI.ViewManager.registerViewExtension({
  experiment: UI.UIUtils.Experiment.CSS_GRID_FEATURES,
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  id: 'elements.layout',
  title: ls`Layout`,
  order: 4,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.LayoutSidebarPane.LayoutSidebarPane.instance();
  },
  condition: undefined,
  settings: undefined,
  tags: undefined,
  hasToolbar: undefined,
});
