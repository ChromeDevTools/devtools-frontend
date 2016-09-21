// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {!CodeMirror} codeMirror
 * @param {!WebInspector.AutocompleteConfig} config
 */
WebInspector.TextEditorAutocompleteController = function(textEditor, codeMirror, config)
{
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;
    this._config = config;
    this._initialized = false;

    this._onScroll = this._onScroll.bind(this);
    this._onCursorActivity = this._onCursorActivity.bind(this);
    this._changes = this._changes.bind(this);
    this._blur = this._blur.bind(this);
    this._beforeChange = this._beforeChange.bind(this);
    this._mouseDown = this.clearAutocomplete.bind(this);
    this._codeMirror.on("changes", this._changes);

    this._hintElement = createElementWithClass("span", "auto-complete-text");
}

WebInspector.TextEditorAutocompleteController.HintBookmark = Symbol("hint");

WebInspector.TextEditorAutocompleteController.prototype = {
    _initializeIfNeeded: function()
    {
        if (this._initialized)
            return;
        this._initialized = true;
        this._codeMirror.on("scroll", this._onScroll);
        this._codeMirror.on("cursorActivity", this._onCursorActivity);
        this._codeMirror.on("mousedown", this._mouseDown);
        this._codeMirror.on("blur", this._blur);
        if (this._config.isWordChar) {
            this._codeMirror.on("beforeChange", this._beforeChange);
            this._dictionary = new WebInspector.TextDictionary();
            this._addWordsFromText(this._codeMirror.getValue());
        }
    },

    dispose: function()
    {
        this._codeMirror.off("changes", this._changes);
        if (this._initialized) {
            this._codeMirror.off("scroll", this._onScroll);
            this._codeMirror.off("cursorActivity", this._onCursorActivity);
            this._codeMirror.off("mousedown", this._mouseDown);
            this._codeMirror.off("blur", this._blur);
        }
        if (this._dictionary) {
            this._codeMirror.off("beforeChange", this._beforeChange);
            this._dictionary.reset();
        }
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!CodeMirror.BeforeChangeObject} changeObject
     */
    _beforeChange: function(codeMirror, changeObject)
    {
        this._updatedLines = this._updatedLines || {};
        for (var i = changeObject.from.line; i <= changeObject.to.line; ++i)
            this._updatedLines[i] = this._codeMirror.getLine(i);
    },

    /**
     * @param {string} text
     */
    _addWordsFromText: function(text)
    {
        WebInspector.TextUtils.textToWords(text, /** @type {function(string):boolean} */ (this._config.isWordChar), addWord.bind(this));

        /**
         * @param {string} word
         * @this {WebInspector.TextEditorAutocompleteController}
         */
        function addWord(word)
        {
            if (word.length && (word[0] < "0" || word[0] > "9"))
                this._dictionary.addWord(word);
        }
    },

    /**
     * @param {string} text
     */
    _removeWordsFromText: function(text)
    {
        WebInspector.TextUtils.textToWords(text, /** @type {function(string):boolean} */ (this._config.isWordChar), (word) =>  this._dictionary.removeWord(word));
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.TextRange}
     */
    _substituteRange: function(lineNumber, columnNumber)
    {
        var range = this._config.substituteRangeCallback ? this._config.substituteRangeCallback(lineNumber, columnNumber) : null;
        if (!range && this._config.isWordChar)
            range = this._textEditor.wordRangeForCursorPosition(lineNumber, columnNumber, this._config.isWordChar);
        return range;
    },

    /**
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {!Promise.<!WebInspector.SuggestBox.Suggestions>}
     */
    _wordsWithPrefix: function(prefixRange, substituteRange)
    {
        var external = this._config.suggestionsCallback ? this._config.suggestionsCallback(prefixRange, substituteRange) : null;
        if (external)
            return external;

        if (!this._dictionary || prefixRange.startColumn === prefixRange.endColumn)
            return Promise.resolve([]);

        var completions = this._dictionary.wordsWithPrefix(this._textEditor.text(prefixRange));
        var substituteWord = this._textEditor.text(substituteRange);
        if (this._dictionary.wordCount(substituteWord) === 1)
            completions = completions.filter((word) => word !== substituteWord);

        completions.sort((a, b) => this._dictionary.wordCount(b) - this._dictionary.wordCount(a) || a.length - b.length);
        return Promise.resolve(completions.map(item => ({ title: item })));
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!CodeMirror.ChangeObject>} changes
     */
    _changes: function(codeMirror, changes)
    {
        if (!changes.length)
            return;

        if (this._dictionary && this._updatedLines) {
            for (var lineNumber in this._updatedLines)
                this._removeWordsFromText(this._updatedLines[lineNumber]);
            delete this._updatedLines;

            var linesToUpdate = {};
            for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
                var changeObject = changes[changeIndex];
                var editInfo = WebInspector.CodeMirrorUtils.changeObjectToEditOperation(changeObject);
                for (var i = editInfo.newRange.startLine; i <= editInfo.newRange.endLine; ++i)
                    linesToUpdate[i] = this._codeMirror.getLine(i);
            }
            for (var lineNumber in linesToUpdate)
                this._addWordsFromText(linesToUpdate[lineNumber]);
        }

        var singleCharInput = false;
        var singleCharDelete = false;
        var cursor = this._codeMirror.getCursor("head");
        for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
            var changeObject = changes[changeIndex];
            if (changeObject.origin === "+input"
                && changeObject.text.length === 1
                && changeObject.text[0].length === 1
                && changeObject.to.line === cursor.line
                && changeObject.to.ch + 1 === cursor.ch) {
                singleCharInput = true;
                break;
            }
            if (this._suggestBox
                && changeObject.origin === "+delete"
                && changeObject.removed.length === 1
                && changeObject.removed[0].length === 1
                && changeObject.to.line === cursor.line
                && changeObject.to.ch - 1 === cursor.ch) {
                singleCharDelete = true;
                break;
            }
        }
        if (singleCharInput && this._hintMarker)
            this._hintElement.textContent = this._hintElement.textContent.substring(1);

        if (singleCharDelete && this._hintMarker && this._lastPrefix) {
            this._hintElement.textContent = this._lastPrefix.charAt(this._lastPrefix.length - 1) + this._hintElement.textContent;
            this._lastPrefix = this._lastPrefix.substring(0, this._lastPrefix.length - 1);
        }
        if (singleCharInput || singleCharDelete)
            setImmediate(this.autocomplete.bind(this));
        else
            this.clearAutocomplete();
    },

    _blur: function()
    {
        this.clearAutocomplete();
    },

    /**
     * @param {!WebInspector.TextRange} mainSelection
     * @return {boolean}
     */
    _validateSelectionsContexts: function(mainSelection)
    {
        var selections = this._codeMirror.listSelections();
        if (selections.length <= 1)
            return true;
        var mainSelectionContext = this._textEditor.text(mainSelection);
        for (var i = 0; i < selections.length; ++i) {
            var wordRange = this._substituteRange(selections[i].head.line, selections[i].head.ch);
            if (!wordRange)
                return false;
            var context = this._textEditor.text(wordRange);
            if (context !== mainSelectionContext)
                return false;
        }
        return true;
    },

    autocomplete: function()
    {
        this._initializeIfNeeded();
        if (this._codeMirror.somethingSelected()) {
            this.clearAutocomplete();
            return;
        }

        var cursor = this._codeMirror.getCursor("head");
        var substituteRange = this._substituteRange(cursor.line, cursor.ch);
        if (!substituteRange || !this._validateSelectionsContexts(substituteRange)) {
            this.clearAutocomplete();
            return;
        }

        var prefixRange = substituteRange.clone();
        prefixRange.endColumn = cursor.ch;
        var prefix = this._textEditor.text(prefixRange);
        var hadSuggestBox = false;
        if (this._suggestBox)
            hadSuggestBox = true;

        this._wordsWithPrefix(prefixRange, substituteRange).then(wordsAcquired.bind(this));

        /**
         * @param {!WebInspector.SuggestBox.Suggestions} wordsWithPrefix
         * @this {WebInspector.TextEditorAutocompleteController}
         */
        function wordsAcquired(wordsWithPrefix)
        {
            if (!wordsWithPrefix.length || (wordsWithPrefix.length === 1 && prefix === wordsWithPrefix[0].title) || (!this._suggestBox && hadSuggestBox)) {
                this.clearAutocomplete();
                this._onSuggestionsShownForTest([]);
                return;
            }
            if (!this._suggestBox)
                this._suggestBox = new WebInspector.SuggestBox(this, 20, this._config.captureEnter);

            var oldPrefixRange = this._prefixRange;
            this._prefixRange = prefixRange;
            if (!oldPrefixRange || prefixRange.startLine !== oldPrefixRange.startLine || prefixRange.startColumn !== oldPrefixRange.startColumn)
                this._updateAnchorBox();
            this._suggestBox.updateSuggestions(this._anchorBox, wordsWithPrefix, 0, !this._isCursorAtEndOfLine(), prefix);
            this._onSuggestionsShownForTest(wordsWithPrefix);
            this._addHintMarker(wordsWithPrefix[0].title);
        }
    },

    /**
     * @param {string} hint
     */
    _addHintMarker: function(hint)
    {
        this._clearHintMarker();
        if (!this._isCursorAtEndOfLine())
            return;
        var prefix = this._textEditor.text(this._prefixRange);
        this._lastPrefix = prefix;
        this._hintElement.textContent = hint.substring(prefix.length).split("\n")[0];
        var cursor = this._codeMirror.getCursor("to");
        this._hintMarker = this._textEditor.addBookmark(cursor.line, cursor.ch, this._hintElement, WebInspector.TextEditorAutocompleteController.HintBookmark, true);
    },

    _clearHintMarker: function()
    {
        if (!this._hintMarker)
            return;
        this._hintMarker.clear();
        delete this._hintMarker;
    },

    /**
     * @param {!WebInspector.SuggestBox.Suggestions} suggestions
     */
    _onSuggestionsShownForTest: function(suggestions) { },

    clearAutocomplete: function()
    {
        if (!this._suggestBox)
            return;
        this._suggestBox.hide();
        this._suggestBox = null;
        this._prefixRange = null;
        this._anchorBox = null;
        this._clearHintMarker();
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    keyDown: function(event)
    {
        if (!this._suggestBox)
            return false;
        switch (event.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Tab.code:
            this._suggestBox.acceptSuggestion();
            this.clearAutocomplete();
            return true;
        case WebInspector.KeyboardShortcut.Keys.End.code:
        case WebInspector.KeyboardShortcut.Keys.Right.code:
            if (this._isCursorAtEndOfLine()) {
                this._suggestBox.acceptSuggestion();
                this.clearAutocomplete();
                return true;
            } else {
                this.clearAutocomplete();
                return false;
            }
        case WebInspector.KeyboardShortcut.Keys.Left.code:
        case WebInspector.KeyboardShortcut.Keys.Home.code:
            this.clearAutocomplete();
            return false;
        case WebInspector.KeyboardShortcut.Keys.Esc.code:
            this.clearAutocomplete();
            return true;
        }
        return this._suggestBox.keyPressed(event);
    },

    /**
     * @return {boolean}
     */
    _isCursorAtEndOfLine: function()
    {
        var cursor = this._codeMirror.getCursor("to");
        return cursor.ch === this._codeMirror.getLine(cursor.line).length;
    },

    /**
     * @override
     * @param {string} suggestion
     * @param {boolean=} isIntermediateSuggestion
     */
    applySuggestion: function(suggestion, isIntermediateSuggestion)
    {
        this._currentSuggestion = suggestion;
        this._addHintMarker(suggestion);
    },

    /**
     * @override
     */
    acceptSuggestion: function()
    {
        if (this._prefixRange.endColumn - this._prefixRange.startColumn === this._currentSuggestion.length)
            return;

        var selections = this._codeMirror.listSelections().slice();
        var prefixLength = this._prefixRange.endColumn - this._prefixRange.startColumn;
        for (var i = selections.length - 1; i >= 0; --i) {
            var start = selections[i].head;
            var end = new CodeMirror.Pos(start.line, start.ch - prefixLength);
            this._codeMirror.replaceRange(this._currentSuggestion, start, end, "+autocomplete");
        }
    },

    _onScroll: function()
    {
        if (!this._suggestBox)
            return;
        var cursor = this._codeMirror.getCursor();
        var scrollInfo = this._codeMirror.getScrollInfo();
        var topmostLineNumber = this._codeMirror.lineAtHeight(scrollInfo.top, "local");
        var bottomLine = this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, "local");
        if (cursor.line < topmostLineNumber || cursor.line > bottomLine)
            this.clearAutocomplete();
        else {
            this._updateAnchorBox();
            this._suggestBox.setPosition(this._anchorBox);
        }
    },

    _onCursorActivity: function()
    {
        if (!this._suggestBox)
            return;
        var cursor = this._codeMirror.getCursor();
        if (cursor.line !== this._prefixRange.startLine || cursor.ch > this._prefixRange.endColumn + 1 || cursor.ch <= this._prefixRange.startColumn)
            this.clearAutocomplete();
    },

    _updateAnchorBox: function()
    {
        var line = this._prefixRange.startLine;
        var column = this._prefixRange.startColumn;
        var metrics = this._textEditor.cursorPositionToCoordinates(line, column);
        this._anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
    },
}
