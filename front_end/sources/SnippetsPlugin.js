// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Snippets from '../snippets/snippets.js';
import * as SourceFrame from '../source_frame/source_frame.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {Plugin} from './Plugin.js';

export const UIStrings = {
  /**
  *@description Text in Snippets Plugin of the Sources panel
  */
  enter: '⌘+Enter',
  /**
  *@description Text in Snippets Plugin of the Sources panel
  */
  ctrlenter: 'Ctrl+Enter',
};
const str_ = i18n.i18n.registerUIStrings('sources/SnippetsPlugin.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SnippetsPlugin extends Plugin {
  /**
   * @param {!SourceFrame.SourcesTextEditor.SourcesTextEditor} textEditor
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    super();
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.Toolbar.ToolbarItem>>}
   */
  async rightToolbarItems() {
    const runSnippet = UI.Toolbar.Toolbar.createActionButtonForId('debugger.run-snippet');
    runSnippet.setText(Host.Platform.isMac() ? i18nString(UIStrings.enter) : i18nString(UIStrings.ctrlenter));

    return [runSnippet];
  }
}
