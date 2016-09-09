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
    this._registerShortcuts();
    this._swatchPopoverHelper = new WebInspector.SwatchPopoverHelper();
    this._muteSwatchProcessing = false;
    this.configureAutocomplete({
        suggestionsCallback: this._cssSuggestions.bind(this),
        isWordChar: this._isWordChar.bind(this)
    });
}

/** @type {number} */
WebInspector.CSSSourceFrame.maxSwatchProcessingLength = 300;
/** @type {symbol} */
WebInspector.CSSSourceFrame.SwatchBookmark = Symbol("swatch");

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
        var cssUnitText = this.textEditor.text(cssUnitRange);
        var newUnitText = this._modifyUnit(cssUnitText, change);
        if (!newUnitText)
            return false;
        this.textEditor.editRange(cssUnitRange, newUnitText);
        selection.startColumn = token.startColumn;
        selection.endColumn = selection.startColumn + newUnitText.length;
        this.textEditor.setSelection(selection);
        return true;
    },

    /**
     * @param {number} startLine
     * @param {number} endLine
     */
    _updateSwatches: function(startLine, endLine)
    {
        var swatches = [];
        var swatchPositions = [];

        var regexes = [WebInspector.CSSMetadata.VariableRegex, WebInspector.CSSMetadata.URLRegex, WebInspector.Geometry.CubicBezier.Regex, WebInspector.Color.Regex];
        var handlers = new Map();
        handlers.set(WebInspector.Color.Regex, this._createColorSwatch.bind(this));
        handlers.set(WebInspector.Geometry.CubicBezier.Regex, this._createBezierSwatch.bind(this));

        for (var lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            var line = this.textEditor.line(lineNumber).substring(0, WebInspector.CSSSourceFrame.maxSwatchProcessingLength);
            var results = WebInspector.TextUtils.splitStringByRegexes(line, regexes);
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                if (result.regexIndex === -1 || !handlers.has(regexes[result.regexIndex]))
                    continue;
                var delimiters = /[\s:;,(){}]/;
                var positionBefore = result.position - 1;
                var positionAfter = result.position + result.value.length;
                if (positionBefore >= 0 && !delimiters.test(line.charAt(positionBefore))
                    || positionAfter < line.length && !delimiters.test(line.charAt(positionAfter)))
                    continue;
                var swatch = handlers.get(regexes[result.regexIndex])(result.value);
                if (!swatch)
                    continue;
                swatches.push(swatch);
                swatchPositions.push(WebInspector.TextRange.createFromLocation(lineNumber, result.position));
            }
        }
        this.textEditor.operation(putSwatchesInline.bind(this));

        /**
         * @this {WebInspector.CSSSourceFrame}
         */
        function putSwatchesInline()
        {
            var clearRange = new WebInspector.TextRange(startLine, 0, endLine, this.textEditor.line(endLine).length);
            this.textEditor.bookmarks(clearRange, WebInspector.CSSSourceFrame.SwatchBookmark).forEach(marker => marker.clear());

            for (var i = 0; i < swatches.length; i++) {
                var swatch = swatches[i];
                var swatchPosition = swatchPositions[i];
                var bookmark = this.textEditor.addBookmark(swatchPosition.startLine, swatchPosition.startColumn, swatch, WebInspector.CSSSourceFrame.SwatchBookmark);
                swatch[WebInspector.CSSSourceFrame.SwatchBookmark] = bookmark;
            }
        }
    },

    /**
     * @param {string} text
     * @return {?WebInspector.ColorSwatch}
     */
    _createColorSwatch: function(text)
    {
        var color = WebInspector.Color.parse(text);
        if (!color)
            return null;
        var swatch = WebInspector.ColorSwatch.create();
        swatch.setColor(color);
        swatch.iconElement().title = WebInspector.UIString("Open color picker.");
        swatch.iconElement().addEventListener("click", this._swatchIconClicked.bind(this, swatch), false);
        swatch.hideText(true);
        return swatch;
    },

    /**
     * @param {string} text
     * @return {?WebInspector.BezierSwatch}
     */
    _createBezierSwatch: function(text)
    {
        if (!WebInspector.Geometry.CubicBezier.parse(text))
            return null;
        var swatch = WebInspector.BezierSwatch.create();
        swatch.setBezierText(text);
        swatch.iconElement().title = WebInspector.UIString("Open cubic bezier editor.");
        swatch.iconElement().addEventListener("click", this._swatchIconClicked.bind(this, swatch), false);
        swatch.hideText(true);
        return swatch;
    },

    /**
     * @param {!Element} swatch
     * @param {!Event} event
     */
    _swatchIconClicked: function(swatch, event)
    {
        event.consume(true);
        this._hadSwatchChange = false;
        this._muteSwatchProcessing = true;
        var swatchPosition = swatch[WebInspector.CSSSourceFrame.SwatchBookmark].position();
        this.textEditor.setSelection(swatchPosition);
        this._editedSwatchTextRange = swatchPosition.clone();
        this._editedSwatchTextRange.endColumn += swatch.textContent.length;
        this._currentSwatch = swatch;

        if (swatch instanceof WebInspector.ColorSwatch)
            this._showSpectrum(swatch);
        else if (swatch instanceof WebInspector.BezierSwatch)
            this._showBezierEditor(swatch);
    },

    /**
     * @param {!WebInspector.ColorSwatch} swatch
     */
    _showSpectrum: function(swatch)
    {
        if (!this._spectrum) {
            this._spectrum = new WebInspector.Spectrum();
            this._spectrum.addEventListener(WebInspector.Spectrum.Events.SizeChanged, this._spectrumResized, this);
            this._spectrum.addEventListener(WebInspector.Spectrum.Events.ColorChanged, this._spectrumChanged, this);
        }
        this._spectrum.setColor(swatch.color(), swatch.format());
        this._swatchPopoverHelper.show(this._spectrum, swatch.iconElement(), this._swatchPopoverHidden.bind(this));
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
        var colorString = /** @type {string} */ (event.data);
        var color = WebInspector.Color.parse(colorString);
        if (!color)
            return;
        this._currentSwatch.setColor(color);
        this._changeSwatchText(colorString);
    },

    /**
     * @param {!WebInspector.BezierSwatch} swatch
     */
    _showBezierEditor: function(swatch)
    {
        if (!this._bezierEditor) {
            this._bezierEditor = new WebInspector.BezierEditor();
            this._bezierEditor.addEventListener(WebInspector.BezierEditor.Events.BezierChanged, this._bezierChanged, this);
        }
        var cubicBezier = WebInspector.Geometry.CubicBezier.parse(swatch.bezierText());
        if (!cubicBezier)
            cubicBezier = /** @type {!WebInspector.Geometry.CubicBezier} */ (WebInspector.Geometry.CubicBezier.parse("linear"));
        this._bezierEditor.setBezier(cubicBezier);
        this._swatchPopoverHelper.show(this._bezierEditor, swatch.iconElement(), this._swatchPopoverHidden.bind(this));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _bezierChanged: function(event)
    {
        var bezierString = /** @type {string} */ (event.data);
        this._currentSwatch.setBezierText(bezierString);
        this._changeSwatchText(bezierString);
    },

    /**
     * @param {string} text
     */
    _changeSwatchText: function(text)
    {
        this._hadSwatchChange = true;
        this._textEditor.editRange(this._editedSwatchTextRange, text, "*swatch-text-changed");
        this._editedSwatchTextRange.endColumn = this._editedSwatchTextRange.startColumn + text.length;
    },

    /**
     * @param {boolean} commitEdit
     */
    _swatchPopoverHidden: function(commitEdit)
    {
        this._muteSwatchProcessing = false;
        if (!commitEdit && this._hadSwatchChange)
            this.textEditor.undo();
    },

    /**
     * @override
     */
    onTextEditorContentSet: function()
    {
        WebInspector.UISourceCodeFrame.prototype.onTextEditorContentSet.call(this);
        if (!this._muteSwatchProcessing)
            this._updateSwatches(0, this.textEditor.linesCount - 1);
    },

    /**
     * @override
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    onTextChanged: function(oldRange, newRange)
    {
        WebInspector.UISourceCodeFrame.prototype.onTextChanged.call(this, oldRange, newRange);
        if (!this._muteSwatchProcessing)
            this._updateSwatches(newRange.startLine, newRange.endLine);
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

    /**
     * @param {string} char
     * @return {boolean}
     */
    _isWordChar: function(char)
    {
        return WebInspector.TextUtils.isWordChar(char) || char === "." || char === "-" || char === "$";
    },

    /**
     * @param {!WebInspector.TextRange} prefixRange
     * @param {!WebInspector.TextRange} substituteRange
     * @return {?Promise.<!WebInspector.SuggestBox.Suggestions>}
     */
    _cssSuggestions: function(prefixRange, substituteRange)
    {
        var prefix = this._textEditor.text(prefixRange);
        if (prefix.startsWith("$"))
            return null;

        var propertyToken = this._backtrackPropertyToken(prefixRange.startLine, prefixRange.startColumn - 1);
        if (!propertyToken)
            return null;

        var line = this._textEditor.line(prefixRange.startLine);
        var tokenContent = line.substring(propertyToken.startColumn, propertyToken.endColumn);
        var propertyValues = WebInspector.cssMetadata().propertyValues(tokenContent);
        return Promise.resolve(propertyValues.filter(value => value.startsWith(prefix)).map(value => ({title: value})));
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?{startColumn: number, endColumn: number, type: string}}
     */
    _backtrackPropertyToken: function(lineNumber, columnNumber)
    {
        var backtrackDepth = 10;
        var tokenPosition = columnNumber;
        var line = this._textEditor.line(lineNumber);
        var seenColon = false;

        for (var i = 0; i < backtrackDepth && tokenPosition >= 0; ++i) {
            var token = this._textEditor.tokenAtTextPosition(lineNumber, tokenPosition);
            if (!token)
                return null;
            if (token.type === "css-property")
                return seenColon ? token : null;
            if (token.type && !(token.type.indexOf("whitespace") !== -1 || token.type.startsWith("css-comment")))
                return null;

            if (!token.type && line.substring(token.startColumn, token.endColumn) === ":") {
                if (!seenColon)
                    seenColon = true;
                else
                    return null;
            }
            tokenPosition = token.startColumn - 1;
        }
        return null;
    },

    __proto__: WebInspector.UISourceCodeFrame.prototype
}
