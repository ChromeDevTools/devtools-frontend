// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 */
WebInspector.SourceCodeDiff = function(uiSourceCode, textEditor)
{
    this._uiSourceCode = uiSourceCode;
    this._textEditor = textEditor;
    this._decorations = [];
    this._textEditor.installGutter(WebInspector.SourceCodeDiff.DiffGutterType, true);
    this._diffBaseline = this._uiSourceCode.requestOriginalContent();
}

/** @type {number} */
WebInspector.SourceCodeDiff.UpdateTimeout = 200;

/** @type {string} */
WebInspector.SourceCodeDiff.DiffGutterType = "CodeMirror-gutter-diff";

WebInspector.SourceCodeDiff.prototype = {
    updateWhenPossible: function()
    {
        if (this._updateTimeout)
            clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(this.updateImmediately.bind(this), WebInspector.SourceCodeDiff.UpdateTimeout);
    },

    updateImmediately: function()
    {
        if (this._updateTimeout)
            clearTimeout(this._updateTimeout);
        this._updateTimeout = null;
        this._diffBaseline.then(this._innerUpdate.bind(this));
    },

    /**
     * @param {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>} decorations
     */
    _installEditorDecorations: function(decorations)
    {
        this._textEditor.operation(operation);

        function operation()
        {
            for (var decoration of decorations)
                decoration.install();
        }
    },

    /**
     * @param {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>} decorations
     */
    _removeEditorDecorations: function(decorations)
    {
        this._textEditor.operation(operation);

        function operation()
        {
            for (var decoration of decorations)
                decoration.remove();
        }
    },

    /**
     * @param {string} baseline
     * @param {string} current
     * @return {!Array<!{type: !WebInspector.SourceCodeDiff.GutterDecorationType, from: number, to: number}>}
     */
    _computeDiff: function(baseline, current)
    {
        var diff = WebInspector.Diff.lineDiff(baseline.split("\n"), current.split("\n"));
        var result = [];
        var hasAdded = false;
        var hasRemoved = false;
        var blockStartLineNumber = 0;
        var currentLineNumber = 0;
        var isInsideBlock = false;
        for (var i = 0; i < diff.length; ++i) {
            var token = diff[i];
            if (token[0] === WebInspector.Diff.Operation.Equal) {
                if (isInsideBlock)
                    flush();
                currentLineNumber += token[1].length;
                continue;
            }

            if (!isInsideBlock) {
                isInsideBlock = true;
                blockStartLineNumber = currentLineNumber;
            }

            if (token[0] === WebInspector.Diff.Operation.Delete) {
                hasRemoved = true;
            } else {
                currentLineNumber += token[1].length;
                hasAdded = true;
            }
        }
        if (isInsideBlock)
            flush();
        if (result.length > 1 && result[0].from === 0 && result[1].from === 0) {
            var merged = {
                type:  WebInspector.SourceCodeDiff.GutterDecorationType.Modify,
                from: 0,
                to: result[1].to
            };
            result.splice(0, 2, merged);
        }
        return result;

        function flush()
        {
            var type = WebInspector.SourceCodeDiff.GutterDecorationType.Insert;
            var from = blockStartLineNumber;
            var to = currentLineNumber;
            if (hasAdded && hasRemoved) {
                type = WebInspector.SourceCodeDiff.GutterDecorationType.Modify;
            } else if (!hasAdded && hasRemoved && from === 0 && to === 0) {
                type = WebInspector.SourceCodeDiff.GutterDecorationType.Modify;
                to = 1;
            } else if (!hasAdded && hasRemoved) {
                type = WebInspector.SourceCodeDiff.GutterDecorationType.Delete;
                from -= 1;
            }
            result.push({
                type: type,
                from: from,
                to: to
            });
            isInsideBlock = false;
            hasAdded = false;
            hasRemoved = false;
        }
    },

    /**
     * @param {?string} baseline
     */
    _innerUpdate: function(baseline)
    {
        var current = this._uiSourceCode.workingCopy();
        if (typeof current !== "string" || typeof baseline !== "string") {
            this._removeEditorDecorations(this._decorations);
            this._decorations = [];
            return;
        }

        var diff = this._computeDiff(baseline, current);
        var updater = new WebInspector.SourceCodeDiff.DecorationUpdater(this._textEditor, this._decorations);
        for (var i = 0; i < diff.length; ++i) {
            var diffEntry = diff[i];
            for (var lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber)
                updater.addDecoration(diffEntry.type, lineNumber);
        }
        updater.finalize();
        this._removeEditorDecorations(updater.removed());
        this._installEditorDecorations(updater.added());
        this._decorations = updater.newDecorations();
    }
}

/** @enum {string} */
WebInspector.SourceCodeDiff.GutterDecorationType = {
    Insert: "Insert",
    Delete: "Delete",
    Modify: "Modify",
}

/**
 * @constructor
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {number} lineNumber
 * @param {!WebInspector.SourceCodeDiff.GutterDecorationType} type
 */
WebInspector.SourceCodeDiff.GutterDecoration = function(textEditor, lineNumber, type)
{
    this._textEditor = textEditor;
    this._position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
    this._className = "";
    if (type === WebInspector.SourceCodeDiff.GutterDecorationType.Insert)
        this._className = "diff-entry-insert";
    else if (type === WebInspector.SourceCodeDiff.GutterDecorationType.Delete)
        this._className = "diff-entry-delete";
    else if (type === WebInspector.SourceCodeDiff.GutterDecorationType.Modify)
        this._className = "diff-entry-modify";
    this._type = type;
}

WebInspector.SourceCodeDiff.GutterDecoration.prototype = {
    /**
     * @return {number}
     */
    lineNumber: function()
    {
        var location = this._position.resolve();
        if (!location)
            return -1;
        return location.lineNumber;
    },

    /**
     * @return {!WebInspector.SourceCodeDiff.GutterDecorationType}
     */
    type: function()
    {
        return this._type;
    },

    install: function()
    {
        var location = this._position.resolve();
        if (!location)
            return;
        var element = createElementWithClass("div", "diff-marker");
        element.textContent = "\u00A0";
        this._textEditor.setGutterDecoration(location.lineNumber, WebInspector.SourceCodeDiff.DiffGutterType, element);
        this._textEditor.toggleLineClass(location.lineNumber, this._className, true);
    },

    remove: function()
    {
        var location = this._position.resolve();
        if (!location)
            return;
        this._textEditor.setGutterDecoration(location.lineNumber, WebInspector.SourceCodeDiff.DiffGutterType, null);
        this._textEditor.toggleLineClass(location.lineNumber, this._className, false);
    }
}

/**
 * @constructor
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>} decorations
 */
WebInspector.SourceCodeDiff.DecorationUpdater = function(textEditor, decorations)
{
    this._textEditor = textEditor;
    this._oldDecorations = decorations;
    this._oldIndex = 0;

    this._removed = [];
    this._added = [];
    this._newDecorations = [];
}

WebInspector.SourceCodeDiff.DecorationUpdater.prototype = {
    /**
     * @param {!WebInspector.SourceCodeDiff.GutterDecorationType} type
     * @param {number} lineNumber
     */
    addDecoration: function(type, lineNumber)
    {
        while (this._oldIndex < this._oldDecorations.length) {
            var decoration = this._oldDecorations[this._oldIndex];
            var decorationLine = decoration.lineNumber();
            if (decorationLine === lineNumber && decoration.type() === type) {
                ++this._oldIndex;
                this._newDecorations.push(decoration);
                return;
            }
            if (decorationLine >= lineNumber)
                break;

            this._removed.push(decoration);
            ++this._oldIndex;
        }
        var decoration = new WebInspector.SourceCodeDiff.GutterDecoration(this._textEditor, lineNumber, type);
        this._added.push(decoration);
        this._newDecorations.push(decoration);
    },

    finalize: function()
    {
        while (this._oldIndex < this._oldDecorations.length)
            this._removed.push(this._oldDecorations[this._oldIndex++]);
    },

    /**
     * @return {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>}
     */
    added: function()
    {
        return this._added;
    },

    /**
     * @return {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>}
     */
    removed: function()
    {
        return this._removed;
    },

    /**
     * @return {!Array<!WebInspector.SourceCodeDiff.GutterDecoration>}
     */
    newDecorations: function()
    {
        return this._newDecorations;
    }
}