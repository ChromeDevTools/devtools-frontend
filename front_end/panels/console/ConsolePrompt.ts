// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';

import {ConsolePanel} from './ConsolePanel.js';
import consolePromptStyles from './consolePrompt.css.js';

const {Direction} = TextEditor.TextEditorHistory;

const UIStrings = {
  /**
   * @description Text in Console Prompt of the Console panel
   */
  consolePrompt: 'Console prompt',
  /**
   * @description Warning shown to users when pasting text into the DevTools console.
   * @example {allow pasting} PH1
   */
  selfXssWarning:
      'Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Please type ‘{PH1}’ below and press Enter to allow pasting.',
  /**
   * @description Text a user needs to type in order to confirm that they are aware of the danger of pasting code into the DevTools console.
   */
  allowPasting: 'allow pasting',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePrompt.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const AI_CODE_COMPLETION_CHARACTER_LIMIT = 20_000;

export class ConsolePrompt extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(
    UI.Widget.Widget) {
  private addCompletionsFromHistory: boolean;
  #history: TextEditor.AutocompleteHistory.AutocompleteHistory;
  private initialText: string;
  private editor: TextEditor.TextEditor.TextEditor;
  private readonly eagerPreviewElement: HTMLDivElement;
  private textChangeThrottler: Common.Throttler.Throttler;
  private requestPreviewBound: () => Promise<void>;
  private requestPreviewCurrent = 0;
  private readonly innerPreviewElement: HTMLElement;
  private readonly promptIcon: IconButton.Icon.Icon;
  private readonly iconThrottler: Common.Throttler.Throttler;
  private readonly eagerEvalSetting: Common.Settings.Setting<boolean>;
  protected previewRequestForTest: Promise<void>|null;
  private highlightingNode: boolean;
  // The CodeMirror state field that controls whether the argument hints are showing.
  // If they are, the escape key will clear them. However, if they aren't, then the
  // console drawer should be hidden as a whole.
  #argumentHintsState: CodeMirror.StateField<CodeMirror.Tooltip|null>;

  #editorHistory: TextEditor.TextEditorHistory.TextEditorHistory;
  #selfXssWarningShown = false;
  #javaScriptCompletionCompartment: CodeMirror.Compartment = new CodeMirror.Compartment();

  private aidaClient?: Host.AidaClient.AidaClient;
  private aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
  private boundOnAidaAvailabilityChange?: () => Promise<void>;
  private aiCodeCompletion?: AiCodeCompletion.AiCodeCompletion.AiCodeCompletion;
  private teaser?: PanelCommon.AiCodeCompletionTeaser;
  private placeholderCompartment: CodeMirror.Compartment = new CodeMirror.Compartment();
  private aiCodeCompletionSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  private aiCodeCompletionCitations?: Host.AidaClient.Citation[] = [];

  #getJavaScriptCompletionExtensions(): CodeMirror.Extension {
    if (this.#selfXssWarningShown) {
      // No (JavaScript) completions at all while showing the self-XSS warning.
      return [];
    }
    if (Root.Runtime.Runtime.queryParam('noJavaScriptCompletion') !== 'true') {
      return [
        CodeMirror.javascript.javascript(),
        TextEditor.JavaScript.completion(),
      ];
    }
    return [CodeMirror.javascript.javascriptLanguage];
  }

  #updateJavaScriptCompletionCompartment(): void {
    const extensions = this.#getJavaScriptCompletionExtensions();
    const effects = this.#javaScriptCompletionCompartment.reconfigure(extensions);
    this.editor.dispatch({effects});
  }

  constructor() {
    super({
      jslog: `${VisualLogging.textField('console-prompt').track({
        change: true,
        keydown: 'Enter|ArrowUp|ArrowDown|PageUp',
      })}`,
    });
    this.registerRequiredCSS(consolePromptStyles);
    this.addCompletionsFromHistory = true;
    this.#history = new TextEditor.AutocompleteHistory.AutocompleteHistory(
        Common.Settings.Settings.instance().createLocalSetting('console-history', []));

    this.initialText = '';
    this.eagerPreviewElement = document.createElement('div');
    this.eagerPreviewElement.classList.add('console-eager-preview');
    this.textChangeThrottler = new Common.Throttler.Throttler(150);
    this.requestPreviewBound = this.requestPreview.bind(this);
    this.innerPreviewElement = this.eagerPreviewElement.createChild('div', 'console-eager-inner-preview');
    const previewIcon = new IconButton.Icon.Icon();
    previewIcon.name = 'chevron-left-dot';
    previewIcon.classList.add('preview-result-icon', 'medium');
    this.eagerPreviewElement.appendChild(previewIcon);

    const editorContainerElement = this.element.createChild('div', 'console-prompt-editor-container');
    this.element.appendChild(this.eagerPreviewElement);

    this.promptIcon = new IconButton.Icon.Icon();
    this.promptIcon.name = 'chevron-right';
    this.promptIcon.style.color = 'var(--icon-action)';
    this.promptIcon.classList.add('console-prompt-icon', 'medium');
    this.element.appendChild(this.promptIcon);
    this.iconThrottler = new Common.Throttler.Throttler(0);

    this.eagerEvalSetting = Common.Settings.Settings.instance().moduleSetting('console-eager-eval');
    this.eagerEvalSetting.addChangeListener(this.eagerSettingChanged.bind(this));
    this.eagerPreviewElement.classList.toggle('hidden', !this.eagerEvalSetting.get());

    this.element.tabIndex = 0;
    this.previewRequestForTest = null;
    this.highlightingNode = false;
    const argumentHints = TextEditor.JavaScript.argumentHints();
    this.#argumentHintsState = argumentHints[0];

    const autocompleteOnEnter = TextEditor.Config.DynamicSetting.bool(
        'console-autocomplete-on-enter', [], TextEditor.Config.conservativeCompletion);

    const extensions = [
      CodeMirror.keymap.of(this.editorKeymap()),
      CodeMirror.EditorView.updateListener.of(update => this.editorUpdate(update)),
      argumentHints,
      autocompleteOnEnter.instance(),
      TextEditor.Config.showCompletionHint,
      TextEditor.Config.baseConfiguration(this.initialText),
      TextEditor.Config.autocompletion.instance(),
      CodeMirror.javascript.javascriptLanguage.data.of({
        autocomplete: (context: CodeMirror.CompletionContext) =>
            this.addCompletionsFromHistory ? this.#editorHistory.historyCompletions(context) : null,
      }),
      CodeMirror.EditorView.contentAttributes.of({'aria-label': i18nString(UIStrings.consolePrompt)}),
      CodeMirror.EditorView.lineWrapping,
      CodeMirror.autocompletion({aboveCursor: true}),
      this.#javaScriptCompletionCompartment.of(this.#getJavaScriptCompletionExtensions()),
    ];

    if (this.isAiCodeCompletionEnabled()) {
      const aiCodeCompletionTeaserDismissedSetting =
          Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);
      if (!this.aiCodeCompletionSetting.get() && !aiCodeCompletionTeaserDismissedSetting.get()) {
        this.teaser = new PanelCommon.AiCodeCompletionTeaser({onDetach: this.detachAiCodeCompletionTeaser.bind(this)});
        extensions.push(this.placeholderCompartment.of(
            TextEditor.AiCodeCompletionTeaserPlaceholder.aiCodeCompletionTeaserPlaceholder(this.teaser)));
      }
      extensions.push(TextEditor.Config.aiAutoCompleteSuggestion);
    }

    const doc = this.initialText;
    const editorState = CodeMirror.EditorState.create({doc, extensions});

    this.editor = new TextEditor.TextEditor.TextEditor(editorState);

    this.editor.addEventListener('keydown', event => {
      if (event.defaultPrevented) {
        event.stopPropagation();
      }
    });
    editorContainerElement.appendChild(this.editor);
    this.#editorHistory = new TextEditor.TextEditorHistory.TextEditorHistory(this.editor, this.#history);

    if (this.hasFocus()) {
      this.focus();
    }
    this.element.removeAttribute('tabindex');

    this.editorSetForTest();

    // Record the console tool load time after the console prompt constructor is complete.
    Host.userMetrics.panelLoaded('console', 'DevTools.Launch.Console');

    if (this.isAiCodeCompletionEnabled()) {
      this.aiCodeCompletionSetting.addChangeListener(this.onAiCodeCompletionSettingChanged.bind(this));
      this.onAiCodeCompletionSettingChanged();
      this.boundOnAidaAvailabilityChange = this.onAidaAvailabilityChange.bind(this);
      Host.AidaClient.HostConfigTracker.instance().addEventListener(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.boundOnAidaAvailabilityChange);
      void this.onAidaAvailabilityChange();
    }
  }

  private eagerSettingChanged(): void {
    const enabled = this.eagerEvalSetting.get();
    this.eagerPreviewElement.classList.toggle('hidden', !enabled);
    if (enabled) {
      void this.requestPreview();
    }
  }

  belowEditorElement(): Element {
    return this.eagerPreviewElement;
  }

  private onTextChanged(docContentChanged?: boolean): void {
    // ConsoleView and prompt both use a throttler, so we clear the preview
    // ASAP to avoid inconsistency between a fresh viewport and stale preview.
    if (this.eagerEvalSetting.get()) {
      const asSoonAsPossible = !TextEditor.Config.contentIncludingHint(this.editor.editor);
      this.previewRequestForTest = this.textChangeThrottler.schedule(
          this.requestPreviewBound,
          asSoonAsPossible ? Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE : Common.Throttler.Scheduling.DEFAULT);
    }
    if (docContentChanged && this.aiCodeCompletion && this.isAiCodeCompletionEnabled()) {
      // Only trigger when doc content changes.
      // This ensures that it is not triggered when user is going through the options in existing completion menu.
      this.triggerAiCodeCompletion();
    }
    this.updatePromptIcon();
    this.dispatchEventToListeners(Events.TEXT_CHANGED);
  }

  triggerAiCodeCompletion(): void {
    const {doc, selection} = this.editor.state;
    const query = doc.toString();
    const cursor = selection.main.head;
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    let prefix = query.substring(0, cursor);
    if (prefix.trim().length === 0) {
      return;
    }
    if (currentExecutionContext) {
      const consoleModel = currentExecutionContext.target().model(SDK.ConsoleModel.ConsoleModel);
      if (consoleModel) {
        let lastMessage = '';
        let consoleMessages = '';
        for (const message of consoleModel.messages()) {
          if (message.type !== SDK.ConsoleModel.FrontendMessageType.Command || message.messageText === lastMessage) {
            continue;
          }
          lastMessage = message.messageText;
          consoleMessages = consoleMessages + message.messageText + '\n\n';
        }
        prefix = consoleMessages + prefix;
      }
    }
    let suffix = query.substring(cursor);
    if (prefix.length > AI_CODE_COMPLETION_CHARACTER_LIMIT) {
      prefix = prefix.substring(prefix.length - AI_CODE_COMPLETION_CHARACTER_LIMIT);
    }
    if (suffix.length > AI_CODE_COMPLETION_CHARACTER_LIMIT) {
      suffix = suffix.substring(0, AI_CODE_COMPLETION_CHARACTER_LIMIT);
    }
    this.aiCodeCompletion?.onTextChanged(prefix, suffix, cursor);
  }

  private async requestPreview(): Promise<void> {
    const id = ++this.requestPreviewCurrent;
    const text = TextEditor.Config.contentIncludingHint(this.editor.editor).trim();
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const {preview, result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
        text, true /* throwOnSideEffect */, true /* replMode */, 500 /* timeout */);
    if (this.requestPreviewCurrent !== id) {
      return;
    }
    this.innerPreviewElement.removeChildren();
    if (preview.deepTextContent() !== TextEditor.Config.contentIncludingHint(this.editor.editor).trim()) {
      this.innerPreviewElement.appendChild(preview);
    }
    if (result && 'object' in result && result.object && result.object.subtype === 'node') {
      this.highlightingNode = true;
      SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result.object);
    } else if (this.highlightingNode) {
      this.highlightingNode = false;
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    if (result && executionContext) {
      executionContext.runtimeModel.releaseEvaluationResult(result);
    }
  }

  override willHide(): void {
    super.willHide();
    if (this.highlightingNode) {
      this.highlightingNode = false;
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    if (this.boundOnAidaAvailabilityChange) {
      Host.AidaClient.HostConfigTracker.instance().removeEventListener(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.boundOnAidaAvailabilityChange);
    }
  }

  history(): TextEditor.AutocompleteHistory.AutocompleteHistory {
    return this.#history;
  }

  clearAutocomplete(): void {
    CodeMirror.closeCompletion(this.editor.editor);
  }

  moveCaretToEndOfPrompt(): void {
    this.editor.dispatch({
      selection: CodeMirror.EditorSelection.cursor(this.editor.state.doc.length),
    });
  }

  clear(): void {
    this.editor.dispatch({
      changes: {from: 0, to: this.editor.state.doc.length},
    });
  }

  text(): string {
    return this.editor.state.doc.toString();
  }

  setAddCompletionsFromHistory(value: boolean): void {
    this.addCompletionsFromHistory = value;
  }

  private editorKeymap(): readonly CodeMirror.KeyBinding[] {
    const keymap = [
      {key: 'ArrowUp', run: () => this.#editorHistory.moveHistory(Direction.BACKWARD)},
      {key: 'ArrowDown', run: () => this.#editorHistory.moveHistory(Direction.FORWARD)},
      {mac: 'Ctrl-p', run: () => this.#editorHistory.moveHistory(Direction.BACKWARD, true)},
      {mac: 'Ctrl-n', run: () => this.#editorHistory.moveHistory(Direction.FORWARD, true)},
      {
        key: 'Escape',
        run: () => this.runOnEscape(),
      },
      {
        key: 'Ctrl-Enter',
        run: () => {
          void this.handleEnter(/* forceEvaluate */ true);
          return true;
        },
      },
      {
        key: 'Enter',
        run: () => {
          void this.handleEnter();
          return true;
        },
        shift: CodeMirror.insertNewlineAndIndent,
      },
    ];

    if (this.isAiCodeCompletionEnabled()) {
      keymap.push({
        key: 'Tab',
        run: (): boolean => {
          const {accepted, suggestion} = TextEditor.Config.acceptAiAutoCompleteSuggestion(this.editor.editor);
          if (accepted) {
            this.dispatchEventToListeners(
                Events.AI_CODE_COMPLETION_SUGGESTION_ACCEPTED, {citations: this.aiCodeCompletionCitations});
            if (suggestion?.rpcGlobalId && suggestion?.sampleId) {
              this.aiCodeCompletion?.registerUserAcceptance(suggestion.rpcGlobalId, suggestion.sampleId);
            }
          }
          return accepted;
        },
      });
    }

    return keymap;
  }

  private runOnEscape(): boolean {
    if (TextEditor.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState)) {
      return true;
    }
    if (this.aiCodeCompletion && TextEditor.Config.hasActiveAiSuggestion(this.editor.state)) {
      this.editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(null),
      });
      return true;
    }
    return false;
  }

  private async enterWillEvaluate(forceEvaluate?: boolean): Promise<boolean> {
    const {doc, selection} = this.editor.state;
    if (!doc.length) {
      return false;
    }
    if (forceEvaluate || selection.main.head < doc.length) {
      return true;
    }
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const isExpressionComplete = await TextEditor.JavaScript.isExpressionComplete(doc.toString());
    if (currentExecutionContext !== UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext)) {
      // We should not evaluate if the current context has changed since user action
      return false;
    }
    return isExpressionComplete;
  }

  showSelfXssWarning(): void {
    Common.Console.Console.instance().warn(
        i18nString(UIStrings.selfXssWarning, {PH1: i18nString(UIStrings.allowPasting)}),
        Common.Console.FrontendMessageSource.SELF_XSS);
    this.#selfXssWarningShown = true;
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelfXssWarningConsoleMessageShown);
    this.#updateJavaScriptCompletionCompartment();
  }

  private async handleEnter(forceEvaluate?: boolean): Promise<void> {
    if (this.#selfXssWarningShown && this.text() === i18nString(UIStrings.allowPasting)) {
      Common.Console.Console.instance().log(this.text());
      this.editor.dispatch({
        changes: {from: 0, to: this.editor.state.doc.length},
        scrollIntoView: true,
      });
      Common.Settings.Settings.instance()
          .createSetting('disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED)
          .set(true);
      this.#selfXssWarningShown = false;
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelfXssAllowPastingInConsole);
      this.#updateJavaScriptCompletionCompartment();
      return;
    }

    if (await this.enterWillEvaluate(forceEvaluate)) {
      this.appendCommand(this.text(), true);
      TextEditor.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
      this.editor.dispatch({
        changes: {from: 0, to: this.editor.state.doc.length},
        scrollIntoView: true,
      });
      if (this.teaser) {
        this.detachAiCodeCompletionTeaser();
        this.teaser = undefined;
      }
    } else if (this.editor.state.doc.length) {
      CodeMirror.insertNewlineAndIndent(this.editor.editor);
    } else {
      this.editor.dispatch({scrollIntoView: true});
    }
  }

  private updatePromptIcon(): void {
    void this.iconThrottler.schedule(async () => {
      this.promptIcon.classList.toggle('console-prompt-incomplete', !(await this.enterWillEvaluate()));
    });
  }

  private appendCommand(text: string, useCommandLineAPI: boolean): void {
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext) {
      const executionContext = currentExecutionContext;
      const consoleModel = executionContext.target().model(SDK.ConsoleModel.ConsoleModel);
      if (consoleModel) {
        const message = consoleModel.addCommandMessage(executionContext, text);
        const expression = ObjectUI.JavaScriptREPL.JavaScriptREPL.wrapObjectLiteral(text);
        void this.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
        if (ConsolePanel.instance().isShowing()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);
        }
      }
    }
  }

  private async evaluateCommandInConsole(
      executionContext: SDK.RuntimeModel.ExecutionContext, message: SDK.ConsoleModel.ConsoleMessage, expression: string,
      useCommandLineAPI: boolean): Promise<void> {
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame?.script.isJavaScript()) {
      const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
      expression = await this.substituteNames(expression, nameMap);
    }

    await executionContext.target()
        .model(SDK.ConsoleModel.ConsoleModel)
        ?.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
  }

  private async substituteNames(expression: string, mapping: Map<string, string|null>): Promise<string> {
    try {
      return await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, mapping);
    } catch {
      return expression;
    }
  }

  private editorUpdate(update: CodeMirror.ViewUpdate): void {
    if (update.docChanged ||
        CodeMirror.selectedCompletion(update.state) !== CodeMirror.selectedCompletion(update.startState)) {
      const docContentChanged = update.state.doc !== update.startState.doc;
      this.onTextChanged(docContentChanged);
    } else if (update.selectionSet) {
      this.updatePromptIcon();
    }
  }

  override focus(): void {
    this.editor.focus();
  }

  // TODO(b/435654172): Refactor and move aiCodeCompletion model one level up to avoid
  // defining additional listeners and events.
  private setAiCodeCompletion(): void {
    if (this.aiCodeCompletion) {
      return;
    }
    if (!this.aidaClient) {
      this.aidaClient = new Host.AidaClient.AidaClient();
    }
    if (this.teaser) {
      this.detachAiCodeCompletionTeaser();
      this.teaser = undefined;
    }
    this.aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: this.aidaClient}, this.editor, AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE, ['\n\n']);
    this.aiCodeCompletion.addEventListener(AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED, event => {
      this.aiCodeCompletionCitations = event.data.citations;
      this.dispatchEventToListeners(Events.AI_CODE_COMPLETION_RESPONSE_RECEIVED, event.data);
    });
    this.aiCodeCompletion.addEventListener(AiCodeCompletion.AiCodeCompletion.Events.REQUEST_TRIGGERED, event => {
      this.dispatchEventToListeners(Events.AI_CODE_COMPLETION_REQUEST_TRIGGERED, event.data);
    });
  }

  private onAiCodeCompletionSettingChanged(): void {
    if (this.aiCodeCompletionSetting.get() && this.isAiCodeCompletionEnabled()) {
      this.setAiCodeCompletion();
    } else if (this.aiCodeCompletion) {
      this.aiCodeCompletion.remove();
      this.aiCodeCompletion = undefined;
    }
  }

  private async onAidaAvailabilityChange(): Promise<void> {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.aidaAvailability) {
      this.aidaAvailability = currentAidaAvailability;
      if (this.aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
        this.onAiCodeCompletionSettingChanged();
      } else if (this.aiCodeCompletion) {
        this.aiCodeCompletion.remove();
        this.aiCodeCompletion = undefined;
      }
    }
  }

  async onAiCodeCompletionTeaserActionKeyDown(event: Event): Promise<void> {
    if (this.teaser?.isShowing()) {
      await this.teaser?.onAction(event);
      void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.fre');
    }
  }

  onAiCodeCompletionTeaserDismissKeyDown(event: Event): void {
    if (this.teaser?.isShowing()) {
      this.teaser?.onDismiss(event);
      void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.dismiss');
    }
  }

  private detachAiCodeCompletionTeaser(): void {
    this.editor.dispatch({
      effects: this.placeholderCompartment.reconfigure([]),
    });
  }

  private isAiCodeCompletionEnabled(): boolean {
    return Boolean(
        Root.Runtime.hostConfig.aidaAvailability?.enabled && Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
  }

  private editorSetForTest(): void {
  }

  setAidaClientForTest(aidaClient: Host.AidaClient.AidaClient): void {
    this.aidaClient = aidaClient;
  }
}

export const enum Events {
  TEXT_CHANGED = 'TextChanged',
  AI_CODE_COMPLETION_SUGGESTION_ACCEPTED = 'AiCodeCompletionSuggestionAccepted',
  AI_CODE_COMPLETION_RESPONSE_RECEIVED = 'AiCodeCompletionResponseReceived',
  AI_CODE_COMPLETION_REQUEST_TRIGGERED = 'AiCodeCompletionRequestTriggered'
}

export interface EventTypes {
  [Events.TEXT_CHANGED]: void;
  [Events.AI_CODE_COMPLETION_SUGGESTION_ACCEPTED]: AiCodeCompletion.AiCodeCompletion.ResponseReceivedEvent;
  [Events.AI_CODE_COMPLETION_RESPONSE_RECEIVED]: AiCodeCompletion.AiCodeCompletion.ResponseReceivedEvent;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [Events.AI_CODE_COMPLETION_REQUEST_TRIGGERED]: {};
}
