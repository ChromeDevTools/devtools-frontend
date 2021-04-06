// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../core/i18n/i18n.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import type * as Workspace from '../workspace/workspace.js';

import {evaluateScriptSnippet, findSnippetsProject} from './ScriptSnippetFileSystem.js';

const UIStrings = {
  /**
  *@description Text in Snippets Quick Open of the Sources panel when opening snippets
  */
  noSnippetsFound: 'No snippets found.',
  /**
  *@description Text to run a code snippet
  */
  runSnippet: 'Run snippet',
};
const str_ = i18n.i18n.registerUIStrings('snippets/SnippetsQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let snippetsQuickOpenInstance: SnippetsQuickOpen;

export class SnippetsQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  _snippets: Workspace.UISourceCode.UISourceCode[];
  private constructor() {
    super();
    this._snippets = [];
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): SnippetsQuickOpen {
    const {forceNew} = opts;
    if (!snippetsQuickOpenInstance || forceNew) {
      snippetsQuickOpenInstance = new SnippetsQuickOpen();
    }

    return snippetsQuickOpenInstance;
  }

  selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex === null) {
      return;
    }
    evaluateScriptSnippet(this._snippets[itemIndex]);
  }

  notFoundText(_query: string): string {
    return i18nString(UIStrings.noSnippetsFound);
  }

  attach(): void {
    this._snippets = findSnippetsProject().uiSourceCodes();
  }

  detach(): void {
    this._snippets = [];
  }

  itemCount(): number {
    return this._snippets.length;
  }

  itemKeyAt(itemIndex: number): string {
    return this._snippets[itemIndex].name();
  }

  renderItem(itemIndex: number, query: string, titleElement: Element, _subtitleElement: Element): void {
    titleElement.textContent = unescape(this._snippets[itemIndex].name());
    titleElement.classList.add('monospace');
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query, true);
  }
}

QuickOpen.FilteredListWidget.registerProvider({
  prefix: '!',
  title: i18nLazyString(UIStrings.runSnippet),
  provider: () => Promise.resolve(SnippetsQuickOpen.instance()),
});
