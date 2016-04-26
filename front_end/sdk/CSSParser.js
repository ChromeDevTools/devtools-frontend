/**
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.CSSParser = function()
{
    this._worker = new WebInspector.Worker("formatter_worker");
    this._worker.onmessage = this._onRuleChunk.bind(this);
    this._rules = [];
}

WebInspector.CSSParser.Events = {
    RulesParsed: "RulesParsed"
}

WebInspector.CSSParser.prototype = {
    /**
     * @param {!WebInspector.CSSStyleSheetHeader} styleSheetHeader
     * @param {function(!Array.<!WebInspector.CSSParser.Rule>)=} callback
     */
    fetchAndParse: function(styleSheetHeader, callback)
    {
        this._lock();
        this._finishedCallback = callback;
        styleSheetHeader.requestContent().then(this._innerParse.bind(this));
    },

    /**
     * @param {string} text
     * @param {function(!Array.<!WebInspector.CSSParser.Rule>)=} callback
     */
    parse: function(text, callback)
    {
        this._lock();
        this._finishedCallback = callback;
        this._innerParse(text);
    },

    /**
     * @param {string} text
     * @return {!Promise<!Array.<!WebInspector.CSSParser.Rule>>}
     */
    parsePromise: function(text)
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @param {function()} succ
         * @param {function()} fail
         * @this {WebInspector.CSSParser}
         */
        function promiseConstructor(succ, fail)
        {
            this.parse(text, succ);
        }
    },

    dispose: function()
    {
        if (this._worker) {
            this._worker.terminate();
            delete this._worker;
            this._runFinishedCallback([]);
        }
    },

    /**
     * @return {!Array.<!WebInspector.CSSParser.Rule>}
     */
    rules: function()
    {
        return this._rules;
    },

    _lock: function()
    {
        console.assert(!this._parsingStyleSheet, "Received request to parse stylesheet before previous was completed.");
        this._parsingStyleSheet = true;
    },

    _unlock: function()
    {
        delete this._parsingStyleSheet;
    },

    /**
     * @param {?string} text
     */
    _innerParse: function(text)
    {
        this._rules = [];
        this._worker.postMessage({ method: "parseCSS", params: { content: text } });
    },

    /**
     * @param {!MessageEvent} event
     */
    _onRuleChunk: function(event)
    {
        var data = /** @type {!WebInspector.CSSParser.DataChunk} */ (event.data);
        var chunk = data.chunk;
        for (var i = 0; i < chunk.length; ++i)
            this._rules.push(chunk[i]);

        if (data.isLastChunk)
            this._onFinishedParsing();
        this.dispatchEventToListeners(WebInspector.CSSParser.Events.RulesParsed);
    },

    _onFinishedParsing: function()
    {
        this._unlock();
        this._runFinishedCallback(this._rules);
    },

    /**
     * @param {!Array<!WebInspector.CSSRule>} rules
     */
    _runFinishedCallback: function(rules)
    {
        var callback = this._finishedCallback;
        delete this._finishedCallback;
        if (callback)
            callback.call(null, rules);
    },

    __proto__: WebInspector.Object.prototype,
}

/**
 * @typedef {{isLastChunk: boolean, chunk: !Array.<!WebInspector.CSSParser.Rule>}}
 */
WebInspector.CSSParser.DataChunk;

/**
 * @constructor
 */
WebInspector.CSSParser.StyleRule = function()
{
    /** @type {string} */
    this.selectorText;
    /** @type {!WebInspector.CSSParser.Range} */
    this.styleRange;
    /** @type {number} */
    this.lineNumber;
    /** @type {number} */
    this.columnNumber;
    /** @type {!Array.<!WebInspector.CSSParser.Property>} */
    this.properties;
}

/**
 * @typedef {{atRule: string, lineNumber: number, columnNumber: number}}
 */
WebInspector.CSSParser.AtRule;

/**
 * @typedef {(WebInspector.CSSParser.StyleRule|WebInspector.CSSParser.AtRule)}
 */
WebInspector.CSSParser.Rule;

/**
 * @typedef {{startLine: number, startColumn: number, endLine: number, endColumn: number}}
 */
WebInspector.CSSParser.Range;

/**
 * @constructor
 */
WebInspector.CSSParser.Property = function()
{
    /** @type {string} */
    this.name;
    /** @type {!WebInspector.CSSParser.Range} */
    this.nameRange;
    /** @type {string} */
    this.value;
    /** @type {!WebInspector.CSSParser.Range} */
    this.valueRange;
    /** @type {!WebInspector.CSSParser.Range} */
    this.range;
    /** @type {(boolean|undefined)} */
    this.disabled;
}

/**
 * @constructor
 */
WebInspector.CSSParserService = function()
{
    this._cssParser = null;
    this._cssRequests = [];
    this._terminated = false;
}

WebInspector.CSSParserService.prototype = {
    /**
     * @param {string} text
     * @return {!Promise<!Array.<!WebInspector.CSSParser.Rule>>}
     */
    parseCSS: function(text)
    {
        console.assert(!this._terminated, "Illegal call parseCSS on terminated CSSParserService.");
        if (!this._cssParser)
            this._cssParser = new WebInspector.CSSParser();
        var request = new WebInspector.CSSParserService.ParseRequest(text);
        this._cssRequests.push(request);
        this._maybeParseCSS();
        return request.parsedPromise;
    },

    _maybeParseCSS: function()
    {
        if (this._terminated || this._isParsingCSS || !this._cssRequests.length)
            return;
        this._isParsingCSS = true;
        var request = this._cssRequests.shift();
        this._cssParser.parsePromise(request.text)
            .catchException(/** @type {!Array.<!WebInspector.CSSParser.Rule>} */([]))
            .then(onCSSParsed.bind(this));

        /**
         * @param {!Array.<!WebInspector.CSSParser.Rule>} rules
         * @this {WebInspector.CSSParserService}
         */
        function onCSSParsed(rules)
        {
            request.parsedCallback.call(null, rules);
            this._isParsingCSS = false;
            this._maybeParseCSS();
        }
    },

    dispose: function()
    {
        if (this._terminated)
            return;
        this._terminated = true;
        if (this._cssParser)
            this._cssParser.dispose();
        for (var request of this._cssRequests)
            request.parsedCallback.call(null, /** @type {!Array.<!WebInspector.CSSParser.Rule>} */([]));
        this._cssRequests = [];
    },
}

/**
 * @constructor
 * @param {string} text
 */
WebInspector.CSSParserService.ParseRequest = function(text)
{
    this.text = text;
    /** @type {function(!Array.<!WebInspector.CSSParser.Rule>)} */
    this.parsedCallback;
    this.parsedPromise = new Promise(fulfill => this.parsedCallback = fulfill);
}
