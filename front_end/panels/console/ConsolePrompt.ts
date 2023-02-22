// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ConsolePanel} from './ConsolePanel.js';
import consolePromptStyles from './consolePrompt.css.js';

const {Direction} = TextEditor.TextEditorHistory;

const UIStrings = {
  /**
   *@description Text in Console Prompt of the Console panel
   */
  consolePrompt: 'Console prompt',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePrompt.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsolePrompt extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(
    UI.Widget.Widget) {
  private addCompletionsFromHistory: boolean;
  private historyInternal: TextEditor.AutocompleteHistory.AutocompleteHistory;
  private initialText: string;
  private editor: TextEditor.TextEditor.TextEditor;
  private readonly eagerPreviewElement: HTMLDivElement;
  private textChangeThrottler: Common.Throttler.Throttler;
  private readonly formatter: ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;
  private requestPreviewBound: () => Promise<void>;
  private requestPreviewCurrent = 0;
  private readonly innerPreviewElement: HTMLElement;
  private readonly promptIcon: UI.Icon.Icon;
  private readonly iconThrottler: Common.Throttler.Throttler;
  private readonly eagerEvalSetting: Common.Settings.Setting<boolean>;
  private previewRequestForTest: Promise<void>|null;
  private highlightingNode: boolean;
  // The CodeMirror state field that controls whether the argument hints are showing.
  // If they are, the escape key will clear them. However, if they aren't, then the
  // console drawer should be hidden as a whole.
  #argumentHintsState: CodeMirror.StateField<CodeMirror.Tooltip|null>;

  #editorHistory: TextEditor.TextEditorHistory.TextEditorHistory;

  constructor() {
    super();
    this.addCompletionsFromHistory = true;
    this.historyInternal = new TextEditor.AutocompleteHistory.AutocompleteHistory(
        Common.Settings.Settings.instance().createLocalSetting('consoleHistory', []));

    this.initialText = '';
    this.eagerPreviewElement = document.createElement('div');
    this.eagerPreviewElement.classList.add('console-eager-preview');
    this.textChangeThrottler = new Common.Throttler.Throttler(150);
    this.formatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    this.requestPreviewBound = this.requestPreview.bind(this);
    this.innerPreviewElement = this.eagerPreviewElement.createChild('div', 'console-eager-inner-preview');
    this.eagerPreviewElement.appendChild(UI.Icon.Icon.create('smallicon-command-result', 'preview-result-icon'));

    const editorContainerElement = this.element.createChild('div', 'console-prompt-editor-container');
    this.element.appendChild(this.eagerPreviewElement);

    this.promptIcon = UI.Icon.Icon.create('smallicon-text-prompt', 'console-prompt-icon');
    this.element.appendChild(this.promptIcon);
    this.iconThrottler = new Common.Throttler.Throttler(0);

    this.eagerEvalSetting = Common.Settings.Settings.instance().moduleSetting('consoleEagerEval');
    this.eagerEvalSetting.addChangeListener(this.eagerSettingChanged.bind(this));
    this.eagerPreviewElement.classList.toggle('hidden', !this.eagerEvalSetting.get());

    this.element.tabIndex = 0;
    this.previewRequestForTest = null;
    this.highlightingNode = false;
    const argumentHints = TextEditor.JavaScript.argumentHints();
    this.#argumentHintsState = argumentHints[0];

    const extensions = [
      CodeMirror.keymap.of(this.editorKeymap()),
      CodeMirror.EditorView.updateListener.of(update => this.editorUpdate(update)),
      argumentHints,
      TextEditor.Config.conservativeCompletion,
      TextEditor.Config.showCompletionHint,
      CodeMirror.javascript.javascript(),
      TextEditor.Config.baseConfiguration(this.initialText),
      TextEditor.Config.autocompletion.instance(),
      CodeMirror.javascript.javascriptLanguage.data.of({
        autocomplete: (context: CodeMirror.CompletionContext): CodeMirror.CompletionResult | null =>
            this.addCompletionsFromHistory ? this.#editorHistory.historyCompletions(context) : null,
      }),
      CodeMirror.EditorView.contentAttributes.of({'aria-label': i18nString(UIStrings.consolePrompt)}),
      CodeMirror.EditorView.lineWrapping,
      CodeMirror.autocompletion({aboveCursor: true}),
    ];
    if (Root.Runtime.Runtime.queryParam('noJavaScriptCompletion') !== 'true') {
      extensions.push(TextEditor.JavaScript.completion());
    }
    const doc = this.initialText;
    const editorState = CodeMirror.EditorState.create({doc, extensions});

    this.editor = new TextEditor.TextEditor.TextEditor(editorState);
    this.editor.addEventListener('keydown', (event): void => {
      if (event.defaultPrevented) {
        event.stopPropagation();
      }
    });
    editorContainerElement.appendChild(this.editor);
    this.#editorHistory = new TextEditor.TextEditorHistory.TextEditorHistory(this.editor, this.historyInternal);

    if (this.hasFocus()) {
      this.focus();
    }
    this.element.removeAttribute('tabindex');

    this.editorSetForTest();

    // Record the console tool load time after the console prompt constructor is complete.
    Host.userMetrics.panelLoaded('console', 'DevTools.Launch.Console');
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

  private onTextChanged(): void {
    // ConsoleView and prompt both use a throttler, so we clear the preview
    // ASAP to avoid inconsistency between a fresh viewport and stale preview.
    if (this.eagerEvalSetting.get()) {
      const asSoonAsPossible = !TextEditor.Config.contentIncludingHint(this.editor.editor);
      this.previewRequestForTest = this.textChangeThrottler.schedule(this.requestPreviewBound, asSoonAsPossible);
    }
    this.updatePromptIcon();
    this.dispatchEventToListeners(Events.TextChanged);
  }

  private async requestPreview(): Promise<void> {
    const id = ++this.requestPreviewCurrent;
    let text = TextEditor.Config.contentIncludingHint(this.editor.editor).trim();
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (Root.Runtime.experiments.isEnabled('evaluateExpressionsWithSourceMaps') && executionContext) {
      const callFrame = executionContext.debuggerModel.selectedCallFrame();
      if (callFrame) {
        const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
        text = await this.substituteNames(text, nameMap);
      }
    }
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

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([consolePromptStyles]);
  }

  willHide(): void {
    if (this.highlightingNode) {
      this.highlightingNode = false;
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  history(): TextEditor.AutocompleteHistory.AutocompleteHistory {
    return this.historyInternal;
  }

  clearAutocomplete(): void {
    CodeMirror.closeCompletion(this.editor.editor);
  }

  private isCaretAtEndOfPrompt(): boolean {
    return this.editor.state.selection.main.head === this.editor.state.doc.length;
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
    return [
      {key: 'ArrowUp', run: (): boolean => this.#editorHistory.moveHistory(Direction.BACKWARD)},
      {key: 'ArrowDown', run: (): boolean => this.#editorHistory.moveHistory(Direction.FORWARD)},
      {mac: 'Ctrl-p', run: (): boolean => this.#editorHistory.moveHistory(Direction.BACKWARD, true)},
      {mac: 'Ctrl-n', run: (): boolean => this.#editorHistory.moveHistory(Direction.FORWARD, true)},
      {
        key: 'Escape',
        run: (): boolean => {
          return TextEditor.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
        },
      },
      {
        key: 'Enter',
        run: (): boolean => {
          void this.handleEnter();
          return true;
        },
        shift: CodeMirror.insertNewlineAndIndent,
      },
    ];
  }

  private async enterWillEvaluate(): Promise<boolean> {
    const {state} = this.editor;
    return state.doc.length > 0 && await TextEditor.JavaScript.isExpressionComplete(state.doc.toString());
  }

  private async handleEnter(): Promise<void> {
    if (await this.enterWillEvaluate()) {
      this.appendCommand(this.text(), true);
      TextEditor.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
      this.editor.dispatch({
        changes: {from: 0, to: this.editor.state.doc.length},
        scrollIntoView: true,
      });
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
      const message = SDK.ConsoleModel.ConsoleModel.instance().addCommandMessage(executionContext, text);
      const expression = ObjectUI.JavaScriptREPL.JavaScriptREPL.wrapObjectLiteral(text);
      void this.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
      if (ConsolePanel.instance().isShowing()) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);
      }
    }
  }

  private async evaluateCommandInConsole(
      executionContext: SDK.RuntimeModel.ExecutionContext, message: SDK.ConsoleModel.ConsoleMessage, expression: string,
      useCommandLineAPI: boolean): Promise<void> {
    if (Root.Runtime.experiments.isEnabled('evaluateExpressionsWithSourceMaps')) {
      const callFrame = executionContext.debuggerModel.selectedCallFrame();
      if (callFrame) {
        const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
        expression = await this.substituteNames(expression, nameMap);
      }
    }

    await SDK.ConsoleModel.ConsoleModel.instance().evaluateCommandInConsole(
        executionContext, message, expression, useCommandLineAPI);
  }

  private async substituteNames(expression: string, mapping: Map<string, string>): Promise<string> {
    try {
      return await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, mapping);
    } catch {
      return expression;
    }
  }

  private editorUpdate(update: CodeMirror.ViewUpdate): void {
    if (update.docChanged ||
        CodeMirror.selectedCompletion(update.state) !== CodeMirror.selectedCompletion(update.startState)) {
      this.onTextChanged();
    } else if (update.selectionSet) {
      this.updatePromptIcon();
    }
  }

  focus(): void {
    this.editor.focus();
  }

  private editorSetForTest(): void {
  }
}

export const enum Events {
  TextChanged = 'TextChanged',
}

export type EventTypes = {
  [Events.TextChanged]: void,
};
