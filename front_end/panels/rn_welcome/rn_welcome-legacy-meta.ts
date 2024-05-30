// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as RNWelcome from './rn_welcome.js';

const UIStrings = {
  /**
   * @description Title of the Welcome panel, plus an emoji symbolizing React Native
   */
  rnWelcome: '⚛️ Welcome',

  /**
   * @description Command for showing the Welcome panel
   */
  showRnWelcome: 'Show React Native Welcome panel',
  /** @description The name of the debugging product */
  debuggerBrandName: 'React Native JS Inspector',
};
const str_ = i18n.i18n.registerUIStrings('panels/rn_welcome/rn_welcome-legacy-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedRNWelcomeModule: (typeof RNWelcome|undefined);

async function loadRNWelcomeModule(): Promise<typeof RNWelcome> {
  if (!loadedRNWelcomeModule) {
    loadedRNWelcomeModule = await import('./rn_welcome.js');
  }
  return loadedRNWelcomeModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'rn-welcome',
  title: i18nLazyString(UIStrings.rnWelcome),
  commandPrompt: i18nLazyString(UIStrings.showRnWelcome),
  order: -10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const RNWelcome = await loadRNWelcomeModule();
    return RNWelcome.RNWelcome.RNWelcomeImpl.instance({
      debuggerBrandName: i18nLazyString(UIStrings.debuggerBrandName),
      showTechPreviewLabel: true,
    });
  },
  experiment: Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI,
});
