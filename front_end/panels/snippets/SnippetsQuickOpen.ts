// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import type * as Workspace from '../../models/workspace/workspace.js';

import {evaluateScriptSnippet, findSnippetsProject} from './ScriptSnippetFileSystem.js';

const UIStrings = {
  /**
   *@description Text in Snippets Quick Open of the Sources panel when opening snippets
   */
  noSnippetsFound: 'No snippets found.',
  /**
   *@description Text for command prefix of run a code snippet
   */
  run: 'Run',
  /**
   *@description Text for suggestion of run a code snippet
   */
  snippet: 'Snippet',
};
const str_ = i18n.i18n.registerUIStrings('panels/snippets/SnippetsQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let snippetsQuickOpenInstance: SnippetsQuickOpen;

export class SnippetsQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  private snippets: Workspace.UISourceCode.UISourceCode[];
  private constructor() {
    super('snippet');
    this.snippets = [];
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): SnippetsQuickOpen {
    const {forceNew} = opts;
    if (!snippetsQuickOpenInstance || forceNew) {
      snippetsQuickOpenInstance = new SnippetsQuickOpen();
    }

    return snippetsQuickOpenInstance;
  }

  override selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex === null) {
      return;
    }
    void evaluateScriptSnippet(this.snippets[itemIndex]);
  }

  override notFoundText(_query: string): string {
    return i18nString(UIStrings.noSnippetsFound);
  }

  override attach(): void {
    this.snippets = [...findSnippetsProject().uiSourceCodes()];
  }

  override detach(): void {
    this.snippets = [];
  }

  override itemScoreAt(itemIndex: number, query: string): number {
    // Prefer short matches over long matches
    return query.length / this.snippets[itemIndex].name().length;
  }

  override itemCount(): number {
    return this.snippets.length;
  }

  override itemKeyAt(itemIndex: number): string {
    return this.snippets[itemIndex].name();
  }

  override renderItem(itemIndex: number, query: string, titleElement: Element, _subtitleElement: Element): void {
    titleElement.textContent = this.snippets[itemIndex].name();
    titleElement.classList.add('monospace');
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query, true);
  }
}

QuickOpen.FilteredListWidget.registerProvider({
  prefix: '!',
  iconName: 'exclamation',
  iconWidth: '20px',
  provider: () => Promise.resolve(SnippetsQuickOpen.instance()),
  titlePrefix: i18nLazyString(UIStrings.run),
  titleSuggestion: i18nLazyString(UIStrings.snippet),
});
