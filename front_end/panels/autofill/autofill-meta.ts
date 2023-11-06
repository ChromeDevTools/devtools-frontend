// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Autofill from './autofill.js';

const UIStrings = {
  /**
   *@description Label for the autofill pane
   */
  autofill: 'Autofill',
  /**
   *@description Command for showing the 'Autofill' pane
   */
  showAutofill: 'Show Autofill',
};
const str_ = i18n.i18n.registerUIStrings('panels/autofill/autofill-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedAutofillModule: (typeof Autofill|undefined);

async function loadAutofillModule(): Promise<typeof Autofill> {
  if (!loadedAutofillModule) {
    loadedAutofillModule = await import('./autofill.js');
  }
  return loadedAutofillModule;
}

UI.ViewManager.registerViewExtension({
  experiment: Root.Runtime.ExperimentName.AUTOFILL_VIEW,
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'autofill-view',
  title: i18nLazyString(UIStrings.autofill),
  commandPrompt: i18nLazyString(UIStrings.showAutofill),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Autofill = await loadAutofillModule();
    return LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, new Autofill.AutofillView.AutofillView());
  },
});
