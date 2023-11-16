// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Title of an action to explain a console message.
   */
  explainConsoleMessage: 'Explain this error',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

if (Root.Runtime.Runtime.queryParam('enableAida') === 'true') {
  const Console = await import('../console/console.js');

  UI.ActionRegistration.registerActionExtension({
    actionId: 'explain.consoleMessage:hover',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return Explain.ActionDelegate.instance();
    },
    title: i18nLazyString(UIStrings.explainConsoleMessage),
    contextTypes() {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
  });

  UI.ActionRegistration.registerActionExtension({
    actionId: 'explain.consoleMessage:context',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return Explain.ActionDelegate.instance();
    },
    title: i18nLazyString(UIStrings.explainConsoleMessage),
    contextTypes() {
      return [];
    },
  });

  void isAidaAvailable().then(async result => {
    if (result) {
      document.documentElement.classList.add('aida-available');
    }
  });
}

async function isAidaAvailable(): Promise<boolean> {
  const Explain = await import('./explain.js');
  const provider = new Explain.InsightProvider();
  /* eslint-disable no-console */
  try {
    const result = await provider.getInsights('Hello world in JavaScript');
    console.info('AIDA is available', result);
    return true;
  } catch (err) {
    console.warn('AIDA is not available', err);
    return false;
  }
  /* eslint-enable no-console */
}
