/*
 * Copyright 2018 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

Sources.BreakpointEditDialog = class extends UI.Widget {
  /**
   * @param {number} editorLineNumber
   * @param {string} oldCondition
   * @param {boolean} preferLogpoint
   * @param {function({committed: boolean, condition: string})} onFinish
   */
  constructor(editorLineNumber, oldCondition, preferLogpoint, onFinish) {
    super(true);
    this.registerRequiredCSS('sources/breakpointEditDialog.css');
    this._onFinish = onFinish;
    this._finished = false;
    /** @type {?UI.TextEditor} */
    this._editor = null;

    const logpointPrefix = Sources.BreakpointEditDialog._LogpointPrefix;
    const logpointSuffix = Sources.BreakpointEditDialog._LogpointSuffix;
    this._isLogpoint = oldCondition.startsWith(logpointPrefix) && oldCondition.endsWith(logpointSuffix);
    if (this._isLogpoint)
      oldCondition = oldCondition.substring(logpointPrefix.length, oldCondition.length - logpointSuffix.length);
    this._isLogpoint = this._isLogpoint || preferLogpoint;

    const labelElement = this.contentElement.createChild('label', 'source-frame-breakpoint-message');
    labelElement.htmlFor = 'source-frame-breakpoint-condition';
    const labelText = this._isLogpoint ? ls`On line ${editorLineNumber + 1}, log to the Console:` : ls
    `The breakpoint on line ${editorLineNumber + 1} will stop only if this expression is true:`;
    labelElement.createTextChild(labelText);

    self.runtime.extension(UI.TextEditorFactory).instance().then(factory => {
      this._editor =
          factory.createEditor({lineNumbers: false, lineWrapping: true, mimeType: 'javascript', autoHeight: true});
      this._editor.configureAutocomplete(ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
      if (oldCondition)
        this._editor.setText(oldCondition);
      this._editor.widget().show(this.contentElement);
      this._editor.widget().element.id = 'source-frame-breakpoint-condition';
      this._editor.setSelection(this._editor.fullRange());
      this._editor.widget().focus();
      this._editor.widget().element.addEventListener('keydown', this._onKeyDown.bind(this), true);
      this._editor.widget().element.addEventListener('blur', event => {
        if (event.relatedTarget && !event.relatedTarget.isSelfOrDescendant(this._editor.widget().element))
          this._finishEditing(true);
      }, true);
    });
  }

  /**
   * @param {string} condition
   * @return {string}
   */
  static _conditionForLogpoint(condition) {
    return `${Sources.BreakpointEditDialog._LogpointPrefix}${condition}${Sources.BreakpointEditDialog._LogpointSuffix}`;
  }

  /**
   * @param {boolean} committed
   */
  _finishEditing(committed) {
    if (this._finished)
      return;
    this._finished = true;
    this._editor.widget().detach();
    let condition = this._editor.text();
    if (this._isLogpoint)
      condition = Sources.BreakpointEditDialog._conditionForLogpoint(condition);
    this._onFinish({committed, condition});
  }

  /**
   * @param {!Event} event
   */
  async _onKeyDown(event) {
    if (isEnterKey(event) && !event.shiftKey) {
      event.consume(true);
      const expression = this._editor.text();
      if (event.ctrlKey || await ObjectUI.JavaScriptAutocomplete.isExpressionComplete(expression))
        this._finishEditing(true);
      else
        this._editor.newlineAndIndent();
    }
    if (isEscKey(event))
      this._finishEditing(false);
  }
};

Sources.BreakpointEditDialog._LogpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
Sources.BreakpointEditDialog._LogpointSuffix = ')';
