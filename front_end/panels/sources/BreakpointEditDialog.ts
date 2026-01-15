// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as BreakpointManager from '../../models/breakpoints/breakpoints.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import breakpointEditDialogStyles from './breakpointEditDialog.css.js';

const {ref} = Directives;
const {Direction} = TextEditor.TextEditorHistory;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/BreakpointEditDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface BreakpointEditDialogResult {
  committed: boolean;
  condition: BreakpointManager.BreakpointManager.UserCondition;
  isLogpoint: boolean;
}

interface ViewInput {
  state: CodeMirror.EditorState;
  breakpointType: SDK.DebuggerModel.BreakpointType.LOGPOINT|SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT;
  editorLineNumber: number;
  onTypeChanged(breakpointType: SDK.DebuggerModel.BreakpointType): void;
  saveAndFinish(): void;
}
interface ViewOutput {
  editor: TextEditor.TextEditor.TextEditor|undefined;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const editorRef = (e: Element|undefined): void => {
    output.editor = e as TextEditor.TextEditor.TextEditor;
  };

  const onTypeChanged = (event: Event): void => {
    if (event.target instanceof HTMLSelectElement && event.target.selectedOptions.length === 1) {
      input.onTypeChanged(event.target.selectedOptions.item(0)?.value as SDK.DebuggerModel.BreakpointType);
    }
    output.editor?.focus();
  };

  // clang-format off
  render(html`
    <style>${breakpointEditDialogStyles}</style>
    <div class=dialog-header>
      <devtools-toolbar class=source-frame-breakpoint-toolbar>Line ${input.editorLineNumber + 1}:
        <select
          class=type-selector
          title=${input.breakpointType === SDK.DebuggerModel.BreakpointType.LOGPOINT
            ? i18nString(UIStrings.logAMessageToConsoleDoNotBreak)
            : i18nString(UIStrings.pauseOnlyWhenTheConditionIsTrue)}
          aria-label=${i18nString(UIStrings.breakpointType)}
          jslog=${VisualLogging.dropDown('type').track({change: true})}
          @change=${onTypeChanged}>
            <option value=${SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT}>
              ${i18nString(UIStrings.breakpoint)}
            </option>
            <option
              value=${SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT}
              .selected=${input.breakpointType === SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT}>
                ${i18nString(UIStrings.conditionalBreakpoint)}
            </option>
            <option
              value=${SDK.DebuggerModel.BreakpointType.LOGPOINT}
              .selected=${input.breakpointType === SDK.DebuggerModel.BreakpointType.LOGPOINT}>
                ${i18nString(UIStrings.logpoint)}
            </option>
        </select>
      </devtools-toolbar>
      <devtools-icon
        name=cross
        title=${i18nString(UIStrings.closeDialog)}
        jslog=${VisualLogging.close().track({click: true})}
        @click=${input.saveAndFinish}>
      </devtools-icon>
    </div>
    <div class=condition-editor jslog=${VisualLogging.textField().track({change: true})}>
      <devtools-text-editor
        ${ref(editorRef)}
        autofocus
        .state=${input.state}
        @focus=${() => output.editor?.focus()}></devtools-text-editor>
    </div>
    <div class=link-wrapper>
      <devtools-icon name=open-externally class=link-icon></devtools-icon>
      <x-link class="link devtools-link" tabindex="0" href="https://goo.gle/devtools-loc"
                                          jslog=${VisualLogging.link('learn-more')}>${
                     i18nString(UIStrings.learnMoreOnBreakpointTypes)}</x-link>
    </div>
    `,
      // clang-format on
      target);
};

export class BreakpointEditDialog extends UI.Widget.Widget {
  readonly #view: View;
  readonly #history = new TextEditor.AutocompleteHistory.AutocompleteHistory(
      Common.Settings.Settings.instance().createLocalSetting('breakpoint-condition-history', []));
  #finished = false;
  #editorLineNumber = 0;
  #oldCondition = '';
  #breakpointType: SDK.DebuggerModel.BreakpointType.LOGPOINT|SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT =
      SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT;
  #onFinish: (result: BreakpointEditDialogResult) => void = () => {};
  #editor?: TextEditor.TextEditor.TextEditor;
  #state?: CodeMirror.EditorState;

  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.dialog('edit-breakpoint')}`,
      useShadowDom: true,
      delegatesFocus: true,
      classes: ['sources-edit-breakpoint-dialog'],
    });
    this.#view = view;

    this.element.tabIndex = -1;
  }

  get editorLineNumber(): number {
    return this.#editorLineNumber;
  }
  set editorLineNumber(editorLineNumber: number) {
    this.#editorLineNumber = editorLineNumber;
    this.requestUpdate();
  }
  get oldCondition(): string {
    return this.#oldCondition;
  }
  set oldCondition(oldCondition: string) {
    this.#state = undefined;
    this.#oldCondition = oldCondition;
    this.requestUpdate();
  }
  get breakpointType(): SDK.DebuggerModel.BreakpointType {
    return this.#breakpointType;
  }
  set breakpointType(
      breakpointType: SDK.DebuggerModel.BreakpointType.LOGPOINT|
      SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT) {
    this.#breakpointType = breakpointType;
    this.requestUpdate();
  }
  get onFinish(): (result: BreakpointEditDialogResult) => void {
    return this.#onFinish;
  }
  set onFinish(onFinish: (result: BreakpointEditDialogResult) => void) {
    this.#onFinish = onFinish;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
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

  #getEditorState(): CodeMirror.EditorState {
    if (this.#state) {
      return this.#state;
    }
    const getPlaceholder = (): CodeMirror.Extension => {
      if (this.#breakpointType === SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT) {
        return CodeMirror.placeholder(i18nString(UIStrings.expressionToCheckBeforePausingEg));
      }
      if (this.#breakpointType === SDK.DebuggerModel.BreakpointType.LOGPOINT) {
        return CodeMirror.placeholder(i18nString(UIStrings.logMessageEgXIsX));
      }
      return [];
    };

    const history = (): TextEditor.TextEditorHistory.TextEditorHistory|undefined =>
        this.#editor && new TextEditor.TextEditorHistory.TextEditorHistory(this.#editor, this.#history);
    const autocomplete = (context: CodeMirror.CompletionContext): CodeMirror.CompletionResult|null =>
        history()?.historyCompletions(context) ?? null;
    const historyBack = (force: boolean): boolean => history()?.moveHistory(Direction.BACKWARD, force) ?? false;
    const historyForward = (force: boolean): boolean => history()?.moveHistory(Direction.FORWARD, force) ?? false;

    const finishIfComplete = (view: CodeMirror.EditorView): boolean => {
      void TextEditor.JavaScript.isExpressionComplete(view.state.doc.toString()).then(complete => {
        if (complete) {
          this.finishEditing(true, view.state.doc.toString());
        } else {
          CodeMirror.insertNewlineAndIndent(view);
        }
      });
      return true;
    };

    const keymap = [
      {key: 'ArrowUp', run: () => historyBack(false)},
      {key: 'ArrowDown', run: () => historyForward(false)},
      {mac: 'Ctrl-p', run: () => historyBack(true)},
      {mac: 'Ctrl-n', run: () => historyForward(true)},
      {key: 'Mod-Enter', run: finishIfComplete},
      {key: 'Enter', run: finishIfComplete},
      {key: 'Shift-Enter', run: CodeMirror.insertNewlineAndIndent},
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
      CodeMirror.javascript.javascriptLanguage.data.of({autocomplete}),
      CodeMirror.autocompletion(),
      TextEditor.JavaScript.argumentHints(),
    ];

    this.#state = CodeMirror.EditorState.create({
      doc: this.oldCondition,
      selection: {anchor: 0, head: this.oldCondition.length},
      extensions: [
        new CodeMirror.Compartment().of(getPlaceholder()),
        CodeMirror.keymap.of(keymap),
        editorConfig,
      ],
    });
    return this.#state;
  }

  #typeChanged(breakpointType: SDK.DebuggerModel.BreakpointType): void {
    if (breakpointType === SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT) {
      this.finishEditing(true, '');
      return;
    }
    this.breakpointType = breakpointType;
    this.requestUpdate();
  }

  finishEditing(committed: boolean, condition: string): void {
    if (this.#finished) {
      return;
    }
    this.#finished = true;
    this.#history.pushHistoryItem(condition);
    const isLogpoint = this.breakpointType === SDK.DebuggerModel.BreakpointType.LOGPOINT;
    this.onFinish({committed, condition: condition as BreakpointManager.BreakpointManager.UserCondition, isLogpoint});
  }

  saveAndFinish(): void {
    if (this.#editor) {
      this.finishEditing(true, this.#editor.state.doc.toString());
    }
  }
}
