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
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import breakpointEditDialogStyles from './breakpointEditDialog.css.js';
const { ref } = Directives;
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
export const DEFAULT_VIEW = (input, output, target) => {
    const editorRef = (e) => {
        output.editor = e;
    };
    const onTypeChanged = (event) => {
        if (event.target instanceof HTMLSelectElement && event.target.selectedOptions.length === 1) {
            input.onTypeChanged(event.target.selectedOptions.item(0)?.value);
        }
        output.editor?.focus();
    };
    // clang-format off
    render(html `
    <style>${breakpointEditDialogStyles}</style>
    <div class=dialog-header>
      <devtools-toolbar class=source-frame-breakpoint-toolbar>Line ${input.editorLineNumber + 1}:
        <select
          class=type-selector
          title=${input.breakpointType === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */
        ? i18nString(UIStrings.logAMessageToConsoleDoNotBreak)
        : i18nString(UIStrings.pauseOnlyWhenTheConditionIsTrue)}
          aria-label=${i18nString(UIStrings.breakpointType)}
          jslog=${VisualLogging.dropDown('type').track({ change: true })}
          @change=${onTypeChanged}>
            <option value=${"REGULAR_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */}>
              ${i18nString(UIStrings.breakpoint)}
            </option>
            <option
              value=${"CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */}
              .selected=${input.breakpointType === "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */}>
                ${i18nString(UIStrings.conditionalBreakpoint)}
            </option>
            <option
              value=${"LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */}
              .selected=${input.breakpointType === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */}>
                ${i18nString(UIStrings.logpoint)}
            </option>
        </select>
      </devtools-toolbar>
      <devtools-icon
        name=cross
        title=${i18nString(UIStrings.closeDialog)}
        jslog=${VisualLogging.close().track({ click: true })}
        @click=${input.saveAndFinish}>
      </devtools-icon>
    </div>
    <div class=condition-editor jslog=${VisualLogging.textField().track({ change: true })}>
      <devtools-text-editor
        ${ref(editorRef)}
        autofocus
        .state=${input.state}
        @focus=${() => output.editor?.focus()}></devtools-text-editor>
    </div>
    <div class=link-wrapper>
      <devtools-icon name=open-externally class=link-icon></devtools-icon>
      <x-link class="link devtools-link" tabindex="0" href="https://goo.gle/devtools-loc"
                                          jslog=${VisualLogging.link('learn-more')}>${i18nString(UIStrings.learnMoreOnBreakpointTypes)}</x-link>
    </div>
    `, 
    // clang-format on
    target);
};
export class BreakpointEditDialog extends UI.Widget.Widget {
    #view;
    #history = new TextEditor.AutocompleteHistory.AutocompleteHistory(Common.Settings.Settings.instance().createLocalSetting('breakpoint-condition-history', []));
    #finished = false;
    #editorLineNumber = 0;
    #oldCondition = '';
    #breakpointType = "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */;
    #onFinish = () => { };
    #editor;
    #state;
    constructor(target, view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.dialog('edit-breakpoint')}`,
            useShadowDom: true,
            delegatesFocus: true,
            classes: ['sources-edit-breakpoint-dialog'],
        });
        this.#view = view;
        this.element.tabIndex = -1;
    }
    get editorLineNumber() {
        return this.#editorLineNumber;
    }
    set editorLineNumber(editorLineNumber) {
        this.#editorLineNumber = editorLineNumber;
        this.requestUpdate();
    }
    get oldCondition() {
        return this.#oldCondition;
    }
    set oldCondition(oldCondition) {
        this.#state = undefined;
        this.#oldCondition = oldCondition;
        this.requestUpdate();
    }
    get breakpointType() {
        return this.#breakpointType;
    }
    set breakpointType(breakpointType) {
        this.#breakpointType = breakpointType;
        this.requestUpdate();
    }
    get onFinish() {
        return this.#onFinish;
    }
    set onFinish(onFinish) {
        this.#onFinish = onFinish;
        this.requestUpdate();
    }
    performUpdate() {
        const input = {
            state: this.#getEditorState(),
            breakpointType: this.#breakpointType,
            editorLineNumber: this.#editorLineNumber,
            onTypeChanged: type => this.#typeChanged(type),
            saveAndFinish: () => this.saveAndFinish(),
        };
        const that = this;
        const output = {
            get editor() {
                return that.#editor;
            },
            set editor(editor) {
                that.#editor = editor;
            }
        };
        this.#view(input, output, this.contentElement);
    }
    #getEditorState() {
        if (this.#state) {
            return this.#state;
        }
        const getPlaceholder = () => {
            if (this.#breakpointType === "CONDITIONAL_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */) {
                return CodeMirror.placeholder(i18nString(UIStrings.expressionToCheckBeforePausingEg));
            }
            if (this.#breakpointType === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */) {
                return CodeMirror.placeholder(i18nString(UIStrings.logMessageEgXIsX));
            }
            return [];
        };
        const history = () => this.#editor && new TextEditor.TextEditorHistory.TextEditorHistory(this.#editor, this.#history);
        const autocomplete = (context) => history()?.historyCompletions(context) ?? null;
        const historyBack = (force) => history()?.moveHistory(-1 /* Direction.BACKWARD */, force) ?? false;
        const historyForward = (force) => history()?.moveHistory(1 /* Direction.FORWARD */, force) ?? false;
        const finishIfComplete = (view) => {
            void TextEditor.JavaScript.isExpressionComplete(view.state.doc.toString()).then(complete => {
                if (complete) {
                    this.finishEditing(true, view.state.doc.toString());
                }
                else {
                    CodeMirror.insertNewlineAndIndent(view);
                }
            });
            return true;
        };
        const keymap = [
            { key: 'ArrowUp', run: () => historyBack(false) },
            { key: 'ArrowDown', run: () => historyForward(false) },
            { mac: 'Ctrl-p', run: () => historyBack(true) },
            { mac: 'Ctrl-n', run: () => historyForward(true) },
            { key: 'Mod-Enter', run: finishIfComplete },
            { key: 'Enter', run: finishIfComplete },
            { key: 'Shift-Enter', run: CodeMirror.insertNewlineAndIndent },
            {
                key: 'Escape',
                run: () => {
                    this.finishEditing(false, '');
                    return true;
                }
            },
        ];
        const editorConfig = [
            CodeMirror.javascript.javascriptLanguage,
            TextEditor.Config.baseConfiguration(this.oldCondition),
            TextEditor.Config.closeBrackets.instance(),
            TextEditor.Config.autocompletion.instance(),
            CodeMirror.EditorView.lineWrapping,
            TextEditor.Config.showCompletionHint,
            TextEditor.Config.conservativeCompletion,
            CodeMirror.javascript.javascriptLanguage.data.of({ autocomplete }),
            CodeMirror.autocompletion(),
            TextEditor.JavaScript.argumentHints(),
        ];
        this.#state = CodeMirror.EditorState.create({
            doc: this.oldCondition,
            selection: { anchor: 0, head: this.oldCondition.length },
            extensions: [
                new CodeMirror.Compartment().of(getPlaceholder()),
                CodeMirror.keymap.of(keymap),
                editorConfig,
            ],
        });
        return this.#state;
    }
    #typeChanged(breakpointType) {
        if (breakpointType === "REGULAR_BREAKPOINT" /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */) {
            this.finishEditing(true, '');
            return;
        }
        this.breakpointType = breakpointType;
        this.requestUpdate();
    }
    finishEditing(committed, condition) {
        if (this.#finished) {
            return;
        }
        this.#finished = true;
        this.#history.pushHistoryItem(condition);
        const isLogpoint = this.breakpointType === "LOGPOINT" /* SDK.DebuggerModel.BreakpointType.LOGPOINT */;
        this.onFinish({ committed, condition: condition, isLogpoint });
    }
    saveAndFinish() {
        if (this.#editor) {
            this.finishEditing(true, this.#editor.state.doc.toString());
        }
    }
}
//# sourceMappingURL=BreakpointEditDialog.js.map