// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} cssURL
 * @param {!Map<string, !WebInspector.SASSSupport.AST>} models
 */
WebInspector.ASTSourceMap = function(cssURL, models)
{
    this._cssURL = cssURL;
    /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */
    this._models = models;
    /** @type {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._cssToSass = new Map();
    /** @type {!Multimap<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._sassToCss = new Multimap();
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
        map.cssAST().visit(onNode);
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
                map.mapCssToSass(cssNode, sassNode);
        }
    }
}

WebInspector.ASTSourceMap.prototype = {
    /**
     * @return {string}
     */
    cssURL: function()
    {
        return this._cssURL;
    },

    /**
     * @return {!WebInspector.SASSSupport.AST}
     */
    cssAST: function()
    {
        return /** @type {!WebInspector.SASSSupport.AST} */(this._models.get(this._cssURL));
    },

    /**
     * @return {!Map<string, !WebInspector.SASSSupport.AST>}
     */
    sassModels: function()
    {
        var sassModels = /** @type {!Map<string, !WebInspector.SASSSupport.AST>} */(new Map(this._models));
        sassModels.delete(this._cssURL);
        return sassModels;
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
     * @param {!WebInspector.SASSSupport.TextNode} css
     * @param {!WebInspector.SASSSupport.TextNode} sass
     */
    mapCssToSass: function(css, sass)
    {
        this._cssToSass.set(css, sass);
        this._sassToCss.set(sass, css);
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} css
     * @param {!WebInspector.SASSSupport.TextNode} sass
     */
    unmapCssFromSass: function(css, sass)
    {
        this._cssToSass.delete(css);
        this._sassToCss.remove(sass, css);
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} css
     * @return {?WebInspector.SASSSupport.TextNode}
     */
    toSASSNode: function(css)
    {
        return this._cssToSass.get(css) || null;
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} sass
     * @return {!Array<!WebInspector.SASSSupport.TextNode>}
     */
    toCSSNodes: function(sass)
    {
        var cssNodes = this._sassToCss.get(sass);
        return cssNodes ? cssNodes.valuesArray() : [];
    },

    /**
     * @param {!WebInspector.SASSSupport.Property} cssProperty
     * @return {?WebInspector.SASSSupport.Property}
     */
    toSASSProperty: function(cssProperty)
    {
        var sassName = this._cssToSass.get(cssProperty.name);
        return sassName ? sassName.parent : null;
    },

    /**
     * @param {!WebInspector.SASSSupport.Property} sassProperty
     * @return {!Array<!WebInspector.SASSSupport.Property>}
     */
    toCSSProperties: function(sassProperty)
    {
        return this.toCSSNodes(sassProperty.name).map(name => name.parent);
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

        var newMap = new WebInspector.ASTSourceMap(this._cssURL, models);
        var cssNodes = this._cssToSass.keysArray();
        for (var i = 0; i < cssNodes.length; ++i) {
            var cssNode = cssNodes[i];
            var sassNode = /** @type {!WebInspector.SASSSupport.TextNode} */(this._cssToSass.get(cssNode));
            var mappedCSSNode = /** @type {!WebInspector.SASSSupport.TextNode} */(outNodeMapping.get(cssNode) || cssNode);
            var mappedSASSNode = /** @type {!WebInspector.SASSSupport.TextNode} */(outNodeMapping.get(sassNode) || sassNode);
            newMap.mapCssToSass(mappedCSSNode, mappedSASSNode);
        }
        return newMap;
    },

    /**
     * @return {boolean}
     */
    isValid: function()
    {
        var cssNodes = this._cssToSass.keysArray();
        for (var i = 0; i < cssNodes.length; ++i) {
            var cssNode = cssNodes[i];
            if (!cssNode.parent || !(cssNode.parent instanceof WebInspector.SASSSupport.Property))
                continue;
            if (cssNode !== cssNode.parent.name)
                continue;
            var sassNode = this._cssToSass.get(cssNode);
            if (sassNode && cssNode.text.trim() !== sassNode.text.trim())
                return false;
        }
        return true;
    }
}
