// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.FormattedContentBuilder} builder
 */
WebInspector.HTMLFormatter = function(builder)
{
    this._builder = builder;
}

/**
 * @constructor
 * @param {string} tagName
 * @param {number} offset
 */
WebInspector.HTMLFormatter.Result = function(tagName, offset)
{
    this.tagName = tagName;
    this.offset = offset;
}

WebInspector.HTMLFormatter.prototype = {
    /**
     * @param {string} text
     * @param {!Array<number>} lineEndings
     * @param {number} fromOffset
     * @return {!WebInspector.HTMLFormatter.Result}
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
         * @this {WebInspector.HTMLFormatter}
         */
        function processToken(tokenValue, type, tokenStart, tokenEnd)
        {
            tokenStart += fromOffset;
            tokenEnd += fromOffset;
            lastOffset = tokenEnd;
            this._builder.addToken(tokenValue, tokenStart);

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
                return WebInspector.AbortTokenization;

            accumulatedTokenValue = accumulatedTokenValue + tokenValue.toLowerCase();
            if (accumulatedTokenValue === "<script" || accumulatedTokenValue === "<style")
                tagName = accumulatedTokenValue.substring(1);
            accumulatedTokenValue = "";
        }
        var tokenizer = WebInspector.createTokenizer("text/html");
        tokenizer(content, processToken.bind(this));
        return new WebInspector.HTMLFormatter.Result(tagName, lastOffset);
    },
}
