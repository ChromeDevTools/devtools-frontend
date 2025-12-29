// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import * as AiCodeGeneration from '../../../models/ai_code_generation/ai_code_generation.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import {AiCodeCompletionTeaserPlaceholder} from './AiCodeCompletionTeaserPlaceholder.js';
import {
  acceptAiAutoCompleteSuggestion,
  aiAutoCompleteSuggestion,
  aiAutoCompleteSuggestionState,
  hasActiveAiSuggestion,
  setAiAutoCompleteSuggestion,
} from './config.js';
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

export interface AiCodeGenerationConfig {
  generationContext: {
    inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage,
  };
  onSuggestionAccepted: () => void;
  onRequestTriggered: () => void;
  // TODO(b/445394511): Move exposing citations to onSuggestionAccepted
  onResponseReceived: (citations: Host.AidaClient.Citation[]) => void;
  panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}

export class AiCodeGenerationProvider {
  #devtoolsLocale: string;
  #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  #generationTeaserCompartment = new CodeMirror.Compartment();
  #generationTeaser: PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser;
  #editor?: TextEditor;
  #aiCodeGenerationConfig: AiCodeGenerationConfig;
  #aiCodeGeneration?: AiCodeGeneration.AiCodeGeneration.AiCodeGeneration;

  #aidaClient: Host.AidaClient.AidaClient = new Host.AidaClient.AidaClient();
  #boundOnUpdateAiCodeGenerationState = this.#updateAiCodeGenerationState.bind(this);
  #controller = new AbortController();

  private constructor(aiCodeGenerationConfig: AiCodeGenerationConfig) {
    this.#devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
    if (!AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.isAiCodeGenerationEnabled(this.#devtoolsLocale)) {
      throw new Error('AI code generation feature is not enabled.');
    }
    this.#generationTeaser = new PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser();
    this.#generationTeaser.disclaimerTooltipId =
        aiCodeGenerationConfig.panel + '-ai-code-generation-disclaimer-tooltip';
    this.#generationTeaser.panel = aiCodeGenerationConfig.panel;
    this.#aiCodeGenerationConfig = aiCodeGenerationConfig;
  }

  static createInstance(aiCodeGenerationConfig: AiCodeGenerationConfig): AiCodeGenerationProvider {
    return new AiCodeGenerationProvider(aiCodeGenerationConfig);
  }

  extension(): CodeMirror.Extension[] {
    return [
      CodeMirror.EditorView.updateListener.of(update => this.#activateTeaser(update)),
      CodeMirror.EditorView.updateListener.of(update => this.#abortGenerationDuringUpdate(update)),
      aiAutoCompleteSuggestion,
      aiAutoCompleteSuggestionState,
      aiCodeGenerationTeaserModeState,
      this.#generationTeaserCompartment.of([]),
      CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap())),
    ];
  }

  dispose(): void {
    this.#controller.abort();
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
    if (this.#aiCodeGeneration) {
      return;
    }
    this.#aiCodeGeneration = new AiCodeGeneration.AiCodeGeneration.AiCodeGeneration({aidaClient: this.#aidaClient});
    this.#editor?.dispatch({
      effects:
          [this.#generationTeaserCompartment.reconfigure([aiCodeGenerationTeaserExtension(this.#generationTeaser)])],
    });
  }

  #cleanupAiCodeGeneration(): void {
    if (!this.#aiCodeGeneration) {
      return;
    }
    this.#aiCodeGeneration = undefined;
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
          if (!this.#editor || !this.#aiCodeGeneration) {
            return false;
          }
          if (hasActiveAiSuggestion(this.#editor.state)) {
            this.#editor.dispatch({
              effects: setAiAutoCompleteSuggestion.of(null),
            });
            return true;
          }
          const generationTeaserIsLoading = this.#generationTeaser.displayState ===
              PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING;
          if (this.#generationTeaser.isShowing() && generationTeaserIsLoading) {
            this.#controller.abort();
            this.#controller = new AbortController();
            this.#dismissTeaser();
            return true;
          }
          return false;
        },
      },
      {
        key: 'Tab',
        run: (): boolean => {
          if (!this.#aiCodeGeneration || !this.#editor || !hasActiveAiSuggestion(this.#editor.state)) {
            return false;
          }
          const {accepted, suggestion} = acceptAiAutoCompleteSuggestion(this.#editor.editor);
          if (!accepted) {
            return false;
          }
          if (suggestion?.rpcGlobalId) {
            this.#aiCodeGeneration.registerUserAcceptance(suggestion.rpcGlobalId, suggestion.sampleId);
          }
          this.#aiCodeGenerationConfig?.onSuggestionAccepted();
          return true;
        },
      },
      {
        any: (_view: unknown, event: KeyboardEvent) => {
          if (!this.#editor || !this.#aiCodeGeneration || !this.#generationTeaser.isShowing()) {
            return false;
          }
          if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
            if (event.key === 'i') {
              event.consume(true);
              void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-generation.triggered');
              void this.#triggerAiCodeGeneration({signal: this.#controller.signal});
              return true;
            }
          }
          return false;
        }
      }
    ];
  }

  #dismissTeaser(): void {
    this.#generationTeaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER;
    this.#editor?.dispatch({effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.DISMISSED)});
  }

  #activateTeaser(update: CodeMirror.ViewUpdate): void {
    const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
    if (currentTeaserMode === AiCodeGenerationTeaserMode.ACTIVE) {
      return;
    }
    if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
      return;
    }
    update.view.dispatch({effects: setAiCodeGenerationTeaserMode.of(AiCodeGenerationTeaserMode.ACTIVE)});
  }

  /**
   * Monitors editor changes to cancel an ongoing AI generation.
   * We abort the request and dismiss the teaser if the user modifies the
   * document or moves their cursor/selection. These actions indicate the user
   * is no longer focused on the current generation point or has manually
   * resumed editing, making the pending suggestion irrelevant.
   */
  #abortGenerationDuringUpdate(update: CodeMirror.ViewUpdate): void {
    if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
      return;
    }
    const currentTeaserMode = update.state.field(aiCodeGenerationTeaserModeState);
    const generationTeaserIsLoading = this.#generationTeaser.displayState ===
        PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING;
    // Generation should be in progress
    if (currentTeaserMode === AiCodeGenerationTeaserMode.DISMISSED || !generationTeaserIsLoading) {
      return;
    }
    this.#controller.abort();
    this.#controller = new AbortController();
    this.#dismissTeaser();
  }

  async #triggerAiCodeGeneration(options?: {signal?: AbortSignal}): Promise<void> {
    if (!this.#editor || !this.#aiCodeGeneration) {
      return;
    }

    this.#generationTeaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING;
    const cursor = this.#editor.state.selection.main.head;
    // TODO(b/445899453): Detect all types of comments
    const query = this.#editor.state.doc.lineAt(cursor).text;
    if (query.trim().length === 0) {
      return;
    }

    try {
      const startTime = performance.now();
      this.#aiCodeGenerationConfig?.onRequestTriggered();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationRequestTriggered);

      const generationResponse = await this.#aiCodeGeneration.generateCode(
          query, AiCodeGeneration.AiCodeGeneration.basePreamble,
          this.#aiCodeGenerationConfig?.generationContext.inferenceLanguage, options);

      if (this.#generationTeaser) {
        this.#dismissTeaser();
      }

      if (!generationResponse || generationResponse.samples.length === 0) {
        this.#aiCodeGenerationConfig?.onResponseReceived([]);
        return;
      }
      const topSample = generationResponse.samples[0];

      const shouldBlock = topSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
      if (shouldBlock) {
        return;
      }

      const backtickRegex = /^```(?:\w+)?\n([\s\S]*?)\n```$/;
      const matchArray = topSample.generationString.match(backtickRegex);
      const suggestionText = matchArray ? matchArray[1].trim() : topSample.generationString;

      this.#editor.dispatch({
        effects: setAiAutoCompleteSuggestion.of({
          text: '\n' + suggestionText,
          from: cursor,
          rpcGlobalId: generationResponse.metadata.rpcGlobalId,
          sampleId: topSample.sampleId,
          startTime,
          onImpression: this.#aiCodeGeneration?.registerUserImpression.bind(this.#aiCodeGeneration),
        })
      });

      AiCodeGeneration.debugLog('Suggestion dispatched to the editor', suggestionText);
      const citations = topSample.attributionMetadata?.citations ?? [];
      this.#aiCodeGenerationConfig?.onResponseReceived(citations);
    } catch (e) {
      AiCodeGeneration.debugLog('Error while fetching code generation suggestions from AIDA', e);
      this.#aiCodeGenerationConfig?.onResponseReceived([]);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationError);
    }

    if (this.#generationTeaser) {
      this.#dismissTeaser();
    }
  }
}

function aiCodeGenerationTeaserExtension(teaser: PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser):
    CodeMirror.Extension {
  return CodeMirror.ViewPlugin.fromClass(class {
    #view: CodeMirror.EditorView;

    constructor(view: CodeMirror.EditorView) {
      this.#view = view;
      this.#updateTeaserState(view.state);
    }

    update(update: CodeMirror.ViewUpdate): void {
      if (!update.docChanged && update.state.selection.main.head === update.startState.selection.main.head) {
        return;
      }
      this.#updateTeaserState(update.state);
    }

    get decorations(): CodeMirror.DecorationSet {
      const teaserMode = this.#view.state.field(aiCodeGenerationTeaserModeState);
      if (teaserMode === AiCodeGenerationTeaserMode.DISMISSED) {
        return CodeMirror.Decoration.none;
      }

      const cursorPosition = this.#view.state.selection.main.head;
      const line = this.#view.state.doc.lineAt(cursorPosition);

      const isEmptyLine = line.length === 0;
      // TODO(b/445899453): Detect all types of comments
      const isComment = line.text.startsWith('//');
      const isCursorAtEndOfLine = cursorPosition >= line.to;

      if ((isEmptyLine) || (isComment && isCursorAtEndOfLine)) {
        return CodeMirror.Decoration.set([
          CodeMirror.Decoration.widget({widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1})
              .range(cursorPosition),
        ]);
      }
      return CodeMirror.Decoration.none;
    }

    #updateTeaserState(state: CodeMirror.EditorState): void {
      // Only handle non loading states, as updates during generation are handled by
      // #abortGenerationDuringUpdate in AiCodeGenerationProvider
      if (teaser.displayState === PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING) {
        return;
      }
      const cursorPosition = state.selection.main.head;
      const line = state.doc.lineAt(cursorPosition);
      const isEmptyLine = line.length === 0;
      if (isEmptyLine) {
        teaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.DISCOVERY;
      } else {
        teaser.displayState = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER;
      }
    }
  }, {
    decorations: v => v.decorations,
    eventHandlers: {
      mousemove(event: MouseEvent): boolean {
        // Required for mouse hover to propagate to the info button in teaser.
        return (event.target instanceof Node && teaser.contentElement.contains(event.target));
      },
      mousedown(event: MouseEvent): boolean {
        // Required for mouse click to propagate to the info tooltip in teaser.
        return (event.target instanceof Node && teaser.contentElement.contains(event.target));
      },
    },
  });
}
