// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import { Icon } from '../../ui/kit/kit.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ConsolePanel } from './ConsolePanel.js';
import consolePromptStyles from './consolePrompt.css.js';
const { Direction } = TextEditor.TextEditorHistory;
const UIStrings = {
    /**
     * @description Text in Console Prompt of the Console panel
     */
    consolePrompt: 'Console prompt',
    /**
     * @description Warning shown to users when pasting text into the DevTools console.
     * @example {allow pasting} PH1
     */
    selfXssWarning: 'Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Please type ‘{PH1}’ below and press Enter to allow pasting.',
    /**
     * @description Text a user needs to type in order to confirm that they are aware of the danger of pasting code into the DevTools console.
     */
    allowPasting: 'allow pasting',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePrompt.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsolePrompt extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    addCompletionsFromHistory;
    #history;
    initialText;
    editor;
    eagerPreviewElement;
    textChangeThrottler;
    requestPreviewBound;
    requestPreviewCurrent = 0;
    innerPreviewElement;
    promptIcon;
    iconThrottler;
    eagerEvalSetting;
    previewRequestForTest;
    highlightingNode;
    // The CodeMirror state field that controls whether the argument hints are showing.
    // If they are, the escape key will clear them. However, if they aren't, then the
    // console drawer should be hidden as a whole.
    #argumentHintsState;
    #editorHistory;
    #selfXssWarningShown = false;
    #javaScriptCompletionCompartment = new CodeMirror.Compartment();
    aiCodeCompletionConfig;
    aiCodeCompletionProvider;
    #getJavaScriptCompletionExtensions() {
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
    #updateJavaScriptCompletionCompartment() {
        const extensions = this.#getJavaScriptCompletionExtensions();
        const effects = this.#javaScriptCompletionCompartment.reconfigure(extensions);
        this.editor.dispatch({ effects });
    }
    constructor(aiCodeCompletionConfig) {
        super({
            jslog: `${VisualLogging.textField('console-prompt').track({
                change: true,
                keydown: 'Enter|ArrowUp|ArrowDown|PageUp',
            })}`,
        });
        this.registerRequiredCSS(consolePromptStyles);
        this.addCompletionsFromHistory = true;
        this.#history = new TextEditor.AutocompleteHistory.AutocompleteHistory(Common.Settings.Settings.instance().createLocalSetting('console-history', []));
        this.initialText = '';
        this.eagerPreviewElement = document.createElement('div');
        this.eagerPreviewElement.classList.add('console-eager-preview');
        this.textChangeThrottler = new Common.Throttler.Throttler(150);
        this.requestPreviewBound = this.requestPreview.bind(this);
        this.innerPreviewElement = this.eagerPreviewElement.createChild('div', 'console-eager-inner-preview');
        const previewIcon = new Icon();
        previewIcon.name = 'chevron-left-dot';
        previewIcon.classList.add('preview-result-icon', 'medium');
        this.eagerPreviewElement.appendChild(previewIcon);
        const editorContainerElement = this.element.createChild('div', 'console-prompt-editor-container');
        this.element.appendChild(this.eagerPreviewElement);
        this.promptIcon = new Icon();
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
        const autocompleteOnEnter = TextEditor.Config.DynamicSetting.bool('console-autocomplete-on-enter', [], TextEditor.Config.conservativeCompletion);
        const extensions = [
            CodeMirror.keymap.of(this.editorKeymap()),
            CodeMirror.EditorView.updateListener.of(update => this.editorUpdate(update)),
            argumentHints,
            autocompleteOnEnter.instance(),
            TextEditor.Config.showCompletionHint,
            TextEditor.Config.baseConfiguration(this.initialText),
            TextEditor.Config.autocompletion.instance(),
            CodeMirror.javascript.javascriptLanguage.data.of({
                autocomplete: (context) => this.addCompletionsFromHistory ? this.#editorHistory.historyCompletions(context) : null,
            }),
            CodeMirror.EditorView.contentAttributes.of({ 'aria-label': i18nString(UIStrings.consolePrompt) }),
            CodeMirror.EditorView.lineWrapping,
            CodeMirror.autocompletion({ aboveCursor: true }),
            this.#javaScriptCompletionCompartment.of(this.#getJavaScriptCompletionExtensions()),
        ];
        this.aiCodeCompletionConfig = aiCodeCompletionConfig;
        if (this.aiCodeCompletionConfig) {
            this.aiCodeCompletionProvider =
                TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider.createInstance(this.aiCodeCompletionConfig);
            extensions.push(...this.aiCodeCompletionProvider.extension());
        }
        const doc = this.initialText;
        const editorState = CodeMirror.EditorState.create({ doc, extensions });
        this.editor = new TextEditor.TextEditor.TextEditor(editorState);
        if (this.aiCodeCompletionProvider) {
            this.aiCodeCompletionProvider.editorInitialized(this.editor);
            this.editor.editor.dispatch({
                effects: TextEditor.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(TextEditor.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY)
            });
        }
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
    }
    eagerSettingChanged() {
        const enabled = this.eagerEvalSetting.get();
        this.eagerPreviewElement.classList.toggle('hidden', !enabled);
        if (enabled) {
            void this.requestPreview();
        }
    }
    belowEditorElement() {
        return this.eagerPreviewElement;
    }
    onTextChanged() {
        // ConsoleView and prompt both use a throttler, so we clear the preview
        // ASAP to avoid inconsistency between a fresh viewport and stale preview.
        if (this.eagerEvalSetting.get()) {
            const asSoonAsPossible = !TextEditor.Config.contentIncludingHint(this.editor.editor);
            this.previewRequestForTest = this.textChangeThrottler.schedule(this.requestPreviewBound, asSoonAsPossible ? "AsSoonAsPossible" /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */ : "Default" /* Common.Throttler.Scheduling.DEFAULT */);
        }
        this.updatePromptIcon();
        this.dispatchEventToListeners("TextChanged" /* Events.TEXT_CHANGED */);
    }
    async requestPreview() {
        const id = ++this.requestPreviewCurrent;
        const text = TextEditor.Config.contentIncludingHint(this.editor.editor).trim();
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        const { preview, result } = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(text, true /* throwOnSideEffect */, true /* replMode */, 500 /* timeout */);
        if (this.requestPreviewCurrent !== id) {
            return;
        }
        this.innerPreviewElement.removeChildren();
        if (preview.deepTextContent() !== TextEditor.Config.contentIncludingHint(this.editor.editor).trim()) {
            this.innerPreviewElement.appendChild(preview);
        }
        if (result && 'object' in result && result.object?.subtype === 'node') {
            this.highlightingNode = true;
            SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result.object);
        }
        else if (this.highlightingNode) {
            this.highlightingNode = false;
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
        if (result && executionContext) {
            executionContext.runtimeModel.releaseEvaluationResult(result);
        }
    }
    willHide() {
        super.willHide();
        if (this.highlightingNode) {
            this.highlightingNode = false;
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
    }
    history() {
        return this.#history;
    }
    clearAutocomplete() {
        CodeMirror.closeCompletion(this.editor.editor);
    }
    clearAiCodeCompletionCache() {
        this.aiCodeCompletionProvider?.clearCache();
    }
    moveCaretToEndOfPrompt() {
        this.editor.dispatch({
            selection: CodeMirror.EditorSelection.cursor(this.editor.state.doc.length),
        });
    }
    clear() {
        this.editor.dispatch({
            changes: { from: 0, to: this.editor.state.doc.length },
        });
    }
    text() {
        return this.editor.state.doc.toString();
    }
    setAddCompletionsFromHistory(value) {
        this.addCompletionsFromHistory = value;
    }
    editorKeymap() {
        return [
            {
                // Handle the KeyboardEvent manually.
                any: (_view, event) => {
                    // Events with `repeat=true` are excluded from altering the history state because
                    // they are often not intended as such. Example:
                    // Scrolling through long snippets.
                    if (event.repeat) {
                        return false;
                    }
                    if (event.key === 'ArrowUp') {
                        return this.#editorHistory.moveHistory(-1 /* Direction.BACKWARD */);
                    }
                    if (event.key === 'ArrowDown') {
                        return this.#editorHistory.moveHistory(1 /* Direction.FORWARD */);
                    }
                    return false;
                },
            },
            { mac: 'Ctrl-p', run: () => this.#editorHistory.moveHistory(-1 /* Direction.BACKWARD */, true) },
            { mac: 'Ctrl-n', run: () => this.#editorHistory.moveHistory(1 /* Direction.FORWARD */, true) },
            {
                key: 'Escape',
                run: () => {
                    return TextEditor.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
                },
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
    }
    async enterWillEvaluate(forceEvaluate) {
        const { doc, selection } = this.editor.state;
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
    showSelfXssWarning() {
        Common.Console.Console.instance().warn(i18nString(UIStrings.selfXssWarning, { PH1: i18nString(UIStrings.allowPasting) }), Common.Console.FrontendMessageSource.SELF_XSS);
        this.#selfXssWarningShown = true;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelfXssWarningConsoleMessageShown);
        this.#updateJavaScriptCompletionCompartment();
    }
    async handleEnter(forceEvaluate) {
        if (this.#selfXssWarningShown &&
            (this.text() === i18nString(UIStrings.allowPasting) ||
                this.text() === `'${i18nString(UIStrings.allowPasting)}'`)) {
            Common.Console.Console.instance().log(this.text());
            this.editor.dispatch({
                changes: { from: 0, to: this.editor.state.doc.length },
                scrollIntoView: true,
            });
            Common.Settings.Settings.instance()
                .createSetting('disable-self-xss-warning', false, "Synced" /* Common.Settings.SettingStorageType.SYNCED */)
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
                changes: { from: 0, to: this.editor.state.doc.length },
                scrollIntoView: true,
            });
            if (this.aiCodeCompletionProvider) {
                const teaserMode = this.editor.editor.state.field(TextEditor.AiCodeCompletionProvider.aiCodeCompletionTeaserModeState);
                if (teaserMode !== TextEditor.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.OFF) {
                    this.editor.editor.dispatch({
                        effects: TextEditor.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(TextEditor.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.OFF)
                    });
                }
            }
        }
        else if (this.editor.state.doc.length) {
            CodeMirror.insertNewlineAndIndent(this.editor.editor);
        }
        else {
            this.editor.dispatch({ scrollIntoView: true });
        }
    }
    updatePromptIcon() {
        void this.iconThrottler.schedule(async () => {
            this.promptIcon.classList.toggle('console-prompt-incomplete', !(await this.enterWillEvaluate()));
        });
    }
    appendCommand(text, useCommandLineAPI) {
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
                    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CONSOLE_PROMPT_EXECUTED);
                }
            }
        }
    }
    async evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI) {
        const callFrame = executionContext.debuggerModel.selectedCallFrame();
        if (callFrame?.script.isJavaScript()) {
            const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
            expression = await this.substituteNames(expression, nameMap);
        }
        await executionContext.target()
            .model(SDK.ConsoleModel.ConsoleModel)
            ?.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
    }
    async substituteNames(expression, mapping) {
        try {
            return await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, mapping);
        }
        catch {
            return expression;
        }
    }
    editorUpdate(update) {
        if (update.docChanged ||
            CodeMirror.selectedCompletion(update.state) !== CodeMirror.selectedCompletion(update.startState)) {
            this.onTextChanged();
        }
        else if (update.selectionSet) {
            this.updatePromptIcon();
        }
    }
    focus() {
        this.editor.focus();
    }
    editorSetForTest() {
    }
}
//# sourceMappingURL=ConsolePrompt.js.map