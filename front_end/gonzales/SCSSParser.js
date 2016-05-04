// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.FormatterWorkerContentParser}
 */
WebInspector.SCSSParser = function()
{
}

WebInspector.SCSSParser.prototype = {
    /**
     * @override
     * @param {string} content
     * @return {!Array<!WebInspector.SCSSParser.Rule>}
     */
    parse: function(content)
    {
        var ast = null;
        try {
            ast = gonzales.parse(content, {syntax: "scss"});
        } catch (e) {
            return [];
        }

        /** @type {!{properties: !Array<!Gonzales.Node>, node: !Gonzales.Node}} */
        var rootBlock = {
            properties: [],
            node: ast
        };
        /** @type {!Array<!{properties: !Array<!Gonzales.Node>, node: !Gonzales.Node}>} */
        var blocks = [rootBlock];
        ast.selectors = [];
        WebInspector.SCSSParser.extractNodes(ast, blocks, rootBlock);

        var rules = [];
        for (var block of blocks)
            this._handleBlock(block, rules);
        return rules;
    },

    /**
     * @param {!{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}} block
     * @param {!Array<!WebInspector.SCSSParser.Rule>} output
     */
    _handleBlock: function(block, output)
    {
        var selectors = block.node.selectors.map(WebInspector.SCSSParser.rangeFromNode);
        var properties = [];
        var styleRange = WebInspector.SCSSParser.rangeFromNode(block.node);
        styleRange.startColumn += 1;
        styleRange.endColumn -= 1;
        for (var node of block.properties) {
            if (node.type === "declaration")
                this._handleDeclaration(node, properties);
            else if (node.type === "include")
                this._handleInclude(node, properties);
            else if (node.type === "multilineComment" && node.start.line === node.end.line)
                this._handleComment(node, properties);
        }
        if (!selectors.length && !properties.length)
            return;
        var rule = new WebInspector.SCSSParser.Rule(selectors, properties, styleRange);
        output.push(rule);
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!Array<!WebInspector.SCSSParser.Property>} output
     */
    _handleDeclaration: function(node, output)
    {
        var propertyNode = node.content.find(node => node.type === "property");
        var valueNode = node.content.find(node => node.type === "value");
        if (!propertyNode || !valueNode)
            return;

        var nameRange = WebInspector.SCSSParser.rangeFromNode(propertyNode);
        var valueRange = WebInspector.SCSSParser.rangeFromNode(valueNode);
        var range = /** @type {!WebInspector.TextRange} */(node.declarationRange);

        var property = new WebInspector.SCSSParser.Property(range, nameRange, valueRange, false);
        output.push(property);
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!Array<!WebInspector.SCSSParser.Property>} output
     */
    _handleInclude: function(node, output)
    {
        var mixinName = node.content.find(node => node.type === "ident");
        if (!mixinName)
            return;
        var nameRange = WebInspector.SCSSParser.rangeFromNode(mixinName);
        var mixinArguments = node.content.find(node => node.type === "arguments");
        if (!mixinArguments)
            return;
        var parameters = mixinArguments.content.filter(node => node.type !== "delimiter" && node.type !== "space");
        for (var parameter of parameters) {
            var range = WebInspector.SCSSParser.rangeFromNode(node);
            var valueRange = WebInspector.SCSSParser.rangeFromNode(parameter);
            var property = new WebInspector.SCSSParser.Property(range, nameRange, valueRange, false);
            output.push(property);
        }
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!Array<!WebInspector.SCSSParser.Property>} output
     */
    _handleComment: function(node, output)
    {
        if (node.start.line !== node.end.line)
            return;
        var innerText = /** @type {string} */(node.content);
        var innerResult = this.parse(innerText);
        if (innerResult.length !== 1 || innerResult[0].properties.length !== 1)
            return;
        var property = innerResult[0].properties[0];
        var disabledProperty = property.rebaseInsideOneLineComment(node);
        output.push(disabledProperty);
    },
}

/**
 * @param {!Gonzales.Node} node
 * @return {!WebInspector.TextRange}
 */
WebInspector.SCSSParser.rangeFromNode = function(node)
{
    return new WebInspector.TextRange(node.start.line - 1, node.start.column - 1, node.end.line - 1, node.end.column);
}

/**
 * @constructor
 * @param {!WebInspector.TextRange} range
 * @param {!WebInspector.TextRange} nameRange
 * @param {!WebInspector.TextRange} valueRange
 * @param {boolean} disabled
 */
WebInspector.SCSSParser.Property = function(range, nameRange, valueRange, disabled)
{
    this.range = range;
    this.name = nameRange;
    this.value = valueRange;
    this.disabled = disabled;
}

WebInspector.SCSSParser.Property.prototype = {
    /**
     * @param {!Gonzales.Node} commentNode
     * @return {!WebInspector.SCSSParser.Property}
     */
    rebaseInsideOneLineComment: function(commentNode)
    {
        var lineOffset = commentNode.start.line - 1;
        // Account for the "/*".
        var columnOffset = commentNode.start.column - 1 + 2;
        var range = WebInspector.SCSSParser.rangeFromNode(commentNode);
        var name = rebaseRange(this.name, lineOffset, columnOffset);
        var value = rebaseRange(this.value, lineOffset, columnOffset);
        return new WebInspector.SCSSParser.Property(range, name, value, true);

        /**
         * @param {!WebInspector.TextRange} range
         * @param {number} lineOffset
         * @param {number} columnOffset
         * @return {!WebInspector.TextRange}
         */
        function rebaseRange(range, lineOffset, columnOffset)
        {
            return new WebInspector.TextRange(range.startLine + lineOffset, range.startColumn + columnOffset, range.endLine + lineOffset, range.endColumn + columnOffset);
        }
    }
}

/**
 * @constructor
 * @param {!Array<!WebInspector.TextRange>} selectors
 * @param {!Array<!WebInspector.SCSSParser.Property>} properties
 * @param {!WebInspector.TextRange} styleRange
 */
WebInspector.SCSSParser.Rule = function(selectors, properties, styleRange)
{
    this.selectors = selectors;
    this.properties = properties;
    this.styleRange = styleRange;
}

/**
 * @param {!Gonzales.Node} node
 * @param {!Array<{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}>} blocks
 * @param {!{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}} lastBlock
 */
WebInspector.SCSSParser.extractNodes = function(node, blocks, lastBlock)
{
    if (!Array.isArray(node.content))
        return;
    if (node.type === "block") {
        lastBlock = {
            node: node,
            properties: []
        };
        blocks.push(lastBlock);
    }
    var lastDeclaration = null;
    var selectors = [];
    for (var i = 0; i < node.content.length; ++i) {
        var child = node.content[i];
        if (child.type === "declarationDelimiter" && lastDeclaration) {
            lastDeclaration.declarationRange.endLine = child.end.line - 1;
            lastDeclaration.declarationRange.endColumn = child.end.column;
            lastDeclaration = null;
        } else if (child.type === "selector") {
            selectors.push(child);
        } else if (child.type === "block") {
            child.selectors = selectors;
            selectors = [];
        }
        if (child.type === "include" || child.type === "declaration" || child.type === "multilineComment")
            lastBlock.properties.push(child);
        if (child.type === "declaration") {
            lastDeclaration = child;
            lastDeclaration.declarationRange = WebInspector.TextRange.createFromLocation(child.start.line - 1, child.start.column - 1);
        }
        WebInspector.SCSSParser.extractNodes(child, blocks, lastBlock);
    }
    if (lastDeclaration) {
        lastDeclaration.declarationRange.endLine = node.end.line - 1;
        lastDeclaration.declarationRange.endColumn = node.end.column - 1;
    }
}
