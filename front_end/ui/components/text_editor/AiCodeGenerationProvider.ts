// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiCodeGeneration from '../../../models/ai_code_generation/ai_code_generation.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import {AiCodeCompletionTeaserPlaceholder} from './AiCodeCompletionTeaserPlaceholder.js';
import type {TextEditor} from './TextEditor.js';

export enum AiCodeGenerationTeaserMode {
  ACTIVE = 'active',
  DISMISSED = 'dismissed',
}

export const setAiCodeGenerationTeaserMode = CodeMirror.StateEffect.define<AiCodeGenerationTeaserMode>();

const aiCodeGenerationTeaserModeState = CodeMirror.StateField.define<AiCodeGenerationTeaserMode>({
  create: () => AiCodeGenerationTeaserMode.ACTIVE,
  update(value, tr) {
    return tr.effects.find(effect => effect.is(setAiCodeGenerationTeaserMode))?.value ?? value;
  },
});

export class AiCodeGenerationProvider {
  #devtoolsLocale: string;
  #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  #generationTeaserCompartment = new CodeMirror.Compartment();
  #generationTeaser: PanelCommon.AiCodeGenerationTeaser;
  #editor?: TextEditor;

  #boundOnUpdateAiCodeGenerationState = this.#updateAiCodeGenerationState.bind(this);

  private constructor() {
    this.#devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
    if (!AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.isAiCodeGenerationEnabled(this.#devtoolsLocale)) {
      throw new Error('AI code generation feature is not enabled.');
    }
    this.#generationTeaser = new PanelCommon.AiCodeGenerationTeaser();
  }

  static createInstance(): AiCodeGenerationProvider {
    return new AiCodeGenerationProvider();
  }

  extension(): CodeMirror.Extension[] {
    return [
      CodeMirror.EditorView.updateListener.of(update => this.activateTeaser(update)),
      aiCodeGenerationTeaserModeState,
      this.#generationTeaserCompartment.of([]),
      CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap())),
    ];
  }

  dispose(): void {
    this.#cleanupAiCodeGeneration();
  }

  editorInitialized(editor: TextEditor): void {
    this.#editor = editor;
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnUpdateAiCodeGenerationState);
    this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeGenerationState);
    void this.#updateAiCodeGenerationState();
  }

  #setupAiCodeGeneration(): void {
    this.#editor?.dispatch({
      effects:
          [this.#generationTeaserCompartment.reconfigure([aiCodeGenerationTeaserExtension(this.#generationTeaser)])],
    });
  }

  #cleanupAiCodeGeneration(): void {
    this.#editor?.dispatch({
      effects: [this.#generationTeaserCompartment.reconfigure([])],
    });
  }

  async #updateAiCodeGenerationState(): Promise<void> {
    const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    const isAvailable = aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
    const isEnabled = this.#aiCodeCompletionSetting.get();
    if (isAvailable && isEnabled) {
      this.#setupAiCodeGeneration();
    } else {
      this.#cleanupAiCodeGeneration();
    }
  }

  #editorKeymap(): readonly CodeMirror.KeyBinding[] {
    return [
      {
        key: 'Escape',
        run: (): boolean => {
          if (!this.#editor || !this.#generationTeaser.isShowing() || !this.#generationTeaser.loading) {
            return false;
          }
          this.#editor.dispatch({effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.DISMISSED)});
          return true;
        },
      },
      {
        any: (_view: unknown, event: KeyboardEvent) => {
          if (!this.#editor || !this.#generationTeaser.isShowing()) {
            return false;
          }
          if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
            if (event.key === 'i') {
              event.consume(true);
              void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-generation.triggered');
              this.#generationTeaser.loading = true;
              return true;
            }
          }
          return false;
        }
      }
    ];
  }

  async activateTeaser(update: CodeMirror.ViewUpdate): Promise<void> {
    const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
    if (currentTeaserMode === AiCodeGenerationTeaserMode.ACTIVE) {
      return;
    }
    if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
      return;
    }
    update.view.dispatch({effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.ACTIVE)});
  }
}

// TODO(b/445899453): Handle teaser's discovery mode
function aiCodeGenerationTeaserExtension(teaser: PanelCommon.AiCodeGenerationTeaser): CodeMirror.Extension {
  return CodeMirror.ViewPlugin.fromClass(class {
    #teaserMode: AiCodeGenerationTeaserMode;

    constructor(readonly view: CodeMirror.EditorView) {
      this.#teaserMode = view.state.field(aiCodeGenerationTeaserModeState);
    }

    update(update: CodeMirror.ViewUpdate): void {
      const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
      if (currentTeaserMode !== this.#teaserMode) {
        this.#teaserMode = currentTeaserMode;
      }
      if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
        return;
      }
      if (teaser.loading) {
        teaser.loading = false;
      }
    }

    get decorations(): CodeMirror.DecorationSet {
      if (this.#teaserMode === AiCodeGenerationTeaserMode.DISMISSED) {
        return CodeMirror.Decoration.none;
      }
      const cursorPosition = this.view.state.selection.main.head;
      const line = this.view.state.doc.lineAt(cursorPosition);
      // TODO(b/445899453): Detect all types of comments
      const isComment = line.text.startsWith('//');
      const isCursorAtEndOfLine = cursorPosition >= line.to;
      if (!isComment || !isCursorAtEndOfLine) {
        return CodeMirror.Decoration.none;
      }
      return CodeMirror.Decoration.set([
        CodeMirror.Decoration.widget({widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1})
            .range(cursorPosition),
      ]);
    }
  }, {
    decorations: v => v.decorations,
  });
}
