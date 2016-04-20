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
 * @param {string} mimeType
 * @return {function(string, function(string, ?string, number, number):(!Object|undefined))}
 */
WebInspector.createTokenizer = function(mimeType)
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
            if (callback(value, style, stream.start, stream.start + value.length) === WebInspector.AbortTokenization)
                return;
            stream.start = stream.pos;
        }
    }
    return tokenize;
}

WebInspector.AbortTokenization = {};

self.onmessage = function(event) {
    var method = /** @type {string} */(event.data.method);
    var params = /** @type !{indentString: string, content: string, mimeType: string} */ (event.data.params);
    if (!method)
        return;

    switch (method) {
    case "format":
        WebInspector.format(params.mimeType, params.content, params.indentString);
        break;
    case "parseCSS":
        WebInspector.parseCSS(params.content);
        break;
    case "javaScriptOutline":
        WebInspector.javaScriptOutline(params.content);
        break;
    case "javaScriptIdentifiers":
        WebInspector.javaScriptIdentifiers(params.content);
        break;
    case "evaluatableJavaScriptSubstring":
        WebInspector.evaluatableJavaScriptSubstring(params.content);
        break;
    default:
        console.error("Unsupport method name: " + method);
    }
};

/**
 * @param {string} content
 */
WebInspector.evaluatableJavaScriptSubstring = function(content)
{
    var tokenizer = acorn.tokenizer(content, {ecmaVersion: 6});
    var result = "";
    try {
        var token = tokenizer.getToken();
        while (token.type !== acorn.tokTypes.eof && WebInspector.AcornTokenizer.punctuator(token))
            token = tokenizer.getToken();

        var startIndex = token.start;
        var endIndex = token.end;
        var openBracketsCounter = 0;
        while (token.type !== acorn.tokTypes.eof) {
            var isIdentifier = WebInspector.AcornTokenizer.identifier(token);
            var isThis = WebInspector.AcornTokenizer.keyword(token, "this");
            var isString = token.type === acorn.tokTypes.string;
            if (!isThis && !isIdentifier && !isString)
                break;

            endIndex = token.end;
            token = tokenizer.getToken();
            while (WebInspector.AcornTokenizer.punctuator(token, ".[]")) {
                if (WebInspector.AcornTokenizer.punctuator(token, "["))
                    openBracketsCounter++;

                if (WebInspector.AcornTokenizer.punctuator(token, "]")) {
                    endIndex = openBracketsCounter > 0 ? token.end : endIndex;
                    openBracketsCounter--;
                }

                token = tokenizer.getToken();
            }
        }
        result = content.substring(startIndex, endIndex);
    } catch (e) {
        console.error(e);
    }
    postMessage(result);
}

/**
 * @param {string} content
 */
WebInspector.javaScriptIdentifiers = function(content)
{
    var root = acorn.parse(content, { ranges: false, ecmaVersion: 6 });

    /** @type {!Array<!ESTree.Node>} */
    var identifiers = [];
    var walker = new WebInspector.ESTreeWalker(beforeVisit);

    /**
     * @param {!ESTree.Node} node
     * @return {boolean}
     */
    function isFunction(node)
    {
        return node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
    }

    /**
     * @param {!ESTree.Node} node
     */
    function beforeVisit(node)
    {
        if (isFunction(node)) {
            if (node.id)
                identifiers.push(node.id);
            return WebInspector.ESTreeWalker.SkipSubtree;
        }

        if (node.type !== "Identifier")
            return;

        if (node.parent && node.parent.type === "MemberExpression" && node.parent.property === node && !node.parent.computed)
            return;
        identifiers.push(node);
    }

    if (!root || root.type !== "Program" || root.body.length !== 1 || !isFunction(root.body[0])) {
        postMessage([]);
        return;
    }

    var functionNode = root.body[0];
    for (var param of functionNode.params)
        walker.walk(param);
    walker.walk(functionNode.body);
    var reduced = identifiers.map(id => ({name: id.name, offset: id.start}));
    postMessage(reduced);
}

/**
 * @param {string} mimeType
 * @param {string} text
 * @param {string=} indentString
 */
WebInspector.format = function(mimeType, text, indentString)
{
    // Default to a 4-space indent.
    indentString = indentString || "    ";
    var result = {};
    var builder = new WebInspector.FormattedContentBuilder(indentString);
    var lineEndings = text.computeLineEndings();
    try {
        switch (mimeType) {
        case "text/html":
            var formatter = new WebInspector.HTMLFormatter(builder);
            formatter.format(text, lineEndings);
            break;
        case "text/css":
            var formatter = new WebInspector.CSSFormatter(builder);
            formatter.format(text, lineEndings, 0, text.length);
            break;
        case "text/javascript":
            var formatter = new WebInspector.JavaScriptFormatter(builder);
            formatter.format(text, lineEndings, 0, text.length);
            break;
        default:
            var formatter = new WebInspector.IdentityFormatter(builder);
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
