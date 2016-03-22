// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} compiledURL
 * @param {!Map<string, !WebInspector.SASSSupport.AST>} models
 */
WebInspector.ASTSourceMap = function(compiledURL, models)
{
    this._compiledURL = compiledURL;
    /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */
    this._models = models;
    /** @type {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._compiledToSource = new Map();
    /** @type {!Multimap<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._sourceToCompiled = new Multimap();
}

/**
 * @param {!WebInspector.ASTService} astService
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!WebInspector.SourceMap} sourceMap
 * @return {!Promise<?WebInspector.ASTSourceMap>}
 */
WebInspector.ASTSourceMap.fromSourceMap = function(astService, cssModel, sourceMap)
{
    var headerIds = cssModel.styleSheetIdsForURL(sourceMap.compiledURL());
    if (!headerIds || !headerIds.length)
        return Promise.resolve(/** @type {?WebInspector.ASTSourceMap} */(null));
    var header = cssModel.styleSheetHeaderForId(headerIds[0]);

    /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */
    var models = new Map();
    var promises = [];
    for (var url of sourceMap.sources()) {
        var contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.SourceMapStyleSheet);
        var sassPromise = contentProvider.requestContent()
            .then(onSCSSText.bind(null, url))
            .then(ast => models.set(ast.document.url, ast));
        promises.push(sassPromise);
    }
    var cssURL = sourceMap.compiledURL();
    var cssPromise = header.requestContent()
        .then(text => astService.parseCSS(cssURL, text || ""))
        .then(ast => models.set(ast.document.url, ast));
    promises.push(cssPromise);

    return Promise.all(promises)
        .then(() => onParsed(cssURL, models, sourceMap))
        .catchException(/** @type {?WebInspector.ASTSourceMap} */(null));

    /**
     * @param {string} url
     * @param {?string} text
     * @return {!Promise<!WebInspector.SASSSupport.AST>}
     */
    function onSCSSText(url, text)
    {
        return astService.parseSCSS(url, text || "");
    }

    /**
     * @param {string} cssURL
     * @param {!Map<string, !WebInspector.SASSSupport.AST>} models
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {!WebInspector.ASTSourceMap}
     */
    function onParsed(cssURL, models, sourceMap)
    {
        var map = new WebInspector.ASTSourceMap(cssURL, models);
        //FIXME: this works O(N^2).
        map.compiledModel().visit(onNode);
        return map;

        /**
         * @param {!WebInspector.SASSSupport.Node} cssNode
         */
        function onNode(cssNode)
        {
            if (!(cssNode instanceof WebInspector.SASSSupport.TextNode))
                return;
            var entry = sourceMap.findEntry(cssNode.range.endLine, cssNode.range.endColumn);
            if (!entry || !entry.sourceURL || typeof entry.sourceLineNumber === "undefined" || typeof entry.sourceColumnNumber === "undefined")
                return;
            var sassAST = models.get(entry.sourceURL);
            if (!sassAST)
                return;
            var sassNode = sassAST.findNodeForPosition(entry.sourceLineNumber, entry.sourceColumnNumber);
            if (sassNode)
                map.addMapping(cssNode, sassNode);
        }
    }
}

WebInspector.ASTSourceMap.prototype = {
    /**
     * @return {string}
     */
    compiledURL: function()
    {
        return this._compiledURL;
    },

    /**
     * @return {!WebInspector.SASSSupport.AST}
     */
    compiledModel: function()
    {
        return /** @type {!WebInspector.SASSSupport.AST} */(this._models.get(this._compiledURL));
    },

    /**
     * @return {!Map<string, !WebInspector.SASSSupport.AST>}
     */
    sourceModels: function()
    {
        var sourceModels = /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */(new Map(this._models));
        sourceModels.delete(this._compiledURL);
        return sourceModels;
    },

    /**
     * @return {!Map<string, !WebInspector.SASSSupport.AST>}
     */
    models: function()
    {
        return /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */(new Map(this._models));
    },

    /**
     * @param {string} url
     * @return {?WebInspector.SASSSupport.AST}
     */
    modelForURL: function(url)
    {
        return this._models.get(url) || null;
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} compiled
     * @param {!WebInspector.SASSSupport.TextNode} source
     */
    addMapping: function(compiled, source)
    {
        this._compiledToSource.set(compiled, source);
        this._sourceToCompiled.set(source, compiled);
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} compiled
     * @param {!WebInspector.SASSSupport.TextNode} source
     */
    removeMapping: function(compiled, source)
    {
        this._compiledToSource.delete(compiled);
        this._sourceToCompiled.remove(source, compiled);
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} compiled
     * @return {?WebInspector.SASSSupport.TextNode}
     */
    toSourceNode: function(compiled)
    {
        return this._compiledToSource.get(compiled) || null;
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} source
     * @return {!Array<!WebInspector.SASSSupport.TextNode>}
     */
    toCompiledNodes: function(source)
    {
        var compiledNodes = this._sourceToCompiled.get(source);
        return compiledNodes ? compiledNodes.valuesArray() : [];
    },

    /**
     * @return {!Array<!WebInspector.SASSSupport.TextNode>}
     */
    allCompiledNodes: function()
    {
        return this._compiledToSource.keysArray();
    },

    /**
     * @param {!Array<!WebInspector.SASSSupport.AST>} updated
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>=} outNodeMapping
     * @return {?WebInspector.ASTSourceMap}
     */
    rebase: function(updated, outNodeMapping)
    {
        outNodeMapping = outNodeMapping || new Map();
        outNodeMapping.clear();

        var models = /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */(new Map(this._models));
        for (var newAST of updated) {
            var oldAST = models.get(newAST.document.url);
            if (!oldAST.match(newAST, outNodeMapping))
                return null;
            models.set(newAST.document.url, newAST);
        }

        var newMap = new WebInspector.ASTSourceMap(this._compiledURL, models);
        var compiledNodes = this._compiledToSource.keysArray();
        for (var i = 0; i < compiledNodes.length; ++i) {
            var compiledNode = compiledNodes[i];
            var sourceNode = /** @type {!WebInspector.SASSSupport.TextNode} */(this._compiledToSource.get(compiledNode));
            var mappedCompiledNode = /** @type {!WebInspector.SASSSupport.TextNode} */(outNodeMapping.get(compiledNode) || compiledNode);
            var mappedSourceNode = /** @type {!WebInspector.SASSSupport.TextNode} */(outNodeMapping.get(sourceNode) || sourceNode);
            newMap.addMapping(mappedCompiledNode, mappedSourceNode);
        }
        return newMap;
    }
}
