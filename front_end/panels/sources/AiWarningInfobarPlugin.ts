// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
   * @description Infobar text announcing that the file contents have been changed by AI
   */
  aiContentWarning: 'This file contains AI-generated content',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/AiWarningInfobarPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AiWarningInfobarPlugin extends Plugin {
  #editor: TextEditor.TextEditor.TextEditor|undefined = undefined;
  #aiWarningInfobar: UI.Infobar.Infobar|null = null;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(uiSourceCode);
    this.uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
  }

  override dispose(): void {
    this.#aiWarningInfobar?.dispose();
    this.#aiWarningInfobar = null;
    this.uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
    super.dispose();
  }

  static override accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
  }

  override editorInitialized(editor: TextEditor.TextEditor.TextEditor): void {
    this.#editor = editor;
    if (this.uiSourceCode.containsAiChanges()) {
      this.#showAiWarningInfobar();
    }
  }

  #onWorkingCopyCommitted(): void {
    if (!this.uiSourceCode.containsAiChanges()) {
      this.#aiWarningInfobar?.dispose();
      this.#aiWarningInfobar = null;
    }
  }

  #showAiWarningInfobar(): void {
    const infobar = new UI.Infobar.Infobar(
        UI.Infobar.Type.WARNING, i18nString(UIStrings.aiContentWarning), undefined, undefined,
        'contains-ai-content-warning');
    this.#aiWarningInfobar = infobar;
    infobar.setCloseCallback(() => this.removeInfobar(this.#aiWarningInfobar));
    this.attachInfobar(this.#aiWarningInfobar);
  }

  attachInfobar(bar: UI.Infobar.Infobar): void {
    if (this.#editor) {
      this.#editor.dispatch({effects: SourceFrame.SourceFrame.addSourceFrameInfobar.of({element: bar.element})});
    }
  }

  removeInfobar(bar: UI.Infobar.Infobar|null): void {
    if (this.#editor && bar) {
      this.#editor.dispatch({effects: SourceFrame.SourceFrame.removeSourceFrameInfobar.of({element: bar.element})});
    }
  }
}
