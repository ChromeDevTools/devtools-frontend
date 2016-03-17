// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.CSSStyleDeclaration} ownerStyle
 * @param {number} index
 * @param {string} name
 * @param {string} value
 * @param {boolean} important
 * @param {boolean} disabled
 * @param {boolean} parsedOk
 * @param {boolean} implicit
 * @param {?string=} text
 * @param {!CSSAgent.SourceRange=} range
 */
WebInspector.CSSProperty = function(ownerStyle, index, name, value, important, disabled, parsedOk, implicit, text, range)
{
    this.ownerStyle = ownerStyle;
    this.index = index;
    this.name = name;
    this.value = value;
    this.important = important;
    this.disabled = disabled;
    this.parsedOk = parsedOk;
    this.implicit = implicit; // A longhand, implicitly set by missing values of shorthand.
    this.text = text;
    this.range = range ? WebInspector.TextRange.fromObject(range) : null;
    this._active = true;
}

/**
 * @param {!WebInspector.CSSStyleDeclaration} ownerStyle
 * @param {number} index
 * @param {!CSSAgent.CSSProperty} payload
 * @return {!WebInspector.CSSProperty}
 */
WebInspector.CSSProperty.parsePayload = function(ownerStyle, index, payload)
{
    // The following default field values are used in the payload:
    // important: false
    // parsedOk: true
    // implicit: false
    // disabled: false
    var result = new WebInspector.CSSProperty(
        ownerStyle, index, payload.name, payload.value, payload.important || false, payload.disabled || false, ("parsedOk" in payload) ? !!payload.parsedOk : true, !!payload.implicit, payload.text, payload.range);
    return result;
}

WebInspector.CSSProperty.prototype = {
    /**
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (this.ownerStyle.styleSheetId !== edit.styleSheetId)
            return;
        if (this.range)
            this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    },

    /**
     * @param {boolean} active
     */
    _setActive: function(active)
    {
        this._active = active;
    },

    get propertyText()
    {
        if (this.text !== undefined)
            return this.text;

        if (this.name === "")
            return "";
        return this.name + ": " + this.value + (this.important ? " !important" : "") + ";";
    },

    /**
     * @return {boolean}
     */
    activeInStyle: function()
    {
        return this._active;
    },

    /**
     * @param {string} propertyText
     * @param {boolean} majorChange
     * @param {boolean} overwrite
     * @return {!Promise.<boolean>}
     */
    setText: function(propertyText, majorChange, overwrite)
    {
        if (!this.ownerStyle)
            return Promise.reject(new Error("No ownerStyle for property"));

        if (!this.ownerStyle.styleSheetId)
            return Promise.reject(new Error("No owner style id"));

        if (!this.range || !this.ownerStyle.range)
            return Promise.reject(new Error("Style not editable"));

        if (majorChange)
            WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);

        if (overwrite && propertyText === this.propertyText) {
            if (majorChange)
                this.ownerStyle.cssModel().domModel().markUndoableState();
            return Promise.resolve(true);
        }

        var range = this.range.relativeTo(this.ownerStyle.range.startLine, this.ownerStyle.range.startColumn);
        var indentation = this.ownerStyle.cssText ? this._detectIndentation(this.ownerStyle.cssText) : WebInspector.moduleSetting("textEditorIndent").get();
        var endIndentation = this.ownerStyle.cssText ? indentation.substring(0, this.ownerStyle.range.endColumn) : "";
        var text = new WebInspector.Text(this.ownerStyle.cssText || "");
        var newStyleText = text.replaceRange(range, String.sprintf(";%s;", propertyText));

        return self.runtime.instancePromise(WebInspector.TokenizerFactory)
            .then(this._formatStyle.bind(this, newStyleText, indentation, endIndentation))
            .then(setStyleText.bind(this));

        /**
         * @param {string} styleText
         * @this {WebInspector.CSSProperty}
         * @return {!Promise.<boolean>}
         */
        function setStyleText(styleText)
        {
            return this.ownerStyle.setText(styleText, majorChange);
        }
    },

    /**
     * @param {string} styleText
     * @param {string} indentation
     * @param {string} endIndentation
     * @param {!WebInspector.TokenizerFactory} tokenizerFactory
     * @return {string}
     */
    _formatStyle: function(styleText, indentation, endIndentation, tokenizerFactory)
    {
        if (indentation)
            indentation = "\n" + indentation;
        var result = "";
        var propertyText;
        var insideProperty = false;
        var tokenize = tokenizerFactory.createTokenizer("text/css");

        tokenize("*{" + styleText + "}", processToken);
        if (insideProperty)
            result += propertyText;
        result = result.substring(2, result.length - 1).trimRight();
        return result + (indentation ? "\n" + endIndentation : "");

        /**
         * @param {string} token
         * @param {?string} tokenType
         * @param {number} column
         * @param {number} newColumn
         */
        function processToken(token, tokenType, column, newColumn)
        {
            if (!insideProperty) {
                var disabledProperty = tokenType && tokenType.includes("css-comment") && isDisabledProperty(token);
                var isPropertyStart = tokenType && (tokenType.includes("css-string") || tokenType.includes("css-meta") || tokenType.includes("css-property") || tokenType.includes("css-variable-2"));
                if (disabledProperty) {
                    result = result.trimRight() + indentation + token;
                } else if (isPropertyStart) {
                    insideProperty = true;
                    propertyText = token;
                } else if (token !== ";") {
                    result += token;
                }
                return;
            }

            if (token === "}" || token === ";") {
                result = result.trimRight() + indentation + propertyText.trim() + ";";
                insideProperty = false;
                if (token === "}")
                    result += "}";
            } else {
                propertyText += token;
            }
        }

        /**
         * @param {string} text
         * @return {boolean}
         */
        function isDisabledProperty(text)
        {
            var colon = text.indexOf(":");
            if (colon === -1)
                return false;
            var propertyName = text.substring(2, colon).trim();
            return WebInspector.CSSMetadata.isCSSPropertyName(propertyName);
        }
    },

    /**
     * @param {string} text
     * @return {string}
     */
    _detectIndentation: function(text)
    {
        var lines = text.split("\n");
        if (lines.length < 2)
            return "";
        return WebInspector.TextUtils.lineIndent(lines[1]);
    },

    /**
     * @param {string} newValue
     * @param {boolean} majorChange
     * @param {boolean} overwrite
     * @param {function(boolean)=} userCallback
     */
    setValue: function(newValue, majorChange, overwrite, userCallback)
    {
        var text = this.name + ": " + newValue + (this.important ? " !important" : "") + ";";
        this.setText(text, majorChange, overwrite).then(userCallback);
    },

    /**
     * @param {boolean} disabled
     * @return {!Promise.<boolean>}
     */
    setDisabled: function(disabled)
    {
        if (!this.ownerStyle)
            return Promise.resolve(false);
        if (disabled === this.disabled)
            return Promise.resolve(true);
        var propertyText = this.text.trim();
        var text = disabled ? "/* " + propertyText + " */" : this.text.substring(2, propertyText.length - 2).trim();
        return this.setText(text, true, true);
    }
}
