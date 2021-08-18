// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import breakpointEditDialogStyles from './breakpointEditDialog.css.js';

const UIStrings = {
  /**
  *@description Screen reader label for a select box that chooses the breakpoint type in the Sources panel when editing a breakpoint
  */
  breakpointType: 'Breakpoint type',
  /**
  *@description Text in Breakpoint Edit Dialog of the Sources panel
  */
  breakpoint: 'Breakpoint',
  /**
  *@description Text in Breakpoint Edit Dialog of the Sources panel
  */
  conditionalBreakpoint: 'Conditional breakpoint',
  /**
  *@description Text in Breakpoint Edit Dialog of the Sources panel
  */
  logpoint: 'Logpoint',
  /**
  *@description Text in Breakpoint Edit Dialog of the Sources panel
  */
  expressionToCheckBeforePausingEg: 'Expression to check before pausing, e.g. x > 5',
  /**
  *@description Type selector element title in Breakpoint Edit Dialog of the Sources panel
  */
  pauseOnlyWhenTheConditionIsTrue: 'Pause only when the condition is true',
  /**
  *@description Text in Breakpoint Edit Dialog of the Sources panel. It is used as
  *the placeholder for a text input field before the user enters text. Provides the user with
  *an example on how to use Logpoints. 'Log' is a verb and 'message' is a noun.
  *See: https://developer.chrome.com/blog/new-in-devtools-73/#logpoints
  */
  logMessageEgXIsX: 'Log message, e.g. `\'x is\', x`',
  /**
  *@description Type selector element title in Breakpoint Edit Dialog of the Sources panel
  */
  logAMessageToConsoleDoNotBreak: 'Log a message to Console, do not break',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/BreakpointEditDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BreakpointEditDialog extends UI.Widget.Widget {
  private readonly onFinish: (arg0: {
    committed: boolean,
    condition: string,
  }) => Promise<void>;
  private finished: boolean;
  private editor: TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor|null;
  private isLogpoint: boolean;
  private readonly typeSelector: UI.Toolbar.ToolbarComboBox;

  constructor(editorLineNumber: number, oldCondition: string, preferLogpoint: boolean, onFinish: (arg0: {
                                                                                         committed: boolean,
                                                                                         condition: string,
                                                                                       }) => Promise<void>) {
    super(true);

    this.onFinish = onFinish;
    this.finished = false;
    this.editor = null;
    this.element.tabIndex = -1;

    const logpointPrefix = LogpointPrefix;
    const logpointSuffix = LogpointSuffix;
    this.isLogpoint = oldCondition.startsWith(logpointPrefix) && oldCondition.endsWith(logpointSuffix);
    if (this.isLogpoint) {
      oldCondition = oldCondition.substring(logpointPrefix.length, oldCondition.length - logpointSuffix.length);
    }
    this.isLogpoint = this.isLogpoint || preferLogpoint;

    this.element.classList.add('sources-edit-breakpoint-dialog');
    const toolbar = new UI.Toolbar.Toolbar('source-frame-breakpoint-toolbar', this.contentElement);
    toolbar.appendText(`Line ${editorLineNumber + 1}:`);

    this.typeSelector =
        new UI.Toolbar.ToolbarComboBox(this.onTypeChanged.bind(this), i18nString(UIStrings.breakpointType));
    this.typeSelector.createOption(i18nString(UIStrings.breakpoint), BreakpointType.Breakpoint);
    const conditionalOption =
        this.typeSelector.createOption(i18nString(UIStrings.conditionalBreakpoint), BreakpointType.Conditional);
    const logpointOption = this.typeSelector.createOption(i18nString(UIStrings.logpoint), BreakpointType.Logpoint);
    this.typeSelector.select(this.isLogpoint ? logpointOption : conditionalOption);
    toolbar.appendToolbarItem(this.typeSelector);

    const factory = TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditorFactory.instance();
    const editorOptions = {
      lineNumbers: false,
      lineWrapping: true,
      mimeType: 'javascript',
      autoHeight: true,
      bracketMatchingSetting: undefined,
      devtoolsAccessibleName: undefined,
      padBottom: undefined,
      maxHighlightLength: undefined,
      placeholder: undefined,
      lineWiseCopyCut: undefined,
      inputStyle: undefined,
    };
    this.editor = factory.createEditor(editorOptions);
    this.updatePlaceholder();
    this.editor.widget().element.classList.add('condition-editor');
    this.editor.configureAutocomplete(
        ObjectUI.JavaScriptAutocomplete.JavaScriptAutocompleteConfig.createConfigForEditor(this.editor));
    if (oldCondition) {
      this.editor.setText(oldCondition);
    }
    this.editor.widget().markAsExternallyManaged();
    this.editor.widget().show(this.contentElement);
    this.editor.setSelection(this.editor.fullRange());
    this.editor.widget().element.addEventListener('keydown', this.onKeyDown.bind(this), true);
    this.element.addEventListener('blur', event => {
      if (!event.relatedTarget ||
          (event.relatedTarget && !(event.relatedTarget as Node).isSelfOrDescendant(this.element))) {
        this.finishEditing(true);
      }
    }, true);
  }

  focusEditor(): void {
    if (this.editor) {
      this.editor.widget().focus();
    }
  }
  private static conditionForLogpoint(condition: string): string {
    return `${LogpointPrefix}${condition}${LogpointSuffix}`;
  }

  private onTypeChanged(): void {
    const option = this.typeSelector.selectedOption();
    if (!option || !this.editor) {
      return;
    }
    const value = option.value;
    this.isLogpoint = value === BreakpointType.Logpoint;
    this.updatePlaceholder();
    if (value === BreakpointType.Breakpoint) {
      this.editor.setText('');
      this.finishEditing(true);
    }
  }

  private updatePlaceholder(): void {
    const option = this.typeSelector.selectedOption();
    if (!option || !this.editor) {
      return;
    }
    const selectedValue = option.value;
    if (selectedValue === BreakpointType.Conditional) {
      this.editor.setPlaceholder(i18nString(UIStrings.expressionToCheckBeforePausingEg));
      UI.Tooltip.Tooltip.install((this.typeSelector.element), i18nString(UIStrings.pauseOnlyWhenTheConditionIsTrue));
    } else if (selectedValue === BreakpointType.Logpoint) {
      this.editor.setPlaceholder(i18nString(UIStrings.logMessageEgXIsX));
      UI.Tooltip.Tooltip.install((this.typeSelector.element), i18nString(UIStrings.logAMessageToConsoleDoNotBreak));
    }
  }

  private finishEditing(committed: boolean): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    if (!this.editor) {
      return;
    }
    this.editor.widget().detach();
    let condition = this.editor.text();
    if (this.isLogpoint) {
      condition = BreakpointEditDialog.conditionForLogpoint(condition);
    }
    this.onFinish({committed, condition});
  }

  private async onKeyDown(event: Event): Promise<void> {
    if (!(event instanceof KeyboardEvent) || !this.editor) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.consume(true);
      const expression = this.editor.text();
      if (event.ctrlKey ||
          await ObjectUI.JavaScriptAutocomplete.JavaScriptAutocomplete.isExpressionComplete(expression)) {
        this.finishEditing(true);
      } else {
        this.editor.newlineAndIndent();
      }
    }
    if (isEscKey(event)) {
      this.finishEditing(false);
      event.stopImmediatePropagation();
    }
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([breakpointEditDialogStyles]);
  }
}

export const LogpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
export const LogpointSuffix = ')';

export const BreakpointType = {
  Breakpoint: 'Breakpoint',
  Conditional: 'Conditional',
  Logpoint: 'Logpoint',
};
