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
 * @param {string} content
 * @param {!FormatterWorker.FormattedContentBuilder} builder
 */
FormatterWorker.CSSFormatter = function(content, builder)
{
    this._content = content;
    this._lineEndings = this._content.computeLineEndings();
    this._builder = builder;
    this._lastLine = -1;
    this._state = {};
}

FormatterWorker.CSSFormatter.prototype = {
    format: function()
    {
        var tokenize = FormatterWorker.createTokenizer("text/css");
        tokenize(this._content, this._tokenCallback.bind(this));
    },

    /**
     * @param {string} token
     * @param {?string} type
     * @param {number} startPosition
     * @param {number} endPosition
     */
    _tokenCallback: function(token, type, startPosition, endPosition)
    {
        var startLine = this._lineEndings.lowerBound(startPosition);
        var endLine = this._lineEndings.lowerBound(endPosition);
        if (startLine !== this._lastLine)
            this._state.eatWhitespace = true;
        if (/^property/.test(type) && !this._state.inPropertyValue)
            this._state.seenProperty = true;
        this._lastLine = startLine;
        var isWhitespace = /^\s+$/.test(token);
        if (isWhitespace) {
            if (!this._state.eatWhitespace)
                this._builder.addSoftSpace();
            return;
        }
        this._state.eatWhitespace = false;
        if (token === "\n")
            return;

        if (token !== "}") {
            if (this._state.afterClosingBrace)
                this._builder.addNewLine(true);
            this._state.afterClosingBrace = false;
        }
        if (token === "}") {
            if (this._state.inPropertyValue)
                this._builder.addNewLine();
            this._builder.decreaseNestingLevel();
            this._state.afterClosingBrace = true;
            this._state.inPropertyValue = false;
        } else if (token === ":" && !this._state.inPropertyValue && this._state.seenProperty) {
            this._builder.addToken(token, startPosition, startLine, endLine);
            this._builder.addSoftSpace();
            this._state.eatWhitespace = true;
            this._state.inPropertyValue = true;
            this._state.seenProperty = false;
            return;
        } else if (token === "{") {
            this._builder.addSoftSpace();
            this._builder.addToken(token, startPosition, startLine, endLine);
            this._builder.addNewLine();
            this._builder.increaseNestingLevel();
            return;
        }

        this._builder.addToken(token, startPosition, startLine, endLine);

        if (type === "comment" && !this._state.inPropertyValue && !this._state.seenProperty)
            this._builder.addNewLine();
        if (token === ";" && this._state.inPropertyValue) {
            this._state.inPropertyValue = false;
            this._builder.addNewLine();
        } else if (token === "}") {
            this._builder.addNewLine();
        }
    }
}
