// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Title of an action in the debugger tool to explain selection.
   */
  explainCode: '✨ Explain selected code',
  /**
   *@description Title of an action to explain a console message.
   */
  explainConsoleMessage: '✨ Explain console message',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

if (Root.Runtime.Runtime.queryParam('enableAida') === 'true') {
  const Sources = await import('../sources/sources.js');
  const Workspace = await import('../../models/workspace/workspace.js');

  UI.ActionRegistration.registerActionExtension({
    actionId: 'explain.code',
    category: UI.ActionRegistration.ActionCategory.EXPLAIN,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return Explain.ActionDelegate.instance();
    },
    title: i18nLazyString(UIStrings.explainCode),
    contextTypes() {
      return [Sources.UISourceCodeFrame.UISourceCodeFrame];
    },
  });

  class ExplainCodeContextProvider implements UI.ContextMenu.Provider {
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, _target: Object): void {
      contextMenu.debugSection().appendAction('explain.code');
    }
  }

  UI.ContextMenu.registerProvider({
    contextTypes() {
      return [Workspace.UISourceCode.UISourceCode];
    },
    async loadProvider() {
      return new ExplainCodeContextProvider();
    },
  });

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

  class ExplainConsoleMessageContextProvider implements UI.ContextMenu.Provider {
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, _target: Object): void {
      contextMenu.debugSection().appendAction('explain.consoleMessage');
    }
  }

  UI.ContextMenu.registerProvider({
    contextTypes() {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
    async loadProvider() {
      return new ExplainConsoleMessageContextProvider();
    },
  });
}
