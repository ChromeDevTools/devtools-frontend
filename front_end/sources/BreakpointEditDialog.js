// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
  *@description Text in Breakpoint Edit Dialog of the Sources panel
  */
  logMessageEgXIsX: 'Log message, e.g. \'x is\', x',
  /**
  *@description Type selector element title in Breakpoint Edit Dialog of the Sources panel
  */
  logAMessageToConsoleDoNotBreak: 'Log a message to Console, do not break',
};
const str_ = i18n.i18n.registerUIStrings('sources/BreakpointEditDialog.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BreakpointEditDialog extends UI.Widget.Widget {
  /**
   * @param {number} editorLineNumber
   * @param {string} oldCondition
   * @param {boolean} preferLogpoint
   * @param {function({committed: boolean, condition: string}): !Promise<void>} onFinish
   */
  constructor(editorLineNumber, oldCondition, preferLogpoint, onFinish) {
    super(true);
    this.registerRequiredCSS('sources/breakpointEditDialog.css', {enableLegacyPatching: true});
    this._onFinish = onFinish;
    this._finished = false;
    /** @type {?UI.TextEditor.TextEditor} */
    this._editor = null;
    this.element.tabIndex = -1;

    const logpointPrefix = LogpointPrefix;
    const logpointSuffix = LogpointSuffix;
    this._isLogpoint = oldCondition.startsWith(logpointPrefix) && oldCondition.endsWith(logpointSuffix);
    if (this._isLogpoint) {
      oldCondition = oldCondition.substring(logpointPrefix.length, oldCondition.length - logpointSuffix.length);
    }
    this._isLogpoint = this._isLogpoint || preferLogpoint;

    this.element.classList.add('sources-edit-breakpoint-dialog');
    const toolbar = new UI.Toolbar.Toolbar('source-frame-breakpoint-toolbar', this.contentElement);
    toolbar.appendText(`Line ${editorLineNumber + 1}:`);

    this._typeSelector =
        new UI.Toolbar.ToolbarComboBox(this._onTypeChanged.bind(this), i18nString(UIStrings.breakpointType));
    this._typeSelector.createOption(i18nString(UIStrings.breakpoint), BreakpointType.Breakpoint);
    const conditionalOption =
        this._typeSelector.createOption(i18nString(UIStrings.conditionalBreakpoint), BreakpointType.Conditional);
    const logpointOption = this._typeSelector.createOption(i18nString(UIStrings.logpoint), BreakpointType.Logpoint);
    this._typeSelector.select(this._isLogpoint ? logpointOption : conditionalOption);
    toolbar.appendToolbarItem(this._typeSelector);

    const extension = Root.Runtime.Runtime.instance().extension(UI.TextEditor.TextEditorFactory);
    if (extension) {
      extension.instance().then(factory => {
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
        this._editor = /** @type {!UI.TextEditor.TextEditorFactory} */ (factory).createEditor(editorOptions);
        this._updatePlaceholder();
        this._editor.widget().element.classList.add('condition-editor');
        this._editor.configureAutocomplete(
            ObjectUI.JavaScriptAutocomplete.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
        if (oldCondition) {
          this._editor.setText(oldCondition);
        }
        this._editor.widget().markAsExternallyManaged();
        this._editor.widget().show(this.contentElement);
        this._editor.setSelection(this._editor.fullRange());
        this._editor.widget().focus();
        this._editor.widget().element.addEventListener('keydown', this._onKeyDown.bind(this), true);
        this.element.addEventListener('blur', event => {
          if (event.relatedTarget && !/** @type {!Node} */ (event.relatedTarget).isSelfOrDescendant(this.element)) {
            this._finishEditing(true);
          }
        }, true);
      });
    }
  }

  /**
   * @param {string} condition
   * @return {string}
   */
  static _conditionForLogpoint(condition) {
    return `${LogpointPrefix}${condition}${LogpointSuffix}`;
  }

  _onTypeChanged() {
    const option = this._typeSelector.selectedOption();
    if (!option || !this._editor) {
      return;
    }
    const value = option.value;
    this._isLogpoint = value === BreakpointType.Logpoint;
    this._updatePlaceholder();
    if (value === BreakpointType.Breakpoint) {
      this._editor.setText('');
      this._finishEditing(true);
    }
  }

  _updatePlaceholder() {
    const option = this._typeSelector.selectedOption();
    if (!option || !this._editor) {
      return;
    }
    const selectedValue = option.value;
    if (selectedValue === BreakpointType.Conditional) {
      this._editor.setPlaceholder(i18nString(UIStrings.expressionToCheckBeforePausingEg));
      /** @type {!HTMLSpanElement} */ UI.Tooltip.Tooltip.install(
          (this._typeSelector.element), i18nString(UIStrings.pauseOnlyWhenTheConditionIsTrue));
    } else if (selectedValue === BreakpointType.Logpoint) {
      this._editor.setPlaceholder(i18nString(UIStrings.logMessageEgXIsX));
      /** @type {!HTMLSpanElement} */ UI.Tooltip.Tooltip.install(
          (this._typeSelector.element), i18nString(UIStrings.logAMessageToConsoleDoNotBreak));
    }
  }

  /**
   * @param {boolean} committed
   */
  _finishEditing(committed) {
    if (this._finished) {
      return;
    }
    this._finished = true;
    if (!this._editor) {
      return;
    }
    this._editor.widget().detach();
    let condition = this._editor.text();
    if (this._isLogpoint) {
      condition = BreakpointEditDialog._conditionForLogpoint(condition);
    }
    this._onFinish({committed, condition});
  }

  /**
   * @param {!Event} event
   */
  async _onKeyDown(event) {
    if (!(event instanceof KeyboardEvent) || !this._editor) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.consume(true);
      const expression = this._editor.text();
      if (event.ctrlKey ||
          await ObjectUI.JavaScriptAutocomplete.JavaScriptAutocomplete.isExpressionComplete(expression)) {
        this._finishEditing(true);
      } else {
        this._editor.newlineAndIndent();
      }
    }
    if (isEscKey(event)) {
      this._finishEditing(false);
      event.stopImmediatePropagation();
    }
  }
}

export const LogpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
export const LogpointSuffix = ')';

export const BreakpointType = {
  Breakpoint: 'Breakpoint',
  Conditional: 'Conditional',
  Logpoint: 'Logpoint',
};
