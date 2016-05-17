// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SourceMapFactory}
 */
WebInspector.SASSSourceMapFactory = function()
{
    this._astService = new WebInspector.ASTService();
}

WebInspector.SASSSourceMapFactory.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {!Promise<?WebInspector.SourceMap>}
     */
    editableSourceMap: function(target, sourceMap)
    {
        var cssModel = WebInspector.CSSModel.fromTarget(target);
        if (!cssModel)
            return Promise.resolve(/** @type {?WebInspector.SourceMap} */(null));

        var header = cssModel.styleSheetHeaders().find(styleSheetHeader => styleSheetHeader.sourceMapURL === sourceMap.url());
        if (!header)
            return Promise.resolve(/** @type {?WebInspector.SourceMap} */(null));

        /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */
        var models = new Map();
        var promises = [];
        for (let url of sourceMap.sourceURLs()) {
            var contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.SourceMapStyleSheet);
            var sassPromise = contentProvider.requestContent()
                .then(text => this._astService.parseSCSS(url, text || ""))
                .then(ast => models.set(ast.document.url, ast));
            promises.push(sassPromise);
        }
        var cssURL = sourceMap.compiledURL();
        var cssPromise = header.originalContentProvider().requestContent()
            .then(text => this._astService.parseCSS(cssURL, text || ""))
            .then(ast => models.set(ast.document.url, ast));
        promises.push(cssPromise);

        return Promise.all(promises)
            .then(this._onSourcesParsed.bind(this, sourceMap, models))
            .catchException(/** @type {?WebInspector.SourceMap} */(null));
    },

    /**
     * @param {!WebInspector.SourceMap} sourceMap
     * @param {!Map<string, !WebInspector.SASSSupport.AST>} models
     * @return {?WebInspector.SourceMap}
     */
    _onSourcesParsed: function(sourceMap, models)
    {
        var editCallback = WebInspector.SASSProcessor.processCSSEdits.bind(WebInspector.SASSProcessor, this._astService);
        var map = new WebInspector.ASTSourceMap(sourceMap.compiledURL(), sourceMap.url(), models, editCallback);
        var valid = true;
        map.compiledModel().visit(onNode);
        return valid ? map : null;

        /**
         * @param {!WebInspector.SASSSupport.Node} cssNode
         */
        function onNode(cssNode)
        {
            if (!valid)
                return;
            if (!(cssNode instanceof WebInspector.SASSSupport.TextNode))
                return;
            var entry = sourceMap.findEntry(cssNode.range.startLine, cssNode.range.startColumn);
            if (!entry || !entry.sourceURL || typeof entry.sourceLineNumber === "undefined" || typeof entry.sourceColumnNumber === "undefined")
                return;
            var sassAST = models.get(entry.sourceURL);
            if (!sassAST)
                return;
            var sassNode = sassAST.findNodeForPosition(entry.sourceLineNumber, entry.sourceColumnNumber);
            if (!sassNode)
                return;
            if (cssNode.parent && (cssNode.parent instanceof WebInspector.SASSSupport.Property) && cssNode === cssNode.parent.name && cssNode.text.trim() !== sassNode.text.trim()) {
                valid = false;
                reportError(cssNode, sassNode);
                return;
            }
            map.addMapping(cssNode, sassNode);
        }

        /**
         * @param {!WebInspector.SASSSupport.TextNode} cssNode
         * @param {!WebInspector.SASSSupport.TextNode} sassNode
         */
        function reportError(cssNode, sassNode)
        {
            var text = WebInspector.UIString("LiveSASS failed to start: %s", sourceMap.url());
            text += WebInspector.UIString("\nSourceMap is misaligned: %s != %s", cssNode.text.trim(), sassNode.text.trim());
            text += "\ncompiled: " + cssNode.document.url + ":" + (cssNode.range.startLine + 1) + ":" + (cssNode.range.startColumn + 1);
            text += "\nsource: " + sassNode.document.url + ":" + (sassNode.range.startLine + 1) + ":" + (sassNode.range.startColumn + 1);
            WebInspector.console.error(text);
        }
    },
}
