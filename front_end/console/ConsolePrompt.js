// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Console.ConsolePrompt = class extends UI.Widget {
  constructor() {
    super();
    this._addCompletionsFromHistory = true;
    this._history = new Console.ConsoleHistoryManager();

    this._initialText = '';
    this._editor = null;

    this.element.tabIndex = 0;

    self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));

    /**
     * @param {!UI.TextEditorFactory} factory
     * @this {Console.ConsolePrompt}
     */
    function gotFactory(factory) {
      this._editor =
          factory.createEditor({lineNumbers: false, lineWrapping: true, mimeType: 'javascript', autoHeight: true});

      this._editor.configureAutocomplete({
        substituteRangeCallback: this._substituteRange.bind(this),
        suggestionsCallback: this._wordsWithQuery.bind(this),
        captureEnter: true
      });
      this._editor.widget().element.addEventListener('keydown', this._editorKeyDown.bind(this), true);
      this._editor.widget().show(this.element);

      this.setText(this._initialText);
      delete this._initialText;
      if (this.hasFocus())
        this.focus();
      this.element.tabIndex = -1;

      this._editorSetForTest();
    }
  }

  /**
   * @return {!Console.ConsoleHistoryManager}
   */
  history() {
    return this._history;
  }

  clearAutocomplete() {
    if (this._editor)
      this._editor.clearAutocomplete();
  }

  /**
   * @return {boolean}
   */
  _isCaretAtEndOfPrompt() {
    return !!this._editor && this._editor.selection().collapseToEnd().equal(this._editor.fullRange().collapseToEnd());
  }

  moveCaretToEndOfPrompt() {
    if (this._editor)
      this._editor.setSelection(Common.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {string} text
   */
  setText(text) {
    if (this._editor)
      this._editor.setText(text);
    else
      this._initialText = text;
  }

  /**
   * @return {string}
   */
  text() {
    return this._editor ? this._editor.text() : this._initialText;
  }

  /**
   * @param {boolean} value
   */
  setAddCompletionsFromHistory(value) {
    this._addCompletionsFromHistory = value;
  }

  /**
   * @param {!Event} event
   */
  _editorKeyDown(event) {
    var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    var newText;
    var isPrevious;

    switch (keyboardEvent.keyCode) {
      case UI.KeyboardShortcut.Keys.Up.code:
        if (this._editor.selection().endLine > 0)
          break;
        newText = this._history.previous(this.text());
        isPrevious = true;
        break;
      case UI.KeyboardShortcut.Keys.Down.code:
        if (this._editor.selection().endLine < this._editor.fullRange().endLine)
          break;
        newText = this._history.next();
        break;
      case UI.KeyboardShortcut.Keys.P.code:  // Ctrl+P = Previous
        if (Host.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey &&
            !keyboardEvent.shiftKey) {
          newText = this._history.previous(this.text());
          isPrevious = true;
        }
        break;
      case UI.KeyboardShortcut.Keys.N.code:  // Ctrl+N = Next
        if (Host.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey &&
            !keyboardEvent.shiftKey)
          newText = this._history.next();
        break;
      case UI.KeyboardShortcut.Keys.Enter.code:
        this._enterKeyPressed(keyboardEvent);
        break;
    }

    if (newText === undefined)
      return;
    keyboardEvent.consume(true);
    this.setText(newText);

    if (isPrevious)
      this._editor.setSelection(Common.TextRange.createFromLocation(0, Infinity));
    else
      this.moveCaretToEndOfPrompt();
  }

  /**
   * @param {!KeyboardEvent} event
   */
  _enterKeyPressed(event) {
    if (event.altKey || event.ctrlKey || event.shiftKey)
      return;

    event.consume(true);

    this.clearAutocomplete();

    var str = this.text();
    if (!str.length)
      return;

    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!this._isCaretAtEndOfPrompt() || !currentExecutionContext) {
      this._appendCommand(str, true);
      return;
    }
    currentExecutionContext.target().runtimeModel.compileScript(
        str, '', false, currentExecutionContext.id, compileCallback.bind(this));

    /**
     * @param {!Protocol.Runtime.ScriptId=} scriptId
     * @param {?Protocol.Runtime.ExceptionDetails=} exceptionDetails
     * @this {Console.ConsolePrompt}
     */
    function compileCallback(scriptId, exceptionDetails) {
      if (str !== this.text())
        return;
      if (exceptionDetails &&
          (exceptionDetails.exception.description.startsWith('SyntaxError: Unexpected end of input') ||
           exceptionDetails.exception.description.startsWith('SyntaxError: Unterminated template literal'))) {
        this._editor.newlineAndIndent();
        this._enterProcessedForTest();
        return;
      }
      this._appendCommand(str, true);
      this._enterProcessedForTest();
    }
  }

  /**
   * @param {string} text
   * @param {boolean} useCommandLineAPI
   */
  _appendCommand(text, useCommandLineAPI) {
    this.setText('');
    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (currentExecutionContext) {
      SDK.ConsoleModel.evaluateCommandInConsole(currentExecutionContext, text, useCommandLineAPI);
      if (Console.ConsolePanel.instance().isShowing())
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);
    }
  }

  _enterProcessedForTest() {
  }

  /**
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!UI.SuggestBox.Suggestions}
   */
  _historyCompletions(prefix, force) {
    if (!this._addCompletionsFromHistory || !this._isCaretAtEndOfPrompt() || (!prefix && !force))
      return [];
    var result = [];
    var text = this.text();
    var set = new Set();
    var data = this._history.historyData();
    for (var i = data.length - 1; i >= 0 && result.length < 50; --i) {
      var item = data[i];
      if (!item.startsWith(text))
        continue;
      if (set.has(item))
        continue;
      set.add(item);
      result.push(
          {title: item.substring(text.length - prefix.length), iconType: 'smallicon-text-prompt', isSecondary: true});
    }
    return result;
  }

  /**
   * @override
   */
  focus() {
    if (this._editor)
      this._editor.widget().focus();
    else
      this.element.focus();
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Common.TextRange}
   */
  _substituteRange(lineNumber, columnNumber) {
    var lineText = this._editor.line(lineNumber);
    var index;
    for (index = lineText.length - 1; index >= 0; index--) {
      if (' =:[({;,!+-*/&|^<>.'.indexOf(lineText.charAt(index)) !== -1)
        break;
    }
    return new Common.TextRange(lineNumber, index + 1, lineNumber, columnNumber);
  }

  /**
   * @param {!Common.TextRange} queryRange
   * @param {!Common.TextRange} substituteRange
   * @param {boolean=} force
   * @param {string=} currentTokenType
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _wordsWithQuery(queryRange, substituteRange, force, currentTokenType) {
    var query = this._editor.text(queryRange);
    var before = this._editor.text(new Common.TextRange(0, 0, queryRange.startLine, queryRange.startColumn));
    var historyWords = this._historyCompletions(query, force);

    var excludedTokens = new Set(['js-comment', 'js-string-2']);
    if (!before.endsWith('['))
      excludedTokens.add('js-string');
    if (excludedTokens.has(currentTokenType))
      return Promise.resolve(historyWords);

    return Components.JavaScriptAutocomplete.completionsForTextInCurrentContext(before, query, force)
        .then(words => words.concat(historyWords));
  }

  _editorSetForTest() {
  }
};

/**
 * @unrestricted
 */
Console.ConsoleHistoryManager = class {
  constructor() {
    /**
     * @type {!Array.<string>}
     */
    this._data = [];

    /**
     * 1-based entry in the history stack.
     * @type {number}
     */
    this._historyOffset = 1;
  }

  /**
   * @return {!Array.<string>}
   */
  historyData() {
    return this._data;
  }

  /**
   * @param {!Array.<string>} data
   */
  setHistoryData(data) {
    this._data = data.slice();
    this._historyOffset = 1;
  }

  /**
   * Pushes a committed text into the history.
   * @param {string} text
   */
  pushHistoryItem(text) {
    if (this._uncommittedIsTop) {
      this._data.pop();
      delete this._uncommittedIsTop;
    }

    this._historyOffset = 1;
    if (text === this._currentHistoryItem())
      return;
    this._data.push(text);
  }

  /**
   * Pushes the current (uncommitted) text into the history.
   * @param {string} currentText
   */
  _pushCurrentText(currentText) {
    if (this._uncommittedIsTop)
      this._data.pop();  // Throw away obsolete uncommitted text.
    this._uncommittedIsTop = true;
    this._data.push(currentText);
  }

  /**
   * @param {string} currentText
   * @return {string|undefined}
   */
  previous(currentText) {
    if (this._historyOffset > this._data.length)
      return undefined;
    if (this._historyOffset === 1)
      this._pushCurrentText(currentText);
    ++this._historyOffset;
    return this._currentHistoryItem();
  }

  /**
   * @return {string|undefined}
   */
  next() {
    if (this._historyOffset === 1)
      return undefined;
    --this._historyOffset;
    return this._currentHistoryItem();
  }

  /**
   * @return {string|undefined}
   */
  _currentHistoryItem() {
    return this._data[this._data.length - this._historyOffset];
  }
};
