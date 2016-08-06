// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {!CodeMirror} codeMirror
 */
WebInspector.TextEditorAutocompleteController = function(textEditor, codeMirror)
{
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;

    this._onScroll = this._onScroll.bind(this);
    this._onCursorActivity = this._onCursorActivity.bind(this);
    this._changes = this._changes.bind(this);
    this._blur = this._blur.bind(this);
    this._codeMirror.on("changes", this._changes);

    this._enabled = true;
    this._initialized = false;
    this._hintElement = createElementWithClass("span", "auto-complete-text");
}

WebInspector.TextEditorAutocompleteController.prototype = {
    _initializeIfNeeded: function()
    {
        if (this._initialized)
            return;
        this._initialized = true;
        this._codeMirror.on("scroll", this._onScroll);
        this._codeMirror.on("cursorActivity", this._onCursorActivity);
        this._codeMirror.on("mousedown", this.finishAutocomplete.bind(this));
        this._codeMirror.on("blur", this._blur);
        this._delegate.initialize(this._textEditor);
    },

    /**
     * @param {!WebInspector.TextEditorAutocompleteDelegate} delegate
     */
    setDelegate: function(delegate)
    {
        if (this._delegate)
            this._delegate.dispose();
        this._delegate = delegate;
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        if (enabled === this._enabled)
            return;
        this._enabled = enabled;
        if (!this._delegate)
            return;
        if (!enabled)
            this._delegate.dispose();
        else
            this._delegate.initialize();
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!CodeMirror.ChangeObject>} changes
     */
    _changes: function(codeMirror, changes)
    {
        if (!changes.length || !this._enabled || !this._delegate)
            return;
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
            this.finishAutocomplete();
    },

    _blur: function()
    {
        this.finishAutocomplete();
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
        var mainSelectionContext = this._textEditor.copyRange(mainSelection);
        for (var i = 0; i < selections.length; ++i) {
            var wordRange = this._delegate.substituteRange(this._textEditor, selections[i].head.line, selections[i].head.ch);
            if (!wordRange)
                return false;
            var context = this._textEditor.copyRange(wordRange);
            if (context !== mainSelectionContext)
                return false;
        }
        return true;
    },

    autocomplete: function()
    {
        if (!this._enabled || !this._delegate)
            return;
        this._initializeIfNeeded();
        if (this._codeMirror.somethingSelected()) {
            this.finishAutocomplete();
            return;
        }

        var cursor = this._codeMirror.getCursor("head");
        var substituteRange = this._delegate.substituteRange(this._textEditor, cursor.line, cursor.ch);
        if (!substituteRange || !this._validateSelectionsContexts(substituteRange)) {
            this.finishAutocomplete();
            return;
        }

        var prefixRange = substituteRange.clone();
        prefixRange.endColumn = cursor.ch;
        var prefix = this._textEditor.copyRange(prefixRange);
        var hadSuggestBox = false;
        if (this._suggestBox)
            hadSuggestBox = true;

        this._delegate.wordsWithPrefix(this._textEditor, prefixRange, substituteRange).then(wordsAcquired.bind(this));

        /**
         * @param {!WebInspector.SuggestBox.Suggestions} wordsWithPrefix
         * @this {WebInspector.TextEditorAutocompleteController}
         */
        function wordsAcquired(wordsWithPrefix)
        {
            if (!wordsWithPrefix.length || (wordsWithPrefix.length === 1 && prefix === wordsWithPrefix[0].title) || (!this._suggestBox && hadSuggestBox)) {
                this.finishAutocomplete();
                this._onSuggestionsShownForTest([]);
                return;
            }
            if (!this._suggestBox)
                this._suggestBox = new WebInspector.SuggestBox(this, 6);

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
        var prefix = this._textEditor.copyRange(this._prefixRange);
        this._lastPrefix = prefix;
        this._hintElement.textContent = hint.substring(prefix.length).split("\n")[0];
        var cursor = this._codeMirror.getCursor("to");
        this._hintMarker = this._textEditor.addBookmark(cursor.line, cursor.ch, this._hintElement, true);
    },

    _clearHintMarker: function()
    {
        if (!this._hintMarker)
            return;
        this._hintMarker.clear();
        delete this._hintMarker;
    },

    /**
     * @param {!Array<{className: (string|undefined), title: string}>} suggestions
     */
    _onSuggestionsShownForTest: function(suggestions) { },

    finishAutocomplete: function()
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
            this.finishAutocomplete();
            return true;
        case WebInspector.KeyboardShortcut.Keys.End.code:
        case WebInspector.KeyboardShortcut.Keys.Right.code:
            if (this._isCursorAtEndOfLine()) {
                this._suggestBox.acceptSuggestion();
                this.finishAutocomplete();
                return true;
            } else {
                this.finishAutocomplete();
                return false;
            }
        case WebInspector.KeyboardShortcut.Keys.Left.code:
        case WebInspector.KeyboardShortcut.Keys.Home.code:
            this.finishAutocomplete();
            return false;
        case WebInspector.KeyboardShortcut.Keys.Esc.code:
            this.finishAutocomplete();
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
            this.finishAutocomplete();
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
            this.finishAutocomplete();
    },

    _updateAnchorBox: function()
    {
        var line = this._prefixRange.startLine;
        var column = this._prefixRange.startColumn;
        var metrics = this._textEditor.cursorPositionToCoordinates(line, column);
        this._anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
    },
}

/**
 * @interface
 */
WebInspector.TextEditorAutocompleteDelegate = function() {}

WebInspector.TextEditorAutocompleteDelegate.prototype = {
    /**
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.TextRange}
     */
    substituteRange: function(editor, lineNumber, columnNumber) {},

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {!Promise.<!WebInspector.SuggestBox.Suggestions>}
     */
    wordsWithPrefix: function(editor, prefixRange, substituteRange) {},

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     */
    initialize: function(editor) {},

    dispose: function() {}
}

/**
 * @constructor
 * @implements {WebInspector.TextEditorAutocompleteDelegate}
 * @param {string=} additionalWordChars
 */
WebInspector.SimpleAutocompleteDelegate = function(additionalWordChars)
{
    this._additionalWordChars = additionalWordChars;
}

WebInspector.SimpleAutocompleteDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     */
    initialize: function(editor)
    {
        if (this._dictionary)
            this._dictionary.dispose();
        this._dictionary = editor.createTextDictionary(this._additionalWordChars);
    },

    /**
     * @override
     */
    dispose: function()
    {
        if (this._dictionary) {
            this._dictionary.dispose();
            delete this._dictionary;
        }
    },

    /**
     * @override
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.TextRange}
     */
    substituteRange: function(editor, lineNumber, columnNumber)
    {
        return editor.wordRangeForCursorPosition(lineNumber, columnNumber, this._dictionary.isWordChar.bind(this._dictionary));
    },

    /**
     * @override
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {!Promise.<!WebInspector.SuggestBox.Suggestions>}
     */
    wordsWithPrefix: function(editor, prefixRange, substituteRange)
    {
        if (prefixRange.startColumn === prefixRange.endColumn)
            return Promise.resolve([]);

        var dictionary = this._dictionary;
        var completions = dictionary.wordsWithPrefix(editor.copyRange(prefixRange));
        var substituteWord = editor.copyRange(substituteRange);
        if (dictionary.wordCount(substituteWord) === 1)
            completions = completions.filter(excludeFilter.bind(null, substituteWord));

        completions.sort(sortSuggestions);
        return Promise.resolve(completions.map(item => ({ title: item })));

        function sortSuggestions(a, b)
        {
            return dictionary.wordCount(b) - dictionary.wordCount(a) || a.length - b.length;
        }

        function excludeFilter(excludeWord, word)
        {
            return word !== excludeWord;
        }
    }
}
