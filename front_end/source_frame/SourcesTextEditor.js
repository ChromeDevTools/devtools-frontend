// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.CodeMirrorTextEditor}
 * @param {!WebInspector.SourcesTextEditorDelegate} delegate
 */
WebInspector.SourcesTextEditor = function(delegate)
{
    WebInspector.CodeMirrorTextEditor.call(this, {
        lineNumbers: true,
        lineWrapping: false,
        bracketMatchingSetting: WebInspector.moduleSetting("textEditorBracketMatching"),
    });

    this.codeMirror().addKeyMap({
        "Enter": "smartNewlineAndIndent",
        "Esc": "sourcesDismiss"
    });

    this._delegate = delegate;

    this.codeMirror().on("changes", this._changesForDelegate.bind(this));
    this.codeMirror().on("cursorActivity", this._cursorActivity.bind(this));
    this.codeMirror().on("gutterClick", this._gutterClick.bind(this));
    this.codeMirror().on("scroll", this._scroll.bind(this));
    this.codeMirror().on("focus", this._focus.bind(this));
    this.codeMirror().on("blur", this._blur.bind(this));
    this.codeMirror().on("beforeSelectionChange", this._beforeSelectionChangeForDelegate.bind(this));
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);

    this._blockIndentController = new WebInspector.SourcesTextEditor.BlockIndentController(this.codeMirror());
    this._tokenHighlighter = new WebInspector.SourcesTextEditor.TokenHighlighter(this, this.codeMirror());

    /** @type {!Array<string>} */
    this._gutters = ["CodeMirror-linenumbers"];
    this.codeMirror().setOption("gutters", this._gutters.slice());

    this.codeMirror().setOption("electricChars", false);
    this.codeMirror().setOption("smartIndent", false);

    /**
     * @this {WebInspector.SourcesTextEditor}
     */
    function updateAnticipateJumpFlag(value)
    {
        this._isHandlingMouseDownEvent = value;
    }

    this.element.addEventListener("mousedown", updateAnticipateJumpFlag.bind(this, true), true);
    this.element.addEventListener("mousedown", updateAnticipateJumpFlag.bind(this, false), false);
    WebInspector.moduleSetting("textEditorIndent").addChangeListener(this._onUpdateEditorIndentation, this);
    WebInspector.moduleSetting("textEditorAutoDetectIndent").addChangeListener(this._onUpdateEditorIndentation, this);
    WebInspector.moduleSetting("showWhitespacesInEditor").addChangeListener(this._updateWhitespace, this);

    this._onUpdateEditorIndentation();
    this._setupWhitespaceHighlight();
}
WebInspector.SourcesTextEditor.prototype = {
    /**
     * @return {boolean}
     */
    _isSearchActive: function()
    {
        return !!this._tokenHighlighter.highlightedRegex();
    },

    /**
     * @param {!RegExp} regex
     * @param {?WebInspector.TextRange} range
     */
    highlightSearchResults: function(regex, range)
    {
        /**
         * @this {WebInspector.CodeMirrorTextEditor}
         */
        function innerHighlightRegex()
        {
            if (range) {
                this.scrollLineIntoView(range.startLine);
                if (range.endColumn > WebInspector.CodeMirrorTextEditor.maxHighlightLength)
                    this.setSelection(range);
                else
                    this.setSelection(WebInspector.TextRange.createFromLocation(range.startLine, range.startColumn));
            }
            this._tokenHighlighter.highlightSearchResults(regex, range);
        }

        if (!this._selectionBeforeSearch)
            this._selectionBeforeSearch = this.selection();

        this.codeMirror().operation(innerHighlightRegex.bind(this));
    },

    cancelSearchResultsHighlight: function()
    {
        this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));

        if (this._selectionBeforeSearch) {
            this._reportJump(this._selectionBeforeSearch, this.selection());
            delete this._selectionBeforeSearch;
        }
    },

    /**
     * @param {!Object} highlightDescriptor
     */
    removeHighlight: function(highlightDescriptor)
    {
        highlightDescriptor.clear();
    },

    /**
     * @param {!WebInspector.TextRange} range
     * @param {string} cssClass
     * @return {!Object}
     */
    highlightRange: function(range, cssClass)
    {
        cssClass = "CodeMirror-persist-highlight " + cssClass;
        var pos = WebInspector.CodeMirrorUtils.toPos(range);
        ++pos.end.ch;
        return this.codeMirror().markText(pos.start, pos.end, {
            className: cssClass,
            startStyle: cssClass + "-start",
            endStyle: cssClass + "-end"
        });
    },

    /**
     * @param {number} lineNumber
     * @param {boolean} disabled
     * @param {boolean} conditional
     */
    addBreakpoint: function(lineNumber, disabled, conditional)
    {
        if (lineNumber < 0 || lineNumber >= this.codeMirror().lineCount())
            return;

        var className = "cm-breakpoint" + (conditional ? " cm-breakpoint-conditional" : "") + (disabled ? " cm-breakpoint-disabled" : "");
        this.codeMirror().addLineClass(lineNumber, "wrap", className);
    },

    /**
     * @param {number} lineNumber
     */
    removeBreakpoint: function(lineNumber)
    {
        if (lineNumber < 0 || lineNumber >= this.codeMirror().lineCount())
            return;

        var wrapClasses = this.codeMirror().getLineHandle(lineNumber).wrapClass;
        if (!wrapClasses)
            return;

        var classes = wrapClasses.split(" ");
        for (var i = 0; i < classes.length; ++i) {
            if (classes[i].startsWith("cm-breakpoint"))
                this.codeMirror().removeLineClass(lineNumber, "wrap", classes[i]);
        }
    },

    /**
     * @param {string} type
     * @param {boolean} leftToNumbers
     */
    installGutter: function(type, leftToNumbers)
    {
        if (this._gutters.indexOf(type) !== -1)
            return;

        if (leftToNumbers)
            this._gutters.unshift(type);
        else
            this._gutters.push(type);

        this.codeMirror().setOption("gutters", this._gutters.slice());
        this.refresh();
    },

    /**
     * @param {string} type
     */
    uninstallGutter: function(type)
    {
        var index = this._gutters.indexOf(type);
        if (index === -1)
            return;
        this._gutters.splice(index,1);
        this.codeMirror().setOption("gutters", this._gutters.slice());
        this.refresh();
    },

    /**
     * @param {number} lineNumber
     * @param {string} type
     * @param {?Element} element
     */
    setGutterDecoration: function(lineNumber, type, element)
    {
        console.assert(this._gutters.indexOf(type) !== -1, "Cannot decorate unexisting gutter.")
        this.codeMirror().setGutterMarker(lineNumber, type, element);
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     */
    setExecutionLocation: function(lineNumber, columnNumber)
    {
        this.clearPositionHighlight();

        this._executionLine = this.codeMirror().getLineHandle(lineNumber);
        if (!this._executionLine)
            return;

        this.codeMirror().addLineClass(this._executionLine, "wrap", "cm-execution-line");
        this._executionLineTailMarker = this.codeMirror().markText({ line: lineNumber, ch: columnNumber }, { line: lineNumber, ch: this.codeMirror().getLine(lineNumber).length }, { className: "cm-execution-line-tail" });
    },

    clearExecutionLine: function()
    {
        this.clearPositionHighlight();

        if (this._executionLine)
            this.codeMirror().removeLineClass(this._executionLine, "wrap", "cm-execution-line");
        delete this._executionLine;

        if (this._executionLineTailMarker)
            this._executionLineTailMarker.clear();
        delete this._executionLineTailMarker;
    },

    /**
     * @param {number} lineNumber
     * @param {string} className
     * @param {boolean} toggled
     */
    toggleLineClass: function(lineNumber, className, toggled)
    {
        if (this.hasLineClass(lineNumber, className) === toggled)
            return;

        var lineHandle = this.codeMirror().getLineHandle(lineNumber);
        if (!lineHandle)
            return;

        if (toggled) {
            this.codeMirror().addLineClass(lineHandle, "gutter", className);
            this.codeMirror().addLineClass(lineHandle, "wrap", className);
        } else {
            this.codeMirror().removeLineClass(lineHandle, "gutter", className);
            this.codeMirror().removeLineClass(lineHandle, "wrap", className);
        }
    },

    /**
     * @param {number} lineNumber
     * @param {string} className
     * @return {boolean}
     */
    hasLineClass: function(lineNumber, className)
    {
        var lineInfo = this.codeMirror().lineInfo(lineNumber);
        var wrapClass = lineInfo.wrapClass || "";
        var classNames = wrapClass.split(" ");
        return classNames.indexOf(className) !== -1;
    },

    _gutterClick: function(instance, lineNumber, gutter, event)
    {
        this.dispatchEventToListeners(WebInspector.SourcesTextEditor.Events.GutterClick, { lineNumber: lineNumber, event: event });
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        event.consume(true); // Consume event now to prevent document from handling the async menu
        var target = event.target.enclosingNodeOrSelfWithClass("CodeMirror-gutter-elt");
        var promise;
        if (target) {
            promise = this._delegate.populateLineGutterContextMenu(contextMenu, parseInt(target.textContent, 10) - 1);
        } else {
            var textSelection = this.selection();
            promise = this._delegate.populateTextAreaContextMenu(contextMenu, textSelection.startLine, textSelection.startColumn);
        }
        promise.then(showAsync.bind(this));

        /**
         * @this {WebInspector.SourcesTextEditor}
         */
        function showAsync()
        {
            contextMenu.appendApplicableItems(this);
            contextMenu.show();
        }
    },

    /**
     * @override
     * @param {!WebInspector.TextRange} range
     * @param {string} text
     * @param {string=} origin
     * @return {!WebInspector.TextRange}
     */
    editRange: function(range, text, origin)
    {
        var newRange = WebInspector.CodeMirrorTextEditor.prototype.editRange.call(this, range, text, origin);
        this._delegate.onTextChanged(range, newRange);

        if (WebInspector.moduleSetting("textEditorAutoDetectIndent").get())
            this._onUpdateEditorIndentation();

        return newRange;
    },

    _onUpdateEditorIndentation: function()
    {
        this._setEditorIndentation(WebInspector.CodeMirrorUtils.pullLines(this.codeMirror(), WebInspector.SourcesTextEditor.LinesToScanForIndentationGuessing));
    },

    /**
     * @param {!Array.<string>} lines
     */
    _setEditorIndentation: function(lines)
    {
        var extraKeys = {};
        var indent = WebInspector.moduleSetting("textEditorIndent").get();
        if (WebInspector.moduleSetting("textEditorAutoDetectIndent").get())
            indent = WebInspector.SourcesTextEditor._guessIndentationLevel(lines);

        if (indent === WebInspector.TextUtils.Indent.TabCharacter) {
            this.codeMirror().setOption("indentWithTabs", true);
            this.codeMirror().setOption("indentUnit", 4);
        } else {
            this.codeMirror().setOption("indentWithTabs", false);
            this.codeMirror().setOption("indentUnit", indent.length);
            extraKeys.Tab = function(codeMirror)
            {
                if (codeMirror.somethingSelected())
                    return CodeMirror.Pass;
                var pos = codeMirror.getCursor("head");
                codeMirror.replaceRange(indent.substring(pos.ch % indent.length), codeMirror.getCursor());
            }
        }

        this.codeMirror().setOption("extraKeys", extraKeys);
        this._indentationLevel = indent;
    },

    /**
     * @return {string}
     */
    indent: function()
    {
        return this._indentationLevel;
    },

    _onAutoAppendedSpaces: function()
    {
        this._autoAppendedSpaces = this._autoAppendedSpaces || [];

        for (var i = 0; i < this._autoAppendedSpaces.length; ++i) {
            var position = this._autoAppendedSpaces[i].resolve();
            if (!position)
                continue;
            var line = this.line(position.lineNumber);
            if (line.length === position.columnNumber && WebInspector.TextUtils.lineIndent(line).length === line.length)
                this.codeMirror().replaceRange("", new CodeMirror.Pos(position.lineNumber, 0), new CodeMirror.Pos(position.lineNumber, position.columnNumber));
        }

        this._autoAppendedSpaces = [];
        var selections = this.selections();
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            this._autoAppendedSpaces.push(this.textEditorPositionHandle(selection.startLine, selection.startColumn));
        }
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!CodeMirror.ChangeObject>} changes
     */
    _changesForDelegate: function(codeMirror, changes)
    {
        if (!changes.length || this._muteTextChangedEvent)
            return;
        var edits = [];
        var currentEdit;

        for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
            var changeObject = changes[changeIndex];
            var edit = WebInspector.CodeMirrorUtils.changeObjectToEditOperation(changeObject);
            if (currentEdit && edit.oldRange.equal(currentEdit.newRange)) {
                currentEdit.newRange = edit.newRange;
            } else {
                currentEdit = edit;
                edits.push(currentEdit);
            }
        }

        for (var i = 0; i < edits.length; ++i) {
            var edit = edits[i];
            this._delegate.onTextChanged(edit.oldRange, edit.newRange);
        }
    },

    _cursorActivity: function()
    {
        if (!this._isSearchActive())
            this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));

        var start = this.codeMirror().getCursor("anchor");
        var end = this.codeMirror().getCursor("head");
        this._delegate.selectionChanged(WebInspector.CodeMirrorUtils.toRange(start, end));
    },

    /**
     * @param {?WebInspector.TextRange} from
     * @param {?WebInspector.TextRange} to
     */
    _reportJump: function(from, to)
    {
        if (from && to && from.equal(to))
            return;
        this._delegate.onJumpToPosition(from, to);
    },

    _scroll: function()
    {
        var topmostLineNumber = this.codeMirror().lineAtHeight(this.codeMirror().getScrollInfo().top, "local");
        this._delegate.scrollChanged(topmostLineNumber);
    },

    _focus: function()
    {
        this._delegate.editorFocused();
    },

    _blur: function()
    {
        this._delegate.editorBlurred();
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {{ranges: !Array.<{head: !CodeMirror.Pos, anchor: !CodeMirror.Pos}>}} selection
     */
    _beforeSelectionChangeForDelegate: function(codeMirror, selection)
    {
        if (!this._isHandlingMouseDownEvent)
            return;
        if (!selection.ranges.length)
            return;

        var primarySelection = selection.ranges[0];
        this._reportJump(this.selection(), WebInspector.CodeMirrorUtils.toRange(primarySelection.anchor, primarySelection.head));
    },

    /**
     * @override
     */
    dispose: function()
    {
        WebInspector.CodeMirrorTextEditor.prototype.dispose.call(this);
        WebInspector.moduleSetting("textEditorIndent").removeChangeListener(this._onUpdateEditorIndentation, this);
        WebInspector.moduleSetting("textEditorAutoDetectIndent").removeChangeListener(this._onUpdateEditorIndentation, this);
        WebInspector.moduleSetting("showWhitespacesInEditor").removeChangeListener(this._updateWhitespace, this);
    },

    /**
     * @override
     * @param {string} text
     */
    setText: function(text)
    {
        this._muteTextChangedEvent = true;
        this._setEditorIndentation(text.split("\n").slice(0, WebInspector.SourcesTextEditor.LinesToScanForIndentationGuessing));
        WebInspector.CodeMirrorTextEditor.prototype.setText.call(this, text);
        delete this._muteTextChangedEvent;
    },

    /**
     * @override
     * @param {string} mimeType
     */
    setMimeType: function(mimeType)
    {
        this._mimeType = mimeType;
        WebInspector.CodeMirrorTextEditor.prototype.setMimeType.call(this, this._applyWhitespaceMimetype(mimeType));
    },

    _updateWhitespace: function()
    {
        if (this._mimeType)
            this.setMimeType(this._mimeType);
    },

    /**
     * @param {string} mimeType
     * @return {string}
     */
    _applyWhitespaceMimetype: function(mimeType)
    {
        this._setupWhitespaceHighlight();
        var whitespaceMode = WebInspector.moduleSetting("showWhitespacesInEditor").get();
        this.element.classList.toggle("show-whitespaces", whitespaceMode === "all");

        if (whitespaceMode === "all")
            return this._allWhitespaceOverlayMode(mimeType);
        else if (whitespaceMode === "trailing")
            return this._trailingWhitespaceOverlayMode(mimeType);

        return mimeType;
    },

    /**
     * @param {string} mimeType
     * @return {string}
     */
    _allWhitespaceOverlayMode: function(mimeType)
    {
        var modeName = CodeMirror.mimeModes[mimeType] ? (CodeMirror.mimeModes[mimeType].name || CodeMirror.mimeModes[mimeType]) : CodeMirror.mimeModes["text/plain"];
        modeName += "+all-whitespaces";
        if (CodeMirror.modes[modeName])
            return modeName;

        function modeConstructor(config, parserConfig)
        {
            function nextToken(stream)
            {
                if (stream.peek() === " ") {
                    var spaces = 0;
                    while (spaces < WebInspector.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan && stream.peek() === " ") {
                        ++spaces;
                        stream.next();
                    }
                    return "whitespace whitespace-" + spaces;
                }
                while (!stream.eol() && stream.peek() !== " ")
                    stream.next();
                return null;
            }
            var whitespaceMode = {
                token: nextToken
            };
            return CodeMirror.overlayMode(CodeMirror.getMode(config, mimeType), whitespaceMode, false);
        }
        CodeMirror.defineMode(modeName, modeConstructor);
        return modeName;
    },

    /**
     * @param {string} mimeType
     * @return {string}
     */
    _trailingWhitespaceOverlayMode: function(mimeType)
    {
        var modeName = CodeMirror.mimeModes[mimeType] ? (CodeMirror.mimeModes[mimeType].name || CodeMirror.mimeModes[mimeType]) : CodeMirror.mimeModes["text/plain"];
        modeName += "+trailing-whitespaces";
        if (CodeMirror.modes[modeName])
            return modeName;

        function modeConstructor(config, parserConfig)
        {
            function nextToken(stream)
            {
                var pos = stream.pos;
                if (stream.match(/^\s+$/, true))
                    return true ? "trailing-whitespace" : null;
                do {
                    stream.next();
                } while (!stream.eol() && stream.peek() !== " ");
                return null;
            }
            var whitespaceMode = {
                token: nextToken
            };
            return CodeMirror.overlayMode(CodeMirror.getMode(config, mimeType), whitespaceMode, false);
        }
        CodeMirror.defineMode(modeName, modeConstructor);
        return modeName;
    },

    _setupWhitespaceHighlight: function()
    {
        var doc = this.element.ownerDocument;
        if (doc._codeMirrorWhitespaceStyleInjected || !WebInspector.moduleSetting("showWhitespacesInEditor").get())
            return;
        doc._codeMirrorWhitespaceStyleInjected = true;
        const classBase = ".show-whitespaces .CodeMirror .cm-whitespace-";
        const spaceChar = "·";
        var spaceChars = "";
        var rules = "";
        for (var i = 1; i <= WebInspector.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan; ++i) {
            spaceChars += spaceChar;
            var rule = classBase + i + "::before { content: '" + spaceChars + "';}\n";
            rules += rule;
        }
        var style = doc.createElement("style");
        style.textContent = rules;
        doc.head.appendChild(style);
    },

    __proto__: WebInspector.CodeMirrorTextEditor.prototype
}

/** @typedef {{lineNumber: number, event: !Event}} */
WebInspector.SourcesTextEditor.GutterClickEventData;

/** @enum {symbol} */
WebInspector.SourcesTextEditor.Events = {
    GutterClick: Symbol("GutterClick")
}

/**
 * @interface
 */
WebInspector.SourcesTextEditorDelegate = function() { }
WebInspector.SourcesTextEditorDelegate.prototype = {

    /**
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    onTextChanged: function(oldRange, newRange) { },

    /**
     * @param {!WebInspector.TextRange} textRange
     */
    selectionChanged: function(textRange) { },

    /**
     * @param {number} lineNumber
     */
    scrollChanged: function(lineNumber) { },

    editorFocused: function() { },

    editorBlurred: function() { },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {number} lineNumber
     * @return {!Promise}
     */
    populateLineGutterContextMenu: function(contextMenu, lineNumber) { },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!Promise}
     */
    populateTextAreaContextMenu: function(contextMenu, lineNumber, columnNumber) { },

    /**
     * @param {?WebInspector.TextRange} from
     * @param {?WebInspector.TextRange} to
     */
    onJumpToPosition: function(from, to) { }
}

/**
 * @param {!CodeMirror} codeMirror
 */
CodeMirror.commands.smartNewlineAndIndent = function(codeMirror)
{
    codeMirror.operation(innerSmartNewlineAndIndent.bind(null, codeMirror));
    function innerSmartNewlineAndIndent(codeMirror)
    {
        var selections = codeMirror.listSelections();
        var replacements = [];
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            var cur = CodeMirror.cmpPos(selection.head, selection.anchor) < 0 ? selection.head : selection.anchor;
            var line = codeMirror.getLine(cur.line);
            var indent = WebInspector.TextUtils.lineIndent(line);
            replacements.push("\n" + indent.substring(0, Math.min(cur.ch, indent.length)));
        }
        codeMirror.replaceSelections(replacements);
        codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
    }
}

/**
 * @return {!Object|undefined}
 */
CodeMirror.commands.sourcesDismiss = function(codemirror)
{
    if (codemirror.listSelections().length === 1 && codemirror._codeMirrorTextEditor._isSearchActive())
        return CodeMirror.Pass;
    return CodeMirror.commands.dismiss(codemirror);
}

/**
 * @constructor
 * @param {!CodeMirror} codeMirror
 */
WebInspector.SourcesTextEditor.BlockIndentController = function(codeMirror)
{
    codeMirror.addKeyMap(this);
}

WebInspector.SourcesTextEditor.BlockIndentController.prototype = {
    name: "blockIndentKeymap",

    /**
     * @return {*}
     */
    Enter: function(codeMirror)
    {
        var selections = codeMirror.listSelections();
        var replacements = [];
        var allSelectionsAreCollapsedBlocks = false;
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            var start = CodeMirror.cmpPos(selection.head, selection.anchor) < 0 ? selection.head : selection.anchor;
            var line = codeMirror.getLine(start.line);
            var indent = WebInspector.TextUtils.lineIndent(line);
            var indentToInsert = "\n" + indent + codeMirror._codeMirrorTextEditor.indent();
            var isCollapsedBlock = false;
            if (selection.head.ch === 0)
                return CodeMirror.Pass;
            if (line.substr(selection.head.ch - 1, 2) === "{}") {
                indentToInsert += "\n" + indent;
                isCollapsedBlock = true;
            } else if (line.substr(selection.head.ch - 1, 1) !== "{") {
                return CodeMirror.Pass;
            }
            if (i > 0 && allSelectionsAreCollapsedBlocks !== isCollapsedBlock)
                return CodeMirror.Pass;
            replacements.push(indentToInsert);
            allSelectionsAreCollapsedBlocks = isCollapsedBlock;
        }
        codeMirror.replaceSelections(replacements);
        if (!allSelectionsAreCollapsedBlocks) {
            codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
            return;
        }
        selections = codeMirror.listSelections();
        var updatedSelections = [];
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            var line = codeMirror.getLine(selection.head.line - 1);
            var position = new CodeMirror.Pos(selection.head.line - 1, line.length);
            updatedSelections.push({
                head: position,
                anchor: position
            });
        }
        codeMirror.setSelections(updatedSelections);
        codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
    },

    /**
     * @return {*}
     */
    "'}'": function(codeMirror)
    {
        if (codeMirror.somethingSelected())
            return CodeMirror.Pass;
        var selections = codeMirror.listSelections();
        var replacements = [];
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            var line = codeMirror.getLine(selection.head.line);
            if (line !== WebInspector.TextUtils.lineIndent(line))
                return CodeMirror.Pass;
            replacements.push("}");
        }
        codeMirror.replaceSelections(replacements);
        selections = codeMirror.listSelections();
        replacements = [];
        var updatedSelections = [];
        for (var i = 0; i < selections.length; ++i) {
            var selection = selections[i];
            var matchingBracket = codeMirror.findMatchingBracket(selection.head);
            if (!matchingBracket || !matchingBracket.match)
                return;
            updatedSelections.push({
                head: selection.head,
                anchor: new CodeMirror.Pos(selection.head.line, 0)
            });
            var line = codeMirror.getLine(matchingBracket.to.line);
            var indent = WebInspector.TextUtils.lineIndent(line);
            replacements.push(indent + "}");
        }
        codeMirror.setSelections(updatedSelections);
        codeMirror.replaceSelections(replacements);
    }
}

/**
 * @param {!Array.<string>} lines
 * @return {string}
 */
WebInspector.SourcesTextEditor._guessIndentationLevel = function(lines)
{
    var tabRegex = /^\t+/;
    var tabLines = 0;
    var indents = {};
    for (var lineNumber = 0; lineNumber < lines.length; ++lineNumber) {
        var text = lines[lineNumber];
        if (text.length === 0 || !WebInspector.TextUtils.isSpaceChar(text[0]))
            continue;
        if (tabRegex.test(text)) {
            ++tabLines;
            continue;
        }
        var i = 0;
        while (i < text.length && WebInspector.TextUtils.isSpaceChar(text[i]))
            ++i;
        if (i % 2 !== 0)
            continue;
        indents[i] = 1 + (indents[i] || 0);
    }
    var linesCountPerIndentThreshold = 3 * lines.length / 100;
    if (tabLines && tabLines > linesCountPerIndentThreshold)
        return "\t";
    var minimumIndent = Infinity;
    for (var i in indents) {
        if (indents[i] < linesCountPerIndentThreshold)
            continue;
        var indent = parseInt(i, 10);
        if (minimumIndent > indent)
            minimumIndent = indent;
    }
    if (minimumIndent === Infinity)
        return WebInspector.moduleSetting("textEditorIndent").get();
    return " ".repeat(minimumIndent);
}

/**
 * @constructor
 * @param {!WebInspector.SourcesTextEditor} textEditor
 * @param {!CodeMirror} codeMirror
 */
WebInspector.SourcesTextEditor.TokenHighlighter = function(textEditor, codeMirror)
{
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;
}

WebInspector.SourcesTextEditor.TokenHighlighter.prototype = {
    /**
     * @param {!RegExp} regex
     * @param {?WebInspector.TextRange} range
     */
    highlightSearchResults: function(regex, range)
    {
        var oldRegex = this._highlightRegex;
        this._highlightRegex = regex;
        this._highlightRange = range;
        if (this._searchResultMarker) {
            this._searchResultMarker.clear();
            delete this._searchResultMarker;
        }
        if (this._highlightDescriptor && this._highlightDescriptor.selectionStart)
            this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line, "wrap", "cm-line-with-selection");
        var selectionStart = this._highlightRange ? new CodeMirror.Pos(this._highlightRange.startLine, this._highlightRange.startColumn) : null;
        if (selectionStart)
            this._codeMirror.addLineClass(selectionStart.line, "wrap", "cm-line-with-selection");
        if (this._highlightRegex === oldRegex) {
            // Do not re-add overlay mode if regex did not change for better performance.
            if (this._highlightDescriptor)
                this._highlightDescriptor.selectionStart = selectionStart;
        } else {
            this._removeHighlight();
            this._setHighlighter(this._searchHighlighter.bind(this, this._highlightRegex), selectionStart);
        }
        if (this._highlightRange) {
            var pos = WebInspector.CodeMirrorUtils.toPos(this._highlightRange);
            this._searchResultMarker = this._codeMirror.markText(pos.start, pos.end, {className: "cm-column-with-selection"});
        }
    },

    /**
     * @return {!RegExp|undefined}
     */
    highlightedRegex: function()
    {
        return this._highlightRegex;
    },

    highlightSelectedTokens: function()
    {
        delete this._highlightRegex;
        delete this._highlightRange;
        if (this._highlightDescriptor && this._highlightDescriptor.selectionStart)
            this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line, "wrap", "cm-line-with-selection");
        this._removeHighlight();
        var selectionStart = this._codeMirror.getCursor("start");
        var selectionEnd = this._codeMirror.getCursor("end");
        if (selectionStart.line !== selectionEnd.line)
            return;
        if (selectionStart.ch === selectionEnd.ch)
            return;
        var selections = this._codeMirror.getSelections();
        if (selections.length > 1)
            return;
        var selectedText = selections[0];
        if (this._isWord(selectedText, selectionStart.line, selectionStart.ch, selectionEnd.ch)) {
            if (selectionStart)
                this._codeMirror.addLineClass(selectionStart.line, "wrap", "cm-line-with-selection");
            this._setHighlighter(this._tokenHighlighter.bind(this, selectedText, selectionStart), selectionStart);
        }
    },

    /**
     * @param {string} selectedText
     * @param {number} lineNumber
     * @param {number} startColumn
     * @param {number} endColumn
     */
    _isWord: function(selectedText, lineNumber, startColumn, endColumn)
    {
        var line = this._codeMirror.getLine(lineNumber);
        var leftBound = startColumn === 0 || !WebInspector.TextUtils.isWordChar(line.charAt(startColumn - 1));
        var rightBound = endColumn === line.length || !WebInspector.TextUtils.isWordChar(line.charAt(endColumn));
        return leftBound && rightBound && WebInspector.TextUtils.isWord(selectedText);
    },

    _removeHighlight: function()
    {
        if (this._highlightDescriptor) {
            this._codeMirror.removeOverlay(this._highlightDescriptor.overlay);
            delete this._highlightDescriptor;
        }
    },

    /**
     * @param {!RegExp} regex
     * @param {!CodeMirror.StringStream} stream
     */
    _searchHighlighter: function(regex, stream)
    {
        if (stream.column() === 0)
            delete this._searchMatchLength;
        if (this._searchMatchLength) {
            if (this._searchMatchLength > 2) {
                for (var i = 0; i < this._searchMatchLength - 2; ++i)
                    stream.next();
                this._searchMatchLength = 1;
                return "search-highlight";
            } else {
                stream.next();
                delete this._searchMatchLength;
                return "search-highlight search-highlight-end";
            }
        }
        var match = stream.match(regex, false);
        if (match) {
            stream.next();
            var matchLength = match[0].length;
            if (matchLength === 1)
                return "search-highlight search-highlight-full";
            this._searchMatchLength = matchLength;
            return "search-highlight search-highlight-start";
        }
        while (!stream.match(regex, false) && stream.next()) {}
    },

    /**
     * @param {string} token
     * @param {!CodeMirror.Pos} selectionStart
     * @param {!CodeMirror.StringStream} stream
     */
    _tokenHighlighter: function(token, selectionStart, stream)
    {
        var tokenFirstChar = token.charAt(0);
        if (stream.match(token) && (stream.eol() || !WebInspector.TextUtils.isWordChar(stream.peek())))
            return stream.column() === selectionStart.ch ? "token-highlight column-with-selection" : "token-highlight";
        var eatenChar;
        do {
            eatenChar = stream.next();
        } while (eatenChar && (WebInspector.TextUtils.isWordChar(eatenChar) || stream.peek() !== tokenFirstChar));
    },

    /**
     * @param {function(!CodeMirror.StringStream)} highlighter
     * @param {?CodeMirror.Pos} selectionStart
     */
    _setHighlighter: function(highlighter, selectionStart)
    {
        var overlayMode = {
            token: highlighter
        };
        this._codeMirror.addOverlay(overlayMode);
        this._highlightDescriptor = {
            overlay: overlayMode,
            selectionStart: selectionStart
        };
    }
}

WebInspector.SourcesTextEditor.LinesToScanForIndentationGuessing = 1000;
WebInspector.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan = 16;
