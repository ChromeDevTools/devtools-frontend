/*
 * Copyright 2018 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

Sources.BreakpointEditDialog = class extends UI.Widget {
  /**
   * @param {number} editorLineNumber
   * @param {string} oldCondition
   * @param {function({committed: boolean, condition: string})} onFinish
   */
  constructor(editorLineNumber, oldCondition, onFinish) {
    super(true);
    this.registerRequiredCSS('sources/breakpointEditDialog.css');
    this._onFinish = onFinish;
    this._finished = false;
    /** @type {?UI.TextEditor} */
    this._editor = null;

    const labelElement = this.contentElement.createChild('label', 'source-frame-breakpoint-message');
    labelElement.htmlFor = 'source-frame-breakpoint-condition';
    labelElement.createTextChild(
        Common.UIString('The breakpoint on line %d will stop only if this expression is true:', editorLineNumber + 1));

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
   * @param {boolean} committed
   */
  _finishEditing(committed) {
    if (this._finished)
      return;
    this._finished = true;
    this._editor.widget().detach();
    const condition = this._editor.text();
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
