// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SASSLiveSourceMap = {}

/**
 * @constructor
 */
WebInspector.SASSLiveSourceMap.CSSToSASSMapping = function()
{
    /** @type {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._cssToSass = new Map();
    /** @type {!Multimap<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    this._sassToCss = new Multimap();
}

/**
 * @param {!WebInspector.SourceMap} sourceMap
 * @param {!WebInspector.SASSSupport.AST} cssAST
 * @param {!Map<string, !WebInspector.SASSSupport.AST>} sassModels
 * @return {!WebInspector.SASSLiveSourceMap.CSSToSASSMapping}
 */
WebInspector.SASSLiveSourceMap.CSSToSASSMapping.fromSourceMap = function(sourceMap, cssAST, sassModels)
{
    var mapping = new WebInspector.SASSLiveSourceMap.CSSToSASSMapping();
    //FIXME: this works O(N^2).
    cssAST.visit(map);
    return mapping;

    /**
     * @param {!WebInspector.SASSSupport.Node} cssNode
     */
    function map(cssNode)
    {
        if (!(cssNode instanceof WebInspector.SASSSupport.TextNode))
            return;
        var entry = sourceMap.findEntry(cssNode.range.endLine, cssNode.range.endColumn);
        if (!entry || !entry.sourceURL || typeof entry.sourceLineNumber === "undefined" || typeof entry.sourceColumnNumber === "undefined")
            return;
        var sassAST = sassModels.get(entry.sourceURL);
        if (!sassAST)
            return;
        var sassNode = sassAST.findNodeForPosition(entry.sourceLineNumber, entry.sourceColumnNumber);
        if (sassNode)
            mapping.mapCssToSass(cssNode, sassNode);
    }
}

WebInspector.SASSLiveSourceMap.CSSToSASSMapping.prototype = {
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
     * @param {!WebInspector.SASSSupport.ASTDiff} cssDiff
     * @return {!WebInspector.SASSLiveSourceMap.CSSToSASSMapping}
     */
    rebaseForCSSDiff: function(cssDiff)
    {
        var newMapping = new WebInspector.SASSLiveSourceMap.CSSToSASSMapping();
        var cssNodes = this._cssToSass.keysArray();
        for (var i = 0; i < cssNodes.length; ++i) {
            var cssNode = cssNodes[i];
            var sassNode = this._cssToSass.get(cssNode);
            var mappedNode = cssDiff.mapping.get(cssNode);
            if (mappedNode && sassNode)
                newMapping.mapCssToSass(mappedNode, sassNode);
        }
        return newMapping;
    },

    /**
     * @param {!WebInspector.SASSSupport.ASTDiff} sassDiff
     * @return {!WebInspector.SASSLiveSourceMap.CSSToSASSMapping}
     */
    rebaseForSASSDiff: function(sassDiff)
    {
        var newMapping = new WebInspector.SASSLiveSourceMap.CSSToSASSMapping();
        var cssNodes = this._cssToSass.keysArray();
        for (var i = 0; i < cssNodes.length; ++i) {
            var cssNode = cssNodes[i];
            var sassNode = this._cssToSass.get(cssNode);
            var mappedNode = sassNode.document.url === sassDiff.url ? sassDiff.mapping.get(sassNode) : sassNode;
            if (mappedNode)
                newMapping.mapCssToSass(cssNode, mappedNode);
        }
        return newMapping;
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
