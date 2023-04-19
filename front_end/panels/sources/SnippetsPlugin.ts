// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as Snippets from '../snippets/snippets.js';

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
   *@description Text in Snippets Plugin of the Sources panel
   */
  enter: '⌘+Enter',
  /**
   *@description Text in Snippets Plugin of the Sources panel
   */
  ctrlenter: 'Ctrl+Enter',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SnippetsPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SnippetsPlugin extends Plugin {
  static override accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
  }

  override rightToolbarItems(): UI.Toolbar.ToolbarItem[] {
    const runSnippet = UI.Toolbar.Toolbar.createActionButtonForId('debugger.run-snippet');
    runSnippet.setText(Host.Platform.isMac() ? i18nString(UIStrings.enter) : i18nString(UIStrings.ctrlenter));

    return [runSnippet];
  }

  override editorExtension(): CodeMirror.Extension {
    return TextEditor.JavaScript.completion();
  }
}
