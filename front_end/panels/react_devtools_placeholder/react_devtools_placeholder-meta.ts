// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as ReactDevToolsPlaceholder from './react_devtools_placeholder.js';

const UIStrings = {
  /**
   * @description Title of the React DevTools placeholder panel, plus an emoji symbolizing React Native
   */
  reactDevToolsWelcome: '⚛️ React DevTools',

  /**
   * @description Command for showing the React DevTools placeholder panel
   */
  showReactDevTools: 'Show React DevTools panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/react_devtools_placeholder/react_devtools_placeholder-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedReactDevToolsPlaceholderModule: (typeof ReactDevToolsPlaceholder|undefined);

async function loadReactDevToolsPlaceholderModule(): Promise<typeof ReactDevToolsPlaceholder> {
  if (!loadedReactDevToolsPlaceholderModule) {
    loadedReactDevToolsPlaceholderModule = await import('./react_devtools_placeholder.js');
  }
  return loadedReactDevToolsPlaceholderModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'react-devtools-placeholder',
  title: i18nLazyString(UIStrings.reactDevToolsWelcome),
  commandPrompt: i18nLazyString(UIStrings.showReactDevTools),
  order: 110,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const ReactDevToolsPlaceholder = await loadReactDevToolsPlaceholderModule();
    return ReactDevToolsPlaceholder.ReactDevToolsPlaceholder.ReactDevToolsPlaceholderImpl.instance();
  },
});
