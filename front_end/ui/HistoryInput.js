// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.HistoryInput = class extends HTMLInputElement {
  constructor() {
    super();
  }

  /**
   * @return {!WebInspector.HistoryInput}
   */
  static create() {
    if (!WebInspector.HistoryInput._constructor)
      WebInspector.HistoryInput._constructor =
          registerCustomElement('input', 'history-input', WebInspector.HistoryInput.prototype);

    return /** @type {!WebInspector.HistoryInput} */ (new WebInspector.HistoryInput._constructor());
  }

  /**
   * @override
   */
  createdCallback() {
    this._history = [''];
    this._historyPosition = 0;
    this.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this.addEventListener('input', this._onInput.bind(this), false);
  }

  /**
   * @param {!Event} event
   */
  _onInput(event) {
    if (this._history.length === this._historyPosition + 1)
      this._history[this._history.length - 1] = this.value;
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Up.code) {
      this._historyPosition = Math.max(this._historyPosition - 1, 0);
      this.value = this._history[this._historyPosition];
      this.dispatchEvent(new Event('input', {'bubbles': true, 'cancelable': true}));
      event.consume(true);
    } else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Down.code) {
      this._historyPosition = Math.min(this._historyPosition + 1, this._history.length - 1);
      this.value = this._history[this._historyPosition];
      this.dispatchEvent(new Event('input', {'bubbles': true, 'cancelable': true}));
      event.consume(true);
    } else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Enter.code) {
      this._saveToHistory();
    }
  }

  _saveToHistory() {
    if (this._history.length > 1 && this._history[this._history.length - 2] === this.value)
      return;
    this._history[this._history.length - 1] = this.value;
    this._historyPosition = this._history.length - 1;
    this._history.push('');
  }
};
