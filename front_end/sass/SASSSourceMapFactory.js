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

        var headerIds = cssModel.styleSheetIdsForURL(sourceMap.compiledURL());
        if (!headerIds || !headerIds.length)
            return Promise.resolve(/** @type {?WebInspector.SourceMap} */(null));
        var header = cssModel.styleSheetHeaderForId(headerIds[0]);

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
            if (cssNode.parent && (cssNode.parent instanceof WebInspector.SASSSupport.Property) && cssNode === cssNode.parent.name)
                valid = valid && cssNode.text.trim() === sassNode.text.trim();
            map.addMapping(cssNode, sassNode);
        }
    },
}

