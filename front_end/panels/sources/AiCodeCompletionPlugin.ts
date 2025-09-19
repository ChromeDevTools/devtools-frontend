// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';

import {Plugin} from './Plugin.js';

const AI_CODE_COMPLETION_CHARACTER_LIMIT = 20_000;
const DISCLAIMER_TOOLTIP_ID = 'sources-ai-code-completion-disclaimer-tooltip';
const CITATIONS_TOOLTIP_ID = 'sources-ai-code-completion-citations-tooltip';

export class AiCodeCompletionPlugin extends Plugin {
  #aidaClient?: Host.AidaClient.AidaClient;
  #aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
  #boundOnAidaAvailabilityChange: () => Promise<void>;
  #aiCodeCompletion?: AiCodeCompletion.AiCodeCompletion.AiCodeCompletion;
  #aiCodeCompletionSetting = Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  #aiCodeCompletionTeaserDismissedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);
  #teaserCompartment = new CodeMirror.Compartment();
  #teaser?: PanelCommon.AiCodeCompletionTeaser;
  #teaserDisplayTimeout?: number;
  #editor?: TextEditor.TextEditor.TextEditor;
  #aiCodeCompletionDisclaimer?: PanelCommon.AiCodeCompletionDisclaimer;
  #aiCodeCompletionDisclaimerContainer = document.createElement('div');
  #aiCodeCompletionDisclaimerToolbarItem = new UI.Toolbar.ToolbarItem(this.#aiCodeCompletionDisclaimerContainer);
  #aiCodeCompletionCitations: Host.AidaClient.Citation[] = [];
  #aiCodeCompletionCitationsToolbar?: PanelCommon.AiCodeCompletionSummaryToolbar;
  #aiCodeCompletionCitationsToolbarContainer = document.createElement('div');
  #aiCodeCompletionCitationsToolbarAttached = false;

  #boundEditorKeyDown: (event: KeyboardEvent) => Promise<void>;
  #boundOnAiCodeCompletionSettingChanged: () => void;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(uiSourceCode);
    if (!this.#isAiCodeCompletionEnabled()) {
      throw new Error('AI code completion feature is not enabled.');
    }
    this.#boundEditorKeyDown = this.#editorKeyDown.bind(this);
    this.#boundOnAiCodeCompletionSettingChanged = this.#onAiCodeCompletionSettingChanged.bind(this);
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
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
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    this.#editor?.removeEventListener('keydown', this.#boundEditorKeyDown);
    this.#cleanupAiCodeCompletion();
    super.dispose();
  }

  override editorInitialized(editor: TextEditor.TextEditor.TextEditor): void {
    this.#editor = editor;
    this.#editor.addEventListener('keydown', this.#boundEditorKeyDown);
    this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    this.#onAiCodeCompletionSettingChanged();
    if (editor.state.doc.length === 0) {
      this.#addTeaserPluginToCompartmentImmediate(editor.editor);
    }
  }

  override editorExtension(): CodeMirror.Extension {
    return [
      CodeMirror.EditorView.updateListener.of(update => this.#editorUpdate(update)), this.#teaserCompartment.of([]),
      TextEditor.Config.aiAutoCompleteSuggestion, CodeMirror.Prec.highest(CodeMirror.keymap.of(this.#editorKeymap()))
    ];
  }

  override rightToolbarItems(): UI.Toolbar.ToolbarItem[] {
    return [this.#aiCodeCompletionDisclaimerToolbarItem];
  }

  #editorUpdate(update: CodeMirror.ViewUpdate): void {
    if (this.#teaser) {
      if (update.docChanged) {
        update.view.dispatch({effects: this.#teaserCompartment.reconfigure([])});
        this.#addTeaserPluginToCompartment(update.view);
      } else if (update.selectionSet && update.state.doc.length > 0) {
        update.view.dispatch({effects: this.#teaserCompartment.reconfigure([])});
      }
    } else if (this.#aiCodeCompletion) {
      if (update.docChanged && update.state.doc !== update.startState.doc) {
        this.#triggerAiCodeCompletion();
      }
    }
  }

  #triggerAiCodeCompletion(): void {
    if (!this.#editor || !this.#aiCodeCompletion) {
      return;
    }
    const {doc, selection} = this.#editor.state;
    const query = doc.toString();
    const cursor = selection.main.head;
    let prefix = query.substring(0, cursor);
    if (prefix.trim().length === 0) {
      return;
    }
    let suffix = query.substring(cursor);
    if (prefix.length > AI_CODE_COMPLETION_CHARACTER_LIMIT) {
      prefix = prefix.substring(prefix.length - AI_CODE_COMPLETION_CHARACTER_LIMIT);
    }
    if (suffix.length > AI_CODE_COMPLETION_CHARACTER_LIMIT) {
      suffix = suffix.substring(0, AI_CODE_COMPLETION_CHARACTER_LIMIT);
    }
    this.#aiCodeCompletion.onTextChanged(prefix, suffix, cursor, this.#getInferenceLanguage());
  }

  #editorKeymap(): readonly CodeMirror.KeyBinding[] {
    return [
      {
        key: 'Escape',
        run: (): boolean => {
          if (this.#aiCodeCompletion && this.#editor && TextEditor.Config.hasActiveAiSuggestion(this.#editor.state)) {
            this.#editor.dispatch({
              effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(null),
            });
            return true;
          }
          return false;
        },
      },
      {
        key: 'Tab',
        run: (): boolean => {
          if (this.#aiCodeCompletion && this.#editor && TextEditor.Config.hasActiveAiSuggestion(this.#editor.state)) {
            const {accepted, suggestion} = TextEditor.Config.acceptAiAutoCompleteSuggestion(this.#editor.editor);
            if (accepted) {
              if (suggestion?.rpcGlobalId && suggestion?.sampleId) {
                this.#aiCodeCompletion?.registerUserAcceptance(suggestion.rpcGlobalId, suggestion.sampleId);
              }
              this.#onAiCodeCompletionSuggestionAccepted();
            }
            return accepted;
          }
          return false;
        },
      }
    ];
  }

  async #editorKeyDown(event: KeyboardEvent): Promise<void> {
    if (!this.#teaser?.isShowing()) {
      return;
    }
    const keyboardEvent = event;
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

  #addTeaserPluginToCompartment = Common.Debouncer.debounce((view: CodeMirror.EditorView) => {
    if (this.#teaserDisplayTimeout) {
      window.clearTimeout(this.#teaserDisplayTimeout);
      this.#teaserDisplayTimeout = undefined;
    }
    this.#teaserDisplayTimeout = window.setTimeout(() => {
      this.#addTeaserPluginToCompartmentImmediate(view);
    }, AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS);
  }, AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

  #addTeaserPluginToCompartmentImmediate = (view: CodeMirror.EditorView): void => {
    if (!this.#teaser) {
      return;
    }

    view.dispatch({effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)])});
  };

  #setupAiCodeCompletion(): void {
    if (!this.#editor) {
      return;
    }
    if (!this.#aidaClient) {
      this.#aidaClient = new Host.AidaClient.AidaClient();
    }
    if (this.#teaser) {
      this.#detachAiCodeCompletionTeaser();
      this.#teaser = undefined;
    }
    if (!this.#aiCodeCompletion) {
      const contextFlavor = this.uiSourceCode.url().startsWith('snippet://') ?
          AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE :
          AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES;
      this.#aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
          {aidaClient: this.#aidaClient}, this.#editor, contextFlavor);
      this.#aiCodeCompletion.addEventListener(
          AiCodeCompletion.AiCodeCompletion.Events.REQUEST_TRIGGERED, this.#onAiRequestTriggered, this);
      this.#aiCodeCompletion.addEventListener(
          AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED, this.#onAiResponseReceived, this);
    }
    this.#createAiCodeCompletionDisclaimer();
    this.#createAiCodeCompletionCitationsToolbar();
  }

  #createAiCodeCompletionDisclaimer(): void {
    if (this.#aiCodeCompletionDisclaimer) {
      return;
    }
    this.#aiCodeCompletionDisclaimer = new PanelCommon.AiCodeCompletionDisclaimer();
    this.#aiCodeCompletionDisclaimer.disclaimerTooltipId = DISCLAIMER_TOOLTIP_ID;
    this.#aiCodeCompletionDisclaimer.show(this.#aiCodeCompletionDisclaimerContainer, undefined, true);
  }

  #createAiCodeCompletionCitationsToolbar(): void {
    if (this.#aiCodeCompletionCitationsToolbar) {
      return;
    }
    this.#aiCodeCompletionCitationsToolbar =
        new PanelCommon.AiCodeCompletionSummaryToolbar({citationsTooltipId: CITATIONS_TOOLTIP_ID, hasTopBorder: true});
    this.#aiCodeCompletionCitationsToolbar.show(this.#aiCodeCompletionCitationsToolbarContainer, undefined, true);
  }

  #attachAiCodeCompletionCitationsToolbar(): void {
    if (this.#editor) {
      this.#editor.dispatch({
        effects: SourceFrame.SourceFrame.addSourceFrameInfobar.of(
            {element: this.#aiCodeCompletionCitationsToolbarContainer, order: 100})
      });
      this.#aiCodeCompletionCitationsToolbarAttached = true;
    }
  }

  #removeAiCodeCompletionCitationsToolbar(): void {
    if (this.#editor) {
      this.#editor.dispatch({
        effects: SourceFrame.SourceFrame.removeSourceFrameInfobar.of(
            {element: this.#aiCodeCompletionCitationsToolbarContainer})
      });
      this.#aiCodeCompletionCitationsToolbarAttached = false;
    }
  }

  #onAiCodeCompletionSettingChanged(): void {
    if (this.#aiCodeCompletionSetting.get()) {
      this.#setupAiCodeCompletion();
    } else if (this.#aiCodeCompletion) {
      this.#cleanupAiCodeCompletion();
    }
  }

  async #onAidaAvailabilityChange(): Promise<void> {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      if (this.#aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
        this.#onAiCodeCompletionSettingChanged();
      } else if (this.#aiCodeCompletion) {
        this.#cleanupAiCodeCompletion();
      }
    }
  }

  #cleanupAiCodeCompletion(): void {
    this.#aiCodeCompletion?.removeEventListener(
        AiCodeCompletion.AiCodeCompletion.Events.REQUEST_TRIGGERED, this.#onAiRequestTriggered, this);
    this.#aiCodeCompletion?.removeEventListener(
        AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED, this.#onAiResponseReceived, this);
    this.#aiCodeCompletion?.remove();
    this.#aiCodeCompletion = undefined;
    this.#aiCodeCompletionCitations = [];
    this.#aiCodeCompletionDisclaimerContainer.removeChildren();
    this.#aiCodeCompletionDisclaimer = undefined;
    this.#removeAiCodeCompletionCitationsToolbar();
    this.#aiCodeCompletionCitationsToolbar = undefined;
  }

  #onAiRequestTriggered = (): void => {
    if (this.#aiCodeCompletionDisclaimer) {
      this.#aiCodeCompletionDisclaimer.loading = true;
    }
  };

  #onAiResponseReceived =
      (event: Common.EventTarget.EventTargetEvent<AiCodeCompletion.AiCodeCompletion.ResponseReceivedEvent>): void => {
        this.#aiCodeCompletionCitations = event.data.citations ?? [];
        if (this.#aiCodeCompletionDisclaimer) {
          this.#aiCodeCompletionDisclaimer.loading = false;
        }
      };

  #onAiCodeCompletionSuggestionAccepted(): void {
    if (!this.#aiCodeCompletionCitationsToolbar || this.#aiCodeCompletionCitations.length === 0) {
      return;
    }
    const citations =
        this.#aiCodeCompletionCitations.map(citation => citation.uri).filter((uri): uri is string => Boolean(uri));
    this.#aiCodeCompletionCitationsToolbar.updateCitations(citations);
    if (!this.#aiCodeCompletionCitationsToolbarAttached && citations.length > 0) {
      this.#attachAiCodeCompletionCitationsToolbar();
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

  #getInferenceLanguage(): Host.AidaClient.AidaInferenceLanguage|undefined {
    const mimeType = this.uiSourceCode.mimeType();
    switch (mimeType) {
      case 'application/javascript':
      case 'application/ecmascript':
      case 'application/x-ecmascript':
      case 'application/x-javascript':
      case 'text/ecmascript':
      case 'text/javascript1.0':
      case 'text/javascript1.1':
      case 'text/javascript1.2':
      case 'text/javascript1.3':
      case 'text/javascript1.4':
      case 'text/javascript1.5':
      case 'text/jscript':
      case 'text/livescript ':
      case 'text/x-ecmascript':
      case 'text/x-javascript':
      case 'text/javascript':
      case 'text/jsx':
        return Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT;
      case 'text/typescript':
      case 'text/typescript-jsx':
      case 'application/typescript':
        return Host.AidaClient.AidaInferenceLanguage.TYPESCRIPT;
      case 'text/css':
        return Host.AidaClient.AidaInferenceLanguage.CSS;
      case 'text/html':
        return Host.AidaClient.AidaInferenceLanguage.HTML;
      case 'text/x-python':
      case 'application/python':
        return Host.AidaClient.AidaInferenceLanguage.PYTHON;
      case 'text/x-java':
      case 'text/x-java-source':
        return Host.AidaClient.AidaInferenceLanguage.JAVA;
      case 'text/x-c++src':
      case 'text/x-csrc':
      case 'text/x-c':
        return Host.AidaClient.AidaInferenceLanguage.CPP;
      case 'application/json':
      case 'application/manifest+json':
        return Host.AidaClient.AidaInferenceLanguage.JSON;
      case 'text/markdown':
        return Host.AidaClient.AidaInferenceLanguage.MARKDOWN;
      case 'application/xml':
      case 'application/xhtml+xml':
      case 'text/xml':
        return Host.AidaClient.AidaInferenceLanguage.XML;
      case 'text/x-go':
        return Host.AidaClient.AidaInferenceLanguage.GO;
      case 'application/x-sh':
      case 'text/x-sh':
        return Host.AidaClient.AidaInferenceLanguage.BASH;
      case 'text/x-kotlin':
        return Host.AidaClient.AidaInferenceLanguage.KOTLIN;
      case 'text/x-vue':
      case 'text/x.vue':
        return Host.AidaClient.AidaInferenceLanguage.VUE;
      case 'application/vnd.dart':
        return Host.AidaClient.AidaInferenceLanguage.DART;
      default:
        return undefined;
    }
  }

  setAidaClientForTest(aidaClient: Host.AidaClient.AidaClient): void {
    this.#aidaClient = aidaClient;
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
    eventHandlers: {
      mousedown(event: MouseEvent): boolean {
        // Required for mouse click to propagate to the "Don't show again" span in teaser.
        if (event.target instanceof Node && teaser.contentElement.contains(event.target)) {
          return true;
        }
        return false;
      },
    },
  });
  return teaserPlugin;
}
