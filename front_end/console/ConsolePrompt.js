// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Widget}
 */
WebInspector.ConsolePrompt = function()
{
    WebInspector.Widget.call(this);
    this._addCompletionsFromHistory = true;
    this._history = new WebInspector.HistoryManager();

    this._initialText = "";
    this._editor = null;

    this.element.tabIndex = 0;

    self.runtime.extension(WebInspector.TextEditorFactory).instance().then(gotFactory.bind(this));

    /**
     * @param {!WebInspector.TextEditorFactory} factory
     * @this {WebInspector.ConsolePrompt}
     */
    function gotFactory(factory)
    {
        this._editor = factory.createEditor({
            lineNumbers: false,
            lineWrapping: true,
            mimeType: "javascript",
            autoHeight: true
        });

        this._editor.configureAutocomplete({
            substituteRangeCallback: this._substituteRange.bind(this),
            suggestionsCallback: this._wordsWithPrefix.bind(this),
            captureEnter: true
        });
        this._editor.widget().element.addEventListener("keydown", this._editorKeyDown.bind(this), true);
        this._editor.widget().show(this.element);

        this.setText(this._initialText);
        delete this._initialText;
        if (this.hasFocus())
            this.focus();
        this.element.tabIndex = -1;

        this._editorSetForTest();
    }
}

WebInspector.ConsolePrompt.prototype = {
    /**
     * @return {!WebInspector.HistoryManager}
     */
    history: function()
    {
        return this._history;
    },

    clearAutocomplete: function()
    {
        if (this._editor)
            this._editor.clearAutocomplete();
    },

    /**
     * @return {boolean}
     */
    _isCaretAtEndOfPrompt: function()
    {
        return !!this._editor && this._editor.selection().collapseToEnd().equal(this._editor.fullRange().collapseToEnd());
    },

    moveCaretToEndOfPrompt: function()
    {
        if (this._editor)
            this._editor.setSelection(WebInspector.TextRange.createFromLocation(Infinity,Infinity));
    },

    /**
     * @param {string} text
     */
    setText: function(text)
    {
        if (this._editor)
            this._editor.setText(text);
        else
            this._initialText = text;
    },

    /**
     * @return {string}
     */
    text: function()
    {
        return this._editor ? this._editor.text() : this._initialText;
    },

    /**
     * @param {boolean} value
     */
    setAddCompletionsFromHistory: function(value)
    {
        this._addCompletionsFromHistory = value;
    },

    /**
     * @param {!Event} event
     */
    _editorKeyDown: function(event)
    {
        var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
        var newText;
        var isPrevious;

        switch (keyboardEvent.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Up.code:
            if (this._editor.selection().endLine > 0)
                break;
            newText = this._history.previous(this.text());
            isPrevious = true;
            break;
        case WebInspector.KeyboardShortcut.Keys.Down.code:
            if (this._editor.selection().endLine < this._editor.fullRange().endLine)
                break;
            newText = this._history.next();
            break;
        case WebInspector.KeyboardShortcut.Keys.P.code: // Ctrl+P = Previous
            if (WebInspector.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey && !keyboardEvent.shiftKey) {
                newText = this._history.previous(this.text());
                isPrevious = true;
            }
            break;
        case WebInspector.KeyboardShortcut.Keys.N.code: // Ctrl+N = Next
            if (WebInspector.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey && !keyboardEvent.shiftKey)
                newText = this._history.next();
            break;
        case WebInspector.KeyboardShortcut.Keys.Enter.code:
            this._enterKeyPressed(keyboardEvent);
            break;
        }

        if (newText === undefined)
            return;
        keyboardEvent.consume(true);
        this.setText(newText);

        if (isPrevious)
            this._editor.setSelection(WebInspector.TextRange.createFromLocation(0,Infinity));
        else
            this.moveCaretToEndOfPrompt();
    },

    /**
     * @param {!KeyboardEvent} event
     */
    _enterKeyPressed: function(event)
    {
        if (event.altKey || event.ctrlKey || event.shiftKey)
            return;

        event.consume(true);

        this.clearAutocomplete();

        var str = this.text();
        if (!str.length)
            return;

        var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!this._isCaretAtEndOfPrompt() || !currentExecutionContext) {
            this._appendCommand(str, true);
            return;
        }
        currentExecutionContext.target().runtimeModel.compileScript(str, "", false, currentExecutionContext.id, compileCallback.bind(this));

        /**
         * @param {!RuntimeAgent.ScriptId=} scriptId
         * @param {?RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.ConsolePrompt}
         */
        function compileCallback(scriptId, exceptionDetails)
        {
            if (str !== this.text())
                return;
            if (exceptionDetails && (exceptionDetails.exception.description === "SyntaxError: Unexpected end of input"
                || exceptionDetails.exception.description === "SyntaxError: Unterminated template literal")) {
                this._editor.newlineAndIndent();
                this._enterProcessedForTest();
                return;
            }
            this._appendCommand(str, true);
            this._enterProcessedForTest();
        }
    },

    /**
     * @param {string} text
     * @param {boolean} useCommandLineAPI
     */
    _appendCommand: function(text, useCommandLineAPI)
    {
        this.setText("");
        var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (currentExecutionContext) {
            WebInspector.ConsoleModel.evaluateCommandInConsole(currentExecutionContext, text, useCommandLineAPI);
            if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel().name === "console")
                WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.CommandEvaluatedInConsolePanel);
        }
    },

    _enterProcessedForTest: function() { },

    /**
     * @param {string} prefix
     * @return {!WebInspector.SuggestBox.Suggestions}
     */
    _historyCompletions: function(prefix)
    {
        if (!this._addCompletionsFromHistory || !this._isCaretAtEndOfPrompt())
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
            result.push({title: item.substring(text.length - prefix.length), className: "additional"});
        }
        return result;
    },

    /**
     * @override
     */
    focus: function()
    {
        if (this._editor)
            this._editor.widget().focus();
        else
            this.element.focus();
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.TextRange}
     */
    _substituteRange: function(lineNumber, columnNumber)
    {
        var lineText = this._editor.line(lineNumber);
        var index;
        for (index = lineText.length - 1; index >= 0; index--) {
            if (" =:[({;,!+-*/&|^<>.".indexOf(lineText.charAt(index)) !== -1)
                break;
        }
        return new WebInspector.TextRange(lineNumber, index + 1, lineNumber, columnNumber);
    },

    /**
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {!Promise.<!Array.<{title: string, className: (string|undefined)}>>}
     */
    _wordsWithPrefix: function(prefixRange, substituteRange)
    {
        var fulfill;
        var promise = new Promise(x => fulfill = x);
        var prefix = this._editor.text(prefixRange);
        var before = this._editor.text(new WebInspector.TextRange(0, 0, prefixRange.startLine, prefixRange.startColumn));
        var historyWords = this._historyCompletions(prefix);
        WebInspector.ExecutionContextSelector.completionsForTextInCurrentContext(before, prefix, false /* Don't force */, innerWordsWithPrefix);
        return promise;

        /**
         * @param {!Array.<string>} words
         */
        function innerWordsWithPrefix(words)
        {
            fulfill(words.map(item => ({title:item})).concat(historyWords));
        }
    },

    _editorSetForTest: function() { },

    __proto__: WebInspector.Widget.prototype
}
