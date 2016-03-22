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
var FormatterWorker = {
    /**
     * @param {string} mimeType
     * @return {function(string, function(string, ?string, number, number):(!Object|undefined))}
     */
    createTokenizer: function(mimeType)
    {
        var mode = CodeMirror.getMode({indentUnit: 2}, mimeType);
        var state = CodeMirror.startState(mode);
        /**
         * @param {string} line
         * @param {function(string, ?string, number, number):?} callback
         */
        function tokenize(line, callback)
        {
            var stream = new CodeMirror.StringStream(line);
            while (!stream.eol()) {
                var style = mode.token(stream, state);
                var value = stream.current();
                if (callback(value, style, stream.start, stream.start + value.length) === FormatterWorker.AbortTokenization)
                    return;
                stream.start = stream.pos;
            }
        }
        return tokenize;
    }
};

FormatterWorker.AbortTokenization = {};

/**
 * @typedef {{indentString: string, content: string, mimeType: string}}
 */
var FormatterParameters;

self.onmessage = function(event) {
    var data = /** @type !{method: string, params: !FormatterParameters} */ (event.data);
    if (!data.method)
        return;

    switch (data.method) {
    case "format":
        FormatterWorker.format(data.params);
        break;
    case "parseCSS":
        FormatterWorker.parseCSS(data.params);
        break;
    case "javaScriptOutline":
        FormatterWorker.javaScriptOutline(data.params);
        break;
    default:
        console.error("Unsupport method name: " + data.method);
    }
};

/**
 * @param {!FormatterParameters} params
 */
FormatterWorker.format = function(params)
{
    // Default to a 4-space indent.
    var indentString = params.indentString || "    ";
    var result = {};
    var builder = new FormatterWorker.FormattedContentBuilder(indentString);
    var text = params.content;
    var lineEndings = text.computeLineEndings();
    try {
        switch (params.mimeType) {
        case "text/html":
            formatMixedHTML(builder, text, lineEndings);
            break;
        case "text/css":
            var formatter = new FormatterWorker.CSSFormatter(builder);
            formatter.format(text, lineEndings, 0, text.length);
            break;
        case "text/javascript":
            var formatter = new FormatterWorker.JavaScriptFormatter(builder);
            formatter.format(text, lineEndings, 0, text.length);
            break;
        default:
            var formatter = new FormatterWorker.IdentityFormatter(builder);
            formatter.format(text, lineEndings, 0, text.length);
        }
        result.mapping = builder.mapping();
        result.content = builder.content();
    } catch (e) {
        console.error(e);
        result.mapping = { original: [0], formatted: [0] };
        result.content = text;
    }
    postMessage(result);
}

/**
 * @param {!FormatterWorker.FormattedContentBuilder} builder
 * @param {string} text
 * @param {!Array<number>} lineEndings
 */
function formatMixedHTML(builder, text, lineEndings)
{
    var htmlFormatter = new FormatterWorker.HTMLFormatter(builder);
    var jsFormatter = new FormatterWorker.JavaScriptFormatter(builder);
    var cssFormatter = new FormatterWorker.CSSFormatter(builder);
    var identityFormatter = new FormatterWorker.IdentityFormatter(builder);

    var offset = 0;
    while (offset < text.length) {
        var result = htmlFormatter.format(text, lineEndings, offset);
        if (result.offset >= text.length)
            break;
        builder.addNewLine();
        var closeTag = "</" + result.tagName;
        offset = text.indexOf(closeTag, result.offset);
        if (offset === -1)
            offset = text.length;
        if (result.tagName === "script")
            jsFormatter.format(text, lineEndings, result.offset, offset);
        else if (result.tagName === "style")
            cssFormatter.format(text, lineEndings, result.offset, offset);
        else
            identityFormatter.format(text, lineEndings, result.offset, offset);
    }
}

