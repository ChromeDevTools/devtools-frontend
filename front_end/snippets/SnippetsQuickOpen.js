// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


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
const str_ = i18n.i18n.registerUIStrings('snippets/SnippetsQuickOpen.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SnippetsQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  constructor() {
    super();
    /** @type {!Array<!Workspace.UISourceCode.UISourceCode>} */
    this._snippets = [];
  }
  /**
   * @override
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
    if (itemIndex === null) {
      return;
    }
    evaluateScriptSnippet(this._snippets[itemIndex]);
  }

  /**
   * @override
   * @param {string} query
   * @return {string}
   */
  notFoundText(query) {
    return i18nString(UIStrings.noSnippetsFound);
  }

  /**
   * @override
   */
  attach() {
    this._snippets = findSnippetsProject().uiSourceCodes();
  }

  /**
   * @override
   */
  detach() {
    this._snippets = [];
  }


  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._snippets.length;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @return {string}
   */
  itemKeyAt(itemIndex) {
    return this._snippets[itemIndex].name();
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @param {!Element} titleElement
   * @param {!Element} subtitleElement
   */
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    titleElement.textContent = unescape(this._snippets[itemIndex].name());
    titleElement.classList.add('monospace');
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query, true);
  }
}
