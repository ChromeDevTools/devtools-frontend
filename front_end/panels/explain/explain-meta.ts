// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Message to offer insights for a console error message
   */
  explainThisError: 'Explain this error',
  /**
   *@description Message to offer insights for a console warning message
   */
  explainThisWarning: 'Explain this warning',
  /**
   *@description Message to offer insights for a console message
   */
  explainThisMessage: 'Explain this message',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

if (Root.Runtime.Runtime.queryParam('enableAida') === 'true') {
  const Console = await import('../console/console.js');

  UI.ActionRegistration.registerActionExtension({
    experiment: Root.Runtime.ExperimentName.CONSOLE_INSIGHTS,
    actionId: 'explain.console-message.hover',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    title: i18nLazyString(UIStrings.explainThisMessage),
    contextTypes() {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
  });

  UI.ActionRegistration.registerActionExtension({
    experiment: Root.Runtime.ExperimentName.CONSOLE_INSIGHTS,
    actionId: 'explain.console-message.context.error',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    title: i18nLazyString(UIStrings.explainThisError),
    contextTypes() {
      return [];
    },
  });

  UI.ActionRegistration.registerActionExtension({
    experiment: Root.Runtime.ExperimentName.CONSOLE_INSIGHTS,
    actionId: 'explain.console-message.context.warning',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    title: i18nLazyString(UIStrings.explainThisWarning),
    contextTypes() {
      return [];
    },
  });

  UI.ActionRegistration.registerActionExtension({
    experiment: Root.Runtime.ExperimentName.CONSOLE_INSIGHTS,
    actionId: 'explain.console-message.context.other',
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    title: i18nLazyString(UIStrings.explainThisMessage),
    contextTypes() {
      return [];
    },
  });
}
