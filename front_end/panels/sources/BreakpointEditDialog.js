// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import breakpointEditDialogStyles from './breakpointEditDialog.css.js';
const { Direction } = TextEditor.TextEditorHistory;
const UIStrings = {
    /**
     * @description Screen reader label for a select box that chooses the breakpoint type in the Sources panel when editing a breakpoint
     */
    breakpointType: 'Breakpoint type',
    /**
     * @description Text in Breakpoint Edit Dialog of the Sources panel
     */
    breakpoint: 'Breakpoint',
    /**
     * @description Tooltip text in Breakpoint Edit Dialog of the Sources panel that shows up when hovering over the close icon
     */
    closeDialog: 'Close edit dialog and save changes',
    /**
     * @description Text in Breakpoint Edit Dialog of the Sources panel
     */
    conditionalBreakpoint: 'Conditional breakpoint',
    /**
     * @description Text in Breakpoint Edit Dialog of the Sources panel
     */
    logpoint: 'Logpoint',
    /**
     * @description Text in Breakpoint Edit Dialog of the Sources panel
     */
    expressionToCheckBeforePausingEg: 'Expression to check before pausing, e.g. x > 5',
    /**
     * @description Type selector element title in Breakpoint Edit Dialog of the Sources panel
     */
    pauseOnlyWhenTheConditionIsTrue: 'Pause only when the condition is true',
    /**
     * @description Link text in the Breakpoint Edit Dialog of the Sources panel
     */
    learnMoreOnBreakpointTypes: 'Learn more: Breakpoint Types',
    /**
     * @description Text in Breakpoint Edit Dialog of the Sources panel. It is used as
     *the placeholder for a text input field before the user enters text. Provides the user with
     *an example on how to use Logpoints. 'Log' is a verb and 'message' is a noun.
     *See: https://developer.chrome.com/blog/new-in-devtools-73/#logpoints
     */
    logMessageEgXIsX: 'Log message, e.g. `\'x is\', x`',
    /**
     * @description Type selector element title in Breakpoint Edit Dialog of the Sources panel
     */
    logAMessageToConsoleDoNotBreak: 'Log a message to Console, do not break',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/BreakpointEditDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BreakpointEditDialog extends UI.Widget.Widget {
    onFinish;
    finished;
    editor;
    typeSelector;
    placeholderCompartment;
    #history;
    #editorHistory;
    constructor(editorLineNumber, oldCondition, isLogpoint, onFinish) {
        super({
            jslog: `${VisualLogging.dialog('edit-breakpoint')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(breakpointEditDialogStyles);
        const editorConfig = [
            CodeMirror.javascript.javascriptLanguage,
            TextEditor.Config.baseConfiguration(oldCondition || ''),
            TextEditor.Config.closeBrackets.instance(),
            TextEditor.Config.autocompletion.instance(),
            CodeMirror.EditorView.lineWrapping,
            TextEditor.Config.showCompletionHint,
            TextEditor.Config.conservativeCompletion,
            CodeMirror.javascript.javascriptLanguage.data.of({
                autocomplete: (context) => this.#editorHistory.historyCompletions(context),
            }),
            CodeMirror.autocompletion(),
            TextEditor.JavaScript.argumentHints(),
        ];
        this.onFinish = onFinish;
        this.finished = false;
        this.element.tabIndex = -1;
        this.element.classList.add('sources-edit-breakpoint-dialog');
        const header = this.contentElement.createChild('div', 'dialog-header');
        const toolbar = header.createChild('devtools-toolbar', 'source-frame-breakpoint-toolbar');
        toolbar.appendText(`Line ${editorLineNumber + 1}:`);
        this.typeSelector = new UI.Toolbar.ToolbarComboBox(this.onTypeChanged.bind(this), i18nString(UIStrings.breakpointType), undefined, 'type');
        this.typeSelector.createOption(i18nString(UIStrings.breakpoint), "REGULAR_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */);
        const conditionalOption = this.typeSelector.createOption(i18nString(UIStrings.conditionalBreakpoint), "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */);
        const logpointOption = this.typeSelector.createOption(i18nString(UIStrings.logpoint), "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */);
        this.typeSelector.select(isLogpoint ? logpointOption : conditionalOption);
        toolbar.appendToolbarItem(this.typeSelector);
        const content = oldCondition || '';
        const finishIfComplete = (view) => {
            void TextEditor.JavaScript.isExpressionComplete(view.state.doc.toString()).then(complete => {
                if (complete) {
                    this.finishEditing(true, this.editor.state.doc.toString());
                }
                else {
                    CodeMirror.insertNewlineAndIndent(view);
                }
            });
            return true;
        };
        const keymap = [
            { key: 'ArrowUp', run: () => this.#editorHistory.moveHistory(-1 /* Direction.BACKWARD */) },
            { key: 'ArrowDown', run: () => this.#editorHistory.moveHistory(1 /* Direction.FORWARD */) },
            { mac: 'Ctrl-p', run: () => this.#editorHistory.moveHistory(-1 /* Direction.BACKWARD */, true) },
            { mac: 'Ctrl-n', run: () => this.#editorHistory.moveHistory(1 /* Direction.FORWARD */, true) },
            {
                key: 'Mod-Enter',
                run: finishIfComplete,
            },
            {
                key: 'Enter',
                run: finishIfComplete,
            },
            {
                key: 'Shift-Enter',
                run: CodeMirror.insertNewlineAndIndent,
            },
            {
                key: 'Escape',
                run: () => {
                    this.finishEditing(false, '');
                    return true;
                },
            },
        ];
        this.placeholderCompartment = new CodeMirror.Compartment();
        const editorWrapper = this.contentElement.appendChild(document.createElement('div'));
        editorWrapper.classList.add('condition-editor');
        editorWrapper.setAttribute('jslog', `${VisualLogging.textField().track({ change: true })}`);
        this.editor = new TextEditor.TextEditor.TextEditor(CodeMirror.EditorState.create({
            doc: content,
            selection: { anchor: 0, head: content.length },
            extensions: [
                this.placeholderCompartment.of(this.getPlaceholder()),
                CodeMirror.keymap.of(keymap),
                editorConfig,
            ],
        }));
        editorWrapper.appendChild(this.editor);
        const closeIcon = createIcon('cross');
        closeIcon.title = i18nString(UIStrings.closeDialog);
        closeIcon.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        closeIcon.onclick = () => this.finishEditing(true, this.editor.state.doc.toString());
        header.appendChild(closeIcon);
        this.#history = new TextEditor.AutocompleteHistory.AutocompleteHistory(Common.Settings.Settings.instance().createLocalSetting('breakpoint-condition-history', []));
        this.#editorHistory = new TextEditor.TextEditorHistory.TextEditorHistory(this.editor, this.#history);
        const linkWrapper = this.contentElement.appendChild(document.createElement('div'));
        linkWrapper.classList.add('link-wrapper');
        const link = UI.Fragment.html `<x-link class="link devtools-link" tabindex="0" href="https://goo.gle/devtools-loc"
                                          jslog="${VisualLogging.link('learn-more')}">${i18nString(UIStrings.learnMoreOnBreakpointTypes)}</x-link>`;
        const linkIcon = createIcon('open-externally', 'link-icon');
        link.prepend(linkIcon);
        linkWrapper.appendChild(link);
        this.updateTooltip();
    }
    saveAndFinish() {
        this.finishEditing(true, this.editor.state.doc.toString());
    }
    focusEditor() {
        this.editor.editor.focus();
    }
    onTypeChanged() {
        if (this.breakpointType === "REGULAR_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */) {
            this.finishEditing(true, '');
            return;
        }
        this.focusEditor();
        this.editor.dispatch({ effects: this.placeholderCompartment.reconfigure(this.getPlaceholder()) });
        this.updateTooltip();
    }
    get breakpointType() {
        const option = this.typeSelector.selectedOption();
        return option ? option.value : null;
    }
    getPlaceholder() {
        const type = this.breakpointType;
        if (type === "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */) {
            return CodeMirror.placeholder(i18nString(UIStrings.expressionToCheckBeforePausingEg));
        }
        if (type === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */) {
            return CodeMirror.placeholder(i18nString(UIStrings.logMessageEgXIsX));
        }
        return [];
    }
    updateTooltip() {
        const type = this.breakpointType;
        if (type === "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */) {
            UI.Tooltip.Tooltip.install((this.typeSelector.element), i18nString(UIStrings.pauseOnlyWhenTheConditionIsTrue));
        }
        else if (type === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */) {
            UI.Tooltip.Tooltip.install((this.typeSelector.element), i18nString(UIStrings.logAMessageToConsoleDoNotBreak));
        }
    }
    finishEditing(committed, condition) {
        if (this.finished) {
            return;
        }
        this.finished = true;
        this.editor.remove();
        this.#history.pushHistoryItem(condition);
        const isLogpoint = this.breakpointType === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */;
        this.onFinish({ committed, condition: condition, isLogpoint });
    }
    get editorForTest() {
        return this.editor;
    }
}
//# sourceMappingURL=BreakpointEditDialog.js.map