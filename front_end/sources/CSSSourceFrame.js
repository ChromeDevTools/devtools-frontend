/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.UISourceCodeFrame}
 * @param {!WebInspector.UISourceCode} uiSourceCode
 */
WebInspector.CSSSourceFrame = function(uiSourceCode)
{
    WebInspector.UISourceCodeFrame.call(this, uiSourceCode);
    this.textEditor.setAutocompleteDelegate(new WebInspector.CSSSourceFrame.AutocompleteDelegate());
    this._registerShortcuts();
    this._colorBookmarks = [];
    this._swatchPopoverHelper = new WebInspector.SwatchPopoverHelper();
    this._muteColorProcessing = false;
}

/** @type {number} */
WebInspector.CSSSourceFrame.UpdateTimeout = 200;

WebInspector.CSSSourceFrame.prototype = {
    _registerShortcuts: function()
    {
        var shortcutKeys = WebInspector.ShortcutsScreen.SourcesPanelShortcuts;
        for (var i = 0; i < shortcutKeys.IncreaseCSSUnitByOne.length; ++i)
            this.addShortcut(shortcutKeys.IncreaseCSSUnitByOne[i].key, this._handleUnitModification.bind(this, 1));
        for (var i = 0; i < shortcutKeys.DecreaseCSSUnitByOne.length; ++i)
            this.addShortcut(shortcutKeys.DecreaseCSSUnitByOne[i].key, this._handleUnitModification.bind(this, -1));
        for (var i = 0; i < shortcutKeys.IncreaseCSSUnitByTen.length; ++i)
            this.addShortcut(shortcutKeys.IncreaseCSSUnitByTen[i].key, this._handleUnitModification.bind(this, 10));
        for (var i = 0; i < shortcutKeys.DecreaseCSSUnitByTen.length; ++i)
            this.addShortcut(shortcutKeys.DecreaseCSSUnitByTen[i].key, this._handleUnitModification.bind(this, -10));
    },

    /**
     * @param {string} unit
     * @param {number} change
     * @return {?string}
     */
    _modifyUnit: function(unit, change)
    {
        var unitValue = parseInt(unit, 10);
        if (isNaN(unitValue))
            return null;
        var tail = unit.substring((unitValue).toString().length);
        return String.sprintf("%d%s", unitValue + change, tail);
    },

    /**
     * @param {number} change
     * @return {boolean}
     */
    _handleUnitModification: function(change)
    {
        var selection = this.textEditor.selection().normalize();
        var token = this.textEditor.tokenAtTextPosition(selection.startLine, selection.startColumn);
        if (!token) {
            if (selection.startColumn > 0)
                token = this.textEditor.tokenAtTextPosition(selection.startLine, selection.startColumn - 1);
            if (!token)
                return false;
        }
        if (token.type !== "css-number")
            return false;

        var cssUnitRange = new WebInspector.TextRange(selection.startLine, token.startColumn, selection.startLine, token.endColumn);
        var cssUnitText = this.textEditor.copyRange(cssUnitRange);
        var newUnitText = this._modifyUnit(cssUnitText, change);
        if (!newUnitText)
            return false;
        this.textEditor.editRange(cssUnitRange, newUnitText);
        selection.startColumn = token.startColumn;
        selection.endColumn = selection.startColumn + newUnitText.length;
        this.textEditor.setSelection(selection);
        return true;
    },

    _updateColorSwatches: function()
    {
        if (this._updateTimeout)
            clearTimeout(this._updateTimeout);
        this._updateTimeout = null;

        var colorPositions = this._extractColorPositions(this.textEditor.text());
        this.textEditor.operation(this._putColorSwatchesInline.bind(this, colorPositions));
    },

    /**
     * @param {string} content
     * @return {?Array<!WebInspector.CSSSourceFrame.ColorPosition>}
     */
    _extractColorPositions: function(content)
    {
        if (!content)
            return null;

        var colorPositions = [];
        var text = new WebInspector.Text(content);
        var numberOfLines = text.lineCount();
        var colorRegex = /[\s:;,(){}]((?:rgb|hsl)a?\([^)]+\)|#[0-9a-f]{8}|#[0-9a-f]{6}|#[0-9a-f]{3,4}|[a-z]+)(?=[\s;,(){}])/gi;
        for (var lineNumber = 0; lineNumber < numberOfLines; lineNumber++) {
            var line = text.lineAt(lineNumber) + "\n";
            var match;
            while ((match = colorRegex.exec(line)) !== null) {
                if (match.length < 2)
                    continue;

                var colorText = match[1];
                var color = WebInspector.Color.parse(colorText);
                if (color)
                    colorPositions.push(new WebInspector.CSSSourceFrame.ColorPosition(color, lineNumber, match.index + 1, colorText.length));
            }
        }

        return colorPositions;
    },

    /**
     * @param {?Array<!WebInspector.CSSSourceFrame.ColorPosition>} colorPositions
     */
    _putColorSwatchesInline: function(colorPositions)
    {
        this._clearColorBookmarks();
        if (!colorPositions)
            return;

        for (var i = 0; i < colorPositions.length; i++) {
            var colorPosition = colorPositions[i];

            var swatch = WebInspector.ColorSwatch.create();
            swatch.setColorText(colorPosition.color.asString(WebInspector.Color.Format.Original));
            swatch.iconElement().title = WebInspector.UIString("Open color picker.");
            swatch.iconElement().addEventListener("click", this._showSpectrum.bind(this, swatch, colorPosition), true);
            swatch.hideText(true);

            var bookmark = this.textEditor.addBookmark(colorPosition.textRange.startLine, colorPosition.textRange.startColumn, swatch);
            this._colorBookmarks.push(bookmark);
        }
    },

    _clearColorBookmarks: function()
    {
        for (var i = 0; i < this._colorBookmarks.length; i++)
            this._colorBookmarks[i].clear();
        this._colorBookmarks = [];
    },

    /**
     * @param {!WebInspector.ColorSwatch} swatch
     * @param {!WebInspector.CSSSourceFrame.ColorPosition} colorPosition
     * @param {!Event} event
     */
    _showSpectrum: function(swatch, colorPosition, event)
    {
        event.consume(true);
        if (this._swatchPopoverHelper.isShowing()) {
            this._swatchPopoverHelper.hide(true);
            return;
        }
        this._hadSpectrumChange = false;
        this._currentSwatch = swatch;
        this._currentColorPosition = colorPosition;
        this.textEditor.setSelection(WebInspector.TextRange.createFromLocation(colorPosition.textRange.startLine, colorPosition.textRange.startColumn));
        this._spectrum = new WebInspector.Spectrum();
        this._spectrum.setColor(swatch.color(), swatch.format());
        this._spectrum.addEventListener(WebInspector.Spectrum.Events.SizeChanged, this._spectrumResized, this);
        this._spectrum.addEventListener(WebInspector.Spectrum.Events.ColorChanged, this._spectrumChanged, this);
        this._swatchPopoverHelper.show(this._spectrum, swatch.iconElement(), this._spectrumHidden.bind(this));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _spectrumResized: function(event)
    {
        this._swatchPopoverHelper.reposition();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _spectrumChanged: function(event)
    {
        this._muteColorProcessing = true;
        this._hadSpectrumChange = true;
        var colorString = /** @type {string} */ (event.data);
        this._currentSwatch.setColorText(colorString);
        this.textEditor.editRange(this._currentColorPosition.textRange, colorString, "*color-text-changed");
        this._currentColorPosition.color = WebInspector.Color.parse(colorString);
        this._currentColorPosition.textRange.endColumn = this._currentColorPosition.textRange.startColumn + colorString.length;
    },

    /**
     * @param {boolean} commitEdit
     */
    _spectrumHidden: function(commitEdit)
    {
        this._spectrum.removeEventListener(WebInspector.Spectrum.Events.SizeChanged, this._spectrumResized, this);
        this._spectrum.removeEventListener(WebInspector.Spectrum.Events.ColorChanged, this._spectrumChanged, this);
        if (!commitEdit && this._hadSpectrumChange)
            this.textEditor.undo();
        delete this._spectrum;
        delete this._currentSwatch;
        delete this._currentColorPosition;
        this._muteColorProcessing = false;
        this._updateColorSwatches();
    },

    /**
     * @override
     */
    onTextEditorContentSet: function()
    {
        WebInspector.UISourceCodeFrame.prototype.onTextEditorContentSet.call(this);
        if (!this._muteColorProcessing && Runtime.experiments.isEnabled("sourceColorPicker"))
            this._updateColorSwatches();
    },

    /**
     * @override
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    onTextChanged: function(oldRange, newRange)
    {
        WebInspector.UISourceCodeFrame.prototype.onTextChanged.call(this, oldRange, newRange);
        if (!this._muteColorProcessing && Runtime.experiments.isEnabled("sourceColorPicker")) {
            if (this._updateTimeout)
                clearTimeout(this._updateTimeout);
            this._updateTimeout = setTimeout(this._updateColorSwatches.bind(this), WebInspector.CSSSourceFrame.UpdateTimeout);
        }
    },

    /**
     * @override
     * @param {number} lineNumber
     */
    scrollChanged: function(lineNumber)
    {
        WebInspector.UISourceCodeFrame.prototype.scrollChanged.call(this, lineNumber);
        if (this._swatchPopoverHelper.isShowing())
            this._swatchPopoverHelper.hide(true);
    },

    __proto__: WebInspector.UISourceCodeFrame.prototype
}

/**
 * @constructor
 * @param {!WebInspector.Color} color
 * @param {number} lineNumber
 * @param {number} startColumn
 * @param {number} textLength
 */
WebInspector.CSSSourceFrame.ColorPosition = function(color, lineNumber, startColumn, textLength)
{
    this.color = color;
    this.textRange = new WebInspector.TextRange(lineNumber, startColumn, lineNumber, startColumn + textLength);
}

/**
 * @constructor
 * @implements {WebInspector.TextEditorAutocompleteDelegate}
 */
WebInspector.CSSSourceFrame.AutocompleteDelegate = function()
{
    this._simpleDelegate = new WebInspector.SimpleAutocompleteDelegate(".-$");
}

WebInspector.CSSSourceFrame._backtrackDepth = 10;

WebInspector.CSSSourceFrame.AutocompleteDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     */
    initialize: function(editor)
    {
        this._simpleDelegate.initialize(editor);
    },

    /**
     * @override
     */
    dispose: function()
    {
        this._simpleDelegate.dispose();
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
        return this._simpleDelegate.substituteRange(editor, lineNumber, columnNumber);
    },

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?{startColumn: number, endColumn: number, type: string}}
     */
    _backtrackPropertyToken: function(editor, lineNumber, columnNumber)
    {
        var tokenPosition = columnNumber;
        var line = editor.line(lineNumber);
        var seenColumn = false;

        for (var i = 0; i < WebInspector.CSSSourceFrame._backtrackDepth && tokenPosition >= 0; ++i) {
            var token = editor.tokenAtTextPosition(lineNumber, tokenPosition);
            if (!token)
                return null;
            if (token.type === "css-property")
                return seenColumn ? token : null;
            if (token.type && !(token.type.indexOf("whitespace") !== -1 || token.type.startsWith("css-comment")))
                return null;

            if (!token.type && line.substring(token.startColumn, token.endColumn) === ":") {
                if (!seenColumn)
                    seenColumn = true;
                else
                    return null;
            }
            tokenPosition = token.startColumn - 1;
        }
        return null;
    },

    /**
     * @override
     * @param {!WebInspector.CodeMirrorTextEditor} editor
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {!Array.<string>}
     */
    wordsWithPrefix: function(editor, prefixRange, substituteRange)
    {
        var prefix = editor.copyRange(prefixRange);
        if (prefix.startsWith("$"))
            return this._simpleDelegate.wordsWithPrefix(editor, prefixRange, substituteRange);
        var propertyToken = this._backtrackPropertyToken(editor, prefixRange.startLine, prefixRange.startColumn - 1);
        if (!propertyToken)
            return this._simpleDelegate.wordsWithPrefix(editor, prefixRange, substituteRange);

        var line = editor.line(prefixRange.startLine);
        var tokenContent = line.substring(propertyToken.startColumn, propertyToken.endColumn);
        var keywords = WebInspector.CSSMetadata.keywordsForProperty(tokenContent);
        return keywords.startsWith(prefix);
    },
}
