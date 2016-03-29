// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} value
 */
WebInspector.Text = function(value)
{
    this._value = value;
}

WebInspector.Text.prototype = {
    /**
     * @return {!Array<number>}
     */
    lineEndings: function()
    {
        if (!this._lineEndings)
            this._lineEndings = this._value.computeLineEndings();
        return this._lineEndings;
    },

    /**
     * @return {string}
     */
    value: function()
    {
        return this._value;
    },

    /**
     * @return {number}
     */
    lineCount: function()
    {
        var lineEndings = this.lineEndings();
        return lineEndings.length;
    },

    /**
     * @param {number} lineNumber
     * @param {number} columNumber
     * @return {number}
     */
    offsetFromPosition: function(lineNumber, columNumber)
    {
        return (lineNumber ? this.lineEndings()[lineNumber - 1] + 1 : 0) + columNumber;
    },

    /**
     * @return {string}
     */
    lineAt: function(lineNumber)
    {
        var lineEndings = this.lineEndings();
        var lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
        var lineEnd = lineEndings[lineNumber];
        var lineContent = this._value.substring(lineStart, lineEnd);
        if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === "\r")
            lineContent = lineContent.substring(0, lineContent.length - 1);
        return lineContent;
    },

    /**
     * @param {!WebInspector.TextRange} range
     * @return {!WebInspector.SourceRange}
     */
    toSourceRange: function(range)
    {
        var start = this.offsetFromPosition(range.startLine, range.startColumn);
        var end = this.offsetFromPosition(range.endLine, range.endColumn);
        return new WebInspector.SourceRange(start, end - start);
    },

    /**
     * @param {!WebInspector.TextRange} range
     * @param {string} replacement
     * @return {string}
     */
    replaceRange: function(range, replacement)
    {
        var sourceRange = this.toSourceRange(range);
        return this._value.substring(0, sourceRange.offset) + replacement + this._value.substring(sourceRange.offset + sourceRange.length);
    },

    /**
     * @param {!WebInspector.TextRange} range
     * @return {string}
     */
    extract: function(range)
    {
        var sourceRange = this.toSourceRange(range);
        return this._value.substr(sourceRange.offset, sourceRange.length);
    },
}

/**
 * @constructor
 * @param {!Array<number>} lineEndings
 */
WebInspector.TextCursor = function(lineEndings)
{
    this._lineEndings = lineEndings;
    this._offset = 0;
    this._lineNumber = 0;
    this._columnNumber = 0;
}

WebInspector.TextCursor.prototype = {
    /**
     * @param {number} offset
     */
    advance: function(offset)
    {
        this._offset = offset;
        while (this._lineNumber < this._lineEndings.length && this._lineEndings[this._lineNumber] < this._offset)
            ++this._lineNumber;
        this._columnNumber = this._lineNumber ? this._offset - this._lineEndings[this._lineNumber - 1] - 1 : this._offset;
    },

    /**
     * @return {number}
     */
    offset: function()
    {
        return this._offset;
    },

    /**
     * @return {number}
     */
    lineNumber: function()
    {
        return this._lineNumber;
    },

    /**
     * @return {number}
     */
    columnNumber: function()
    {
        return this._columnNumber;
    }
}
