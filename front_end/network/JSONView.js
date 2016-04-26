/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ParsedJSON} parsedJSON
 */
WebInspector.JSONView = function(parsedJSON)
{
    WebInspector.VBox.call(this);
    this._parsedJSON = parsedJSON;
    this.element.classList.add("json-view");
}

/**
 * @param {?string} text
 * @return {!Promise<?WebInspector.ParsedJSON>}
 */
WebInspector.JSONView.parseJSON = function(text)
{
    var returnObj = null;
    if (text)
        returnObj = WebInspector.JSONView._extractJSON(/** @type {string} */ (text));
    if (!returnObj)
        return Promise.resolve(/** @type {?WebInspector.ParsedJSON} */ (null));
    return new Promise(runParser);

    /**
     * @param {function(*)} success
     */
    function runParser(success) {
        var worker = new WebInspector.Worker("formatter_worker");
        worker.onmessage =  /** @type function(!MessageEvent) */ (handleReturnedJSON);
        worker.postMessage({method: "relaxedJSONParser", params:{content: returnObj.data}});

        /**
         * @param {!MessageEvent} event
         */
        function handleReturnedJSON(event) {
            worker.terminate();
            if (!event.data) {
                success(null);
                return;
            }
            returnObj.data = event.data;
            success(returnObj);
        }
    }
}

/**
 * @param {string} text
 * @return {?WebInspector.ParsedJSON}
 */
WebInspector.JSONView._extractJSON = function(text)
{
    // Do not treat HTML as JSON.
    if (text.startsWith("<"))
        return null;
    var inner = WebInspector.JSONView._findBrackets(text, "{", "}");
    var inner2 = WebInspector.JSONView._findBrackets(text, "[", "]");
    inner = inner2.length > inner.length ? inner2 : inner;

    // Return on blank payloads or on payloads significantly smaller than original text.
    if (inner.length === -1 || text.length - inner.length > 80)
        return null;

    var prefix = text.substring(0, inner.start);
    var suffix = text.substring(inner.end + 1);
    text = text.substring(inner.start, inner.end + 1);

    // Only process valid JSONP.
    if (suffix.trim().length && !(suffix.trim().startsWith(")") && prefix.trim().endsWith("(")))
        return null;

    return new WebInspector.ParsedJSON(text, prefix, suffix);
}

/**
 * @param {string} text
 * @param {string} open
 * @param {string} close
 * @return {{start: number, end: number, length: number}}
 */
WebInspector.JSONView._findBrackets = function(text, open, close)
{
    var start = text.indexOf(open);
    var end = text.lastIndexOf(close);
    var length = end - start - 1;
    if (start == -1 || end == -1 || end < start)
        length = -1;
    return {start: start, end: end, length: length};
}

WebInspector.JSONView.prototype = {
    wasShown: function()
    {
        this._initialize();
    },

    _initialize: function()
    {
        if (this._initialized)
            return;
        this._initialized = true;

        var obj = WebInspector.RemoteObject.fromLocalObject(this._parsedJSON.data);
        var title = this._parsedJSON.prefix + obj.description + this._parsedJSON.suffix;
        var section = new WebInspector.ObjectPropertiesSection(obj, title);
        section.setEditable(false);
        section.expand();
        this.element.appendChild(section.element);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {*} data
 * @param {string} prefix
 * @param {string} suffix
 */
WebInspector.ParsedJSON = function(data, prefix, suffix)
{
    this.data = data;
    this.prefix = prefix;
    this.suffix = suffix;
}
