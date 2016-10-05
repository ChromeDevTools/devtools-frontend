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
    this._jsFormatter = new WebInspector.JavaScriptFormatter(builder);
    this._cssFormatter = new WebInspector.CSSFormatter(builder);
};

WebInspector.HTMLFormatter.SupportedJavaScriptMimeTypes = new Set([
    "text/javascript",
    "text/ecmascript",
    "application/javascript",
    "application/ecmascript"
]);

WebInspector.HTMLFormatter.prototype = {
    /**
     * @param {string} text
     * @param {!Array<number>} lineEndings
     */
    format: function(text, lineEndings)
    {
        this._text = text;
        this._lineEndings = lineEndings;
        this._model = new WebInspector.HTMLModel(text);
        this._walk(this._model.document());
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     * @param {number} offset
     */
    _formatTokensTill: function(element, offset)
    {
        while (this._model.peekToken() && this._model.peekToken().startOffset < offset) {
            var token = this._model.nextToken();
            this._formatToken(element, token);
        }
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     */
    _walk: function(element)
    {
        if (element.parent)
            this._formatTokensTill(element.parent, element.openTag.startOffset);
        this._beforeOpenTag(element);
        this._formatTokensTill(element, element.openTag.endOffset);
        this._afterOpenTag(element);
        for (var i = 0; i < element.children.length; ++i)
            this._walk(element.children[i]);

        this._formatTokensTill(element, element.closeTag.startOffset);
        this._beforeCloseTag(element);
        this._formatTokensTill(element, element.closeTag.endOffset);
        this._afterCloseTag(element);
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     */
    _beforeOpenTag: function(element)
    {
        if (!element.children.length || element === this._model.document())
            return;
        this._builder.addNewLine();
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     */
    _afterOpenTag: function(element)
    {
        if (!element.children.length || element === this._model.document())
            return;
        this._builder.increaseNestingLevel();
        this._builder.addNewLine();
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     */
    _beforeCloseTag: function(element)
    {
        if (!element.children.length || element === this._model.document())
            return;
        this._builder.decreaseNestingLevel();
        this._builder.addNewLine();
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     */
    _afterCloseTag: function(element)
    {
        this._builder.addNewLine();
    },

    /**
     * @param {!WebInspector.HTMLModel.Element} element
     * @param {!WebInspector.HTMLModel.Token} token
     */
    _formatToken: function(element, token)
    {
        if (token.value.isWhitespace())
            return;
        if (token.type.has("comment") || token.type.has("meta")) {
            this._builder.addNewLine();
            this._builder.addToken(token.value.trim(), token.startOffset);
            this._builder.addNewLine();
            return;
        }

        var isBodyToken = element.openTag.endOffset <= token.startOffset && token.startOffset < element.closeTag.startOffset;
        if (isBodyToken && element.name === "style") {
            this._builder.addNewLine();
            this._builder.increaseNestingLevel();
            this._cssFormatter.format(this._text, this._lineEndings, token.startOffset, token.endOffset);
            this._builder.decreaseNestingLevel();
            return;
        }
        if (isBodyToken && element.name === "script") {
            this._builder.addNewLine();
            this._builder.increaseNestingLevel();
            var mimeType = element.openTag.attributes.has("type") ? element.openTag.attributes.get("type").toLowerCase() : null;
            if (!mimeType || WebInspector.HTMLFormatter.SupportedJavaScriptMimeTypes.has(mimeType)) {
                this._jsFormatter.format(this._text, this._lineEndings, token.startOffset, token.endOffset);
            } else {
                this._builder.addToken(token.value, token.startOffset);
                this._builder.addNewLine();
            }
            this._builder.decreaseNestingLevel();
            return;
        }

        if (!isBodyToken && token.type.has("attribute"))
            this._builder.addSoftSpace();

        this._builder.addToken(token.value, token.startOffset);
    }
};

/**
 * @constructor
 * @param {string} text
 */
WebInspector.HTMLModel = function(text)
{
    this._state = WebInspector.HTMLModel.ParseState.Initial;
    this._document = new WebInspector.HTMLModel.Element("document");
    this._document.openTag = new WebInspector.HTMLModel.Tag("document", 0, 0, new Map(), true, false);
    this._document.closeTag = new WebInspector.HTMLModel.Tag("document", text.length, text.length, new Map(), false, false);

    this._stack = [this._document];

    this._tokens = [];
    this._tokenIndex = 0;
    this._build(text);
};

WebInspector.HTMLModel.SelfClosingTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
]);

// @see https://www.w3.org/TR/html/syntax.html 8.1.2.4 Optional tags
WebInspector.HTMLModel.AutoClosingTags = {
    "head": new Set(["body"]),
    "li": new Set(["li"]),
    "dt": new Set(["dt", "dd"]),
    "dd": new Set(["dt", "dd"]),
    "p": new Set(["address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul"]),
    "rb": new Set(["rb", "rt", "rtc", "rp"]),
    "rt": new Set(["rb", "rt", "rtc", "rp"]),
    "rtc": new Set(["rb", "rtc", "rp"]),
    "rp": new Set(["rb", "rt", "rtc", "rp"]),
    "optgroup": new Set(["optgroup"]),
    "option": new Set(["option", "optgroup"]),
    "colgroup": new Set(["colgroup"]),
    "thead": new Set(["tbody", "tfoot"]),
    "tbody": new Set(["tbody", "tfoot"]),
    "tfoot": new Set(["tbody"]),
    "tr": new Set(["tr"]),
    "td": new Set(["td", "th"]),
    "th": new Set(["td", "th"]),
};

/** @enum {string} */
WebInspector.HTMLModel.ParseState = {
    Initial: "Initial",
    Tag: "Tag",
    AttributeName: "AttributeName",
    AttributeValue: "AttributeValue"
};

WebInspector.HTMLModel.prototype = {
    /**
     * @param {string} text
     */
    _build: function(text)
    {
        var tokenizer = WebInspector.createTokenizer("text/html");
        var lastOffset = 0;
        var lowerCaseText = text.toLowerCase();

        while (true) {
            tokenizer(text.substring(lastOffset), processToken.bind(this, lastOffset));
            if (lastOffset >= text.length)
                break;
            var element = this._stack.peekLast();
            lastOffset = lowerCaseText.indexOf("</" + element.name, lastOffset);
            if (lastOffset === -1)
                lastOffset = text.length;
            var tokenStart = element.openTag.endOffset;
            var tokenEnd = lastOffset;
            var tokenValue = text.substring(tokenStart, tokenEnd);
            this._tokens.push(new WebInspector.HTMLModel.Token(tokenValue, new Set(), tokenStart, tokenEnd));
        }

        while (this._stack.length > 1) {
            var element = this._stack.peekLast();
            this._popElement(new WebInspector.HTMLModel.Tag(element.name, text.length, text.length, new Map(), false, false));
        }

        /**
         * @param {number} baseOffset
         * @param {string} tokenValue
         * @param {?string} type
         * @param {number} tokenStart
         * @param {number} tokenEnd
         * @return {(!Object|undefined)}
         * @this {WebInspector.HTMLModel}
         */
        function processToken(baseOffset, tokenValue, type, tokenStart, tokenEnd)
        {
            tokenStart += baseOffset;
            tokenEnd += baseOffset;
            lastOffset = tokenEnd;

            var tokenType = type ? new Set(type.split(" ")) : new Set();
            var token = new WebInspector.HTMLModel.Token(tokenValue, tokenType, tokenStart, tokenEnd);
            this._tokens.push(token);
            this._updateDOM(token);

            var element = this._stack.peekLast();
            if (element && (element.name === "script" || element.name === "style") && element.openTag.endOffset === lastOffset)
                return WebInspector.AbortTokenization;
        }
    },

    /**
     * @param {!WebInspector.HTMLModel.Token} token
     */
    _updateDOM: function(token)
    {
        var S = WebInspector.HTMLModel.ParseState;
        var value = token.value;
        var type = token.type;
        switch (this._state) {
        case S.Initial:
            if (type.has("bracket") && (value === "<" || value === "</")) {
                this._onStartTag(token);
                this._state = S.Tag;
            }
            return;
        case S.Tag:
            if (type.has("tag") && !type.has("bracket")) {
                this._tagName = value.trim().toLowerCase();
            } else if (type.has("attribute")) {
                this._attributeName = value.trim().toLowerCase();
                this._attributes.set(this._attributeName, "");
                this._state = S.AttributeName;
            } else if (type.has("bracket") && (value === ">" || value === "/>")) {
                this._onEndTag(token);
                this._state = S.Initial;
            }
            return;
        case S.AttributeName:
            if (!type.size && value === "=") {
                this._state = S.AttributeValue;
            } else if (type.has("bracket") && (value === ">" || value === "/>")) {
                this._onEndTag(token);
                this._state = S.Initial;
            }
            return;
        case S.AttributeValue:
            if (type.has("string")) {
                this._attributes.set(this._attributeName, value);
                this._state = S.Tag;
            } else if (type.has("bracket") && (value === ">" || value === "/>")) {
                this._onEndTag(token);
                this._state = S.Initial;
            }
            return;
        }
    },

    /**
     * @param {!WebInspector.HTMLModel.Token} token
     */
    _onStartTag: function(token)
    {
        this._tagName = "";
        this._tagStartOffset = token.startOffset;
        this._tagEndOffset = null;
        this._attributes = new Map();
        this._attributeName = "";
        this._isOpenTag = token.value === "<";
    },

    /**
     * @param {!WebInspector.HTMLModel.Token} token
     */
    _onEndTag: function(token)
    {
        this._tagEndOffset = token.endOffset;
        var selfClosingTag = token.value === "/>" || WebInspector.HTMLModel.SelfClosingTags.has(this._tagName);
        var tag = new WebInspector.HTMLModel.Tag(this._tagName, this._tagStartOffset, this._tagEndOffset, this._attributes, this._isOpenTag, selfClosingTag);
        this._onTagComplete(tag);
    },

    /**
     * @param {!WebInspector.HTMLModel.Tag} tag
     */
    _onTagComplete: function(tag)
    {
        if (tag.isOpenTag) {
            var topElement = this._stack.peekLast();
            if (topElement !== this._document && topElement.openTag.selfClosingTag)
                this._popElement(autocloseTag(topElement, topElement.openTag.endOffset));
            else if ((topElement.name in WebInspector.HTMLModel.AutoClosingTags) && WebInspector.HTMLModel.AutoClosingTags[topElement.name].has(tag.name))
                this._popElement(autocloseTag(topElement, tag.startOffset));
            this._pushElement(tag);
            return;
        }

        while (this._stack.length > 1 && this._stack.peekLast().name !== tag.name)
            this._popElement(autocloseTag(this._stack.peekLast(), tag.startOffset));
        if (this._stack.length === 1)
            return;
        this._popElement(tag);

        /**
         * @param {!WebInspector.HTMLModel.Element} element
         * @param {number} offset
         * @return {!WebInspector.HTMLModel.Tag}
         */
        function autocloseTag(element, offset)
        {
            return new WebInspector.HTMLModel.Tag(element.name, offset, offset, new Map(), false, false);
        }
    },

    /**
     * @param {!WebInspector.HTMLModel.Tag} closeTag
     */
    _popElement: function(closeTag)
    {
        var element = this._stack.pop();
        element.closeTag = closeTag;
    },

    /**
     * @param {!WebInspector.HTMLModel.Tag} openTag
     */
    _pushElement: function(openTag)
    {
        var topElement = this._stack.peekLast();
        var newElement = new WebInspector.HTMLModel.Element(openTag.name);
        newElement.parent = topElement;
        topElement.children.push(newElement);
        newElement.openTag = openTag;
        this._stack.push(newElement);
    },

    /**
     * @return {?WebInspector.HTMLModel.Token}
     */
    peekToken: function()
    {
        return this._tokenIndex < this._tokens.length ? this._tokens[this._tokenIndex] : null;
    },

    /**
     * @return {?WebInspector.HTMLModel.Token}
     */
    nextToken: function()
    {
        return this._tokens[this._tokenIndex++];
    },

    /**
     * @return {!WebInspector.HTMLModel.Element}
     */
    document: function()
    {
        return this._document;
    }
};

/**
 * @constructor
 * @param {string} value
 * @param {!Set<string>} type
 * @param {number} startOffset
 * @param {number} endOffset
 */
WebInspector.HTMLModel.Token = function(value, type, startOffset, endOffset)
{
    this.value = value;
    this.type = type;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
};

/**
 * @constructor
 * @param {string} name
 * @param {number} startOffset
 * @param {number} endOffset
 * @param {!Map<string, string>} attributes
 * @param {boolean} isOpenTag
 * @param {boolean} selfClosingTag
 */
WebInspector.HTMLModel.Tag = function(name, startOffset, endOffset, attributes, isOpenTag, selfClosingTag)
{
    this.name = name;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.attributes = attributes;
    this.isOpenTag = isOpenTag;
    this.selfClosingTag = selfClosingTag;
};

/**
 * @constructor
 * @param {string} name
 */
WebInspector.HTMLModel.Element = function(name)
{
    this.name = name;
    this.children = [];
    this.parent = null;
    this.openTag = null;
    this.closeTag = null;
};
