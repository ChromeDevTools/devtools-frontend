// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!FormatterWorker.FormattedContentBuilder} builder
 */
FormatterWorker.HTMLFormatter = function(builder)
{
    this._builder = builder;
}

/**
 * @constructor
 * @param {string} tagName
 * @param {number} offset
 */
FormatterWorker.HTMLFormatter.Result = function(tagName, offset)
{
    this.tagName = tagName;
    this.offset = offset;
}

FormatterWorker.HTMLFormatter.prototype = {
    /**
     * @param {string} text
     * @param {!Array<number>} lineEndings
     * @param {number} fromOffset
     * @return {!FormatterWorker.HTMLFormatter.Result}
     */
    format: function(text, lineEndings, fromOffset)
    {
        var content = text.substring(fromOffset);
        var tagName = "";
        var accumulatedTokenValue = "";
        var lastOffset = fromOffset;

        /**
         * @param {string} tokenValue
         * @param {?string} type
         * @param {number} tokenStart
         * @param {number} tokenEnd
         * @return {(!Object|undefined)}
         * @this {FormatterWorker.HTMLFormatter}
         */
        function processToken(tokenValue, type, tokenStart, tokenEnd)
        {
            tokenStart += fromOffset;
            tokenEnd += fromOffset;
            lastOffset = tokenEnd;
            var startLine = lineEndings.lowerBound(tokenStart);
            var endLine = lineEndings.lowerBound(tokenEnd);
            this._builder.addToken(tokenValue, tokenStart, startLine, endLine);

            if (!type)
                return;
            var tokenType = type.split(" ").keySet();
            if (!tokenType["tag"])
                return;

            if (tokenType["bracket"] && (tokenValue === "<" || tokenValue === "</")) {
                accumulatedTokenValue = tokenValue;
                return;
            }

            if (tagName && tokenValue === ">")
                return FormatterWorker.AbortTokenization;

            accumulatedTokenValue = accumulatedTokenValue + tokenValue.toLowerCase();
            if (accumulatedTokenValue === "<script" || accumulatedTokenValue === "<style")
                tagName = accumulatedTokenValue.substring(1);
            accumulatedTokenValue = "";
        }
        var tokenizer = FormatterWorker.createTokenizer("text/html");
        tokenizer(content, processToken.bind(this));
        return new FormatterWorker.HTMLFormatter.Result(tagName, lastOffset);
    },
}
