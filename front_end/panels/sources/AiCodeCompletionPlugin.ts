// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';

import {Plugin} from './Plugin.js';

export class AiCodeCompletionPlugin extends Plugin {
  #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  #aiCodeCompletionTeaserDismissedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);
  #teaserCompartment = new CodeMirror.Compartment();
  #teaser?: PanelCommon.AiCodeCompletionTeaser;
  #teaserDisplayTimeout?: number;
  #editor?: TextEditor.TextEditor.TextEditor;

  #boundEditorKeyDown: (event: Event) => Promise<void>;
  #boundOnAiCodeCompletionSettingChanged: () => void;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(uiSourceCode);
    if (!this.#isAiCodeCompletionEnabled()) {
      throw new Error('AI code completion feature is not enabled.');
    }
    this.#boundEditorKeyDown = this.#editorKeyDown.bind(this);
    this.#boundOnAiCodeCompletionSettingChanged = this.#onAiCodeCompletionSettingChanged.bind(this);
    const showTeaser = !this.#aiCodeCompletionSetting.get() && !this.#aiCodeCompletionTeaserDismissedSetting.get();
    if (showTeaser) {
      this.#teaser = new PanelCommon.AiCodeCompletionTeaser({onDetach: this.#detachAiCodeCompletionTeaser.bind(this)});
    }
  }

  static override accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
  }

  override dispose(): void {
    this.#teaser = undefined;
    this.#aiCodeCompletionSetting.removeChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    this.#editor?.removeEventListener('keydown', this.#boundEditorKeyDown);
    super.dispose();
  }

  override editorInitialized(editor: TextEditor.TextEditor.TextEditor): void {
    this.#editor = editor;
    this.#editor.addEventListener('keydown', this.#boundEditorKeyDown);
    this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    this.#onAiCodeCompletionSettingChanged();
  }

  override editorExtension(): CodeMirror.Extension {
    return [
      CodeMirror.EditorView.updateListener.of(update => this.#editorUpdate(update)),
      this.#teaserCompartment.of([]),
    ];
  }

  #editorUpdate(update: CodeMirror.ViewUpdate): void {
    if (this.#teaser) {
      if (update.docChanged) {
        update.view.dispatch({effects: this.#teaserCompartment.reconfigure([])});
        this.#addTeaserPluginToCompartment(update);
      } else if (update.selectionSet) {
        update.view.dispatch({effects: this.#teaserCompartment.reconfigure([])});
      }
    }
  }

  async #editorKeyDown(event: Event): Promise<void> {
    if (!this.#teaser?.isShowing()) {
      return;
    }
    const keyboardEvent = (event as KeyboardEvent);
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(keyboardEvent)) {
      if (keyboardEvent.key === 'i') {
        keyboardEvent.consume(true);
        void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.fre');
        await this.#teaser?.onAction(event);
      } else if (keyboardEvent.key === 'x') {
        keyboardEvent.consume(true);
        void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.dismiss');
        this.#teaser?.onDismiss(event);
      }
    }
  }

  #addTeaserPluginToCompartment = Common.Debouncer.debounce((update: CodeMirror.ViewUpdate) => {
    if (this.#teaserDisplayTimeout) {
      window.clearTimeout(this.#teaserDisplayTimeout);
      this.#teaserDisplayTimeout = undefined;
    }
    this.#teaserDisplayTimeout = window.setTimeout(() => {
      if (this.#teaser) {
        update.view.dispatch(
            {effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)])});
      }
    }, AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS);
  }, AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

  #setAiCodeCompletion(): void {
    if (this.#teaser) {
      this.#detachAiCodeCompletionTeaser();
      this.#teaser = undefined;
    }
  }

  #onAiCodeCompletionSettingChanged(): void {
    if (this.#aiCodeCompletionSetting.get()) {
      this.#setAiCodeCompletion();
    }
  }

  #detachAiCodeCompletionTeaser(): void {
    this.#editor?.dispatch({
      effects: this.#teaserCompartment.reconfigure([]),
    });
    this.#teaser = undefined;
  }

  #isAiCodeCompletionEnabled(): boolean {
    return Boolean(Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
  }
}

export function aiCodeCompletionTeaserExtension(teaser: PanelCommon.AiCodeCompletionTeaser): CodeMirror.Extension {
  const teaserPlugin = CodeMirror.ViewPlugin.fromClass(class {
    #teaserDecoration: CodeMirror.DecorationSet;

    constructor(readonly view: CodeMirror.EditorView) {
      const cursorPosition = this.view.state.selection.main.head;
      const line = this.view.state.doc.lineAt(cursorPosition);
      const column = cursorPosition - line.from;
      const isCursorAtEndOfLine = column >= line.length;
      if (isCursorAtEndOfLine) {
        this.#teaserDecoration = CodeMirror.Decoration.set([
          CodeMirror.Decoration
              .widget({
                widget: new TextEditor.AiCodeCompletionTeaserPlaceholder.AiCodeCompletionTeaserPlaceholder(teaser),
                side: 1
              })
              .range(cursorPosition),
        ]);
      } else {
        this.#teaserDecoration = CodeMirror.Decoration.none;
      }
    }

    declare update: () => void;

    get decorations(): CodeMirror.DecorationSet {
      return this.#teaserDecoration;
    }
  }, {
    decorations: v => v.decorations,
  });
  return teaserPlugin;
}
