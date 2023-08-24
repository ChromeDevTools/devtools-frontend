// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Sources from '../sources/sources.js';

import type * as Explain from './explain.js';

const UIStrings = {
  /**
   *@description Title of an action in the debugger tool to explain selection.
   */
   explainCode: '✨ Explain selected code',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedExplainModule: (typeof Explain|undefined);

async function loadExplainModule(): Promise<typeof Explain> {
  if (!loadedExplainModule) {
    loadedExplainModule = await import('./explain.js');
  }
  return loadedExplainModule;
}

let loadedSourcesModule: (typeof Sources|undefined);
function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (sourcesModule: typeof Sources) => T[]): T[] {
  if (loadedSourcesModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedSourcesModule);
}

if (Root.Runtime.Runtime.queryParam('enableAida') === 'true') {
  UI.ActionRegistration.registerActionExtension({
    actionId: 'explain.code',
    category: UI.ActionRegistration.ActionCategory.EXPLAIN,
    async loadActionDelegate() {
      const Explain = await loadExplainModule();
      return Explain.ActionDelegate.instance();
    },
    title: i18nLazyString(UIStrings.explainCode),
    contextTypes() {
      return maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
    },
  });

  UI.ContextMenu.registerProvider({
    contextTypes() {
      return [
        Workspace.UISourceCode.UISourceCode,
      ];
    },
    async loadProvider() {
      const Explain = await loadExplainModule();
      return new Explain.ContextMenuProvider();
    },
  });
}
