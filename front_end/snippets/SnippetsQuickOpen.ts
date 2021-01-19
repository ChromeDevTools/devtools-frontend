// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {evaluateScriptSnippet, findSnippetsProject} from './ScriptSnippetFileSystem.js';

export const UIStrings = {
  /**
  *@description Text in Snippets Quick Open of the Sources panel when opening snippets
  */
  noSnippetsFound: 'No snippets found.',
};
const str_ = i18n.i18n.registerUIStrings('snippets/SnippetsQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SnippetsQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  _snippets: Workspace.UISourceCode.UISourceCode[];
  constructor() {
    super();
    this._snippets = [];
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
