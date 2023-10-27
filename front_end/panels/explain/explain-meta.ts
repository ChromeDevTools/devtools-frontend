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
  explainConsoleMessage: '✨ Explain console message',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

if (Root.Runtime.Runtime.queryParam('enableAida') === 'true') {
  const Console = await import('../console/console.js');

  UI.ActionRegistration.registerActionExtension({
    actionId: 'explain.consoleMessage',
    category: UI.ActionRegistration.ActionCategory.EXPLAIN,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return Explain.ActionDelegate.instance();
    },
    title: i18nLazyString(UIStrings.explainConsoleMessage),
    contextTypes() {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
  });
}
