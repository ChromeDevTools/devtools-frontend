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

/**
 * @constructor
 */
WebInspector.SCSSParser.Result = function()
{
    this.properties = [];
    this.variables = [];
    this.mixins = [];
}

WebInspector.SCSSParser.prototype = {
    /**
     * @override
     * @param {string} content
     * @return {!WebInspector.SCSSParser.Result}
     */
    parse: function(content)
    {
        var result = new WebInspector.SCSSParser.Result();
        var ast = null;
        try {
            ast = gonzales.parse(content, {syntax: "scss"});
        } catch (e) {
            return result;
        }

        var extractedNodes = [];
        WebInspector.SCSSParser.extractNodes(ast, extractedNodes);

        for (var node of extractedNodes) {
            if (node.type === "declaration")
                this._handleDeclaration(node, result);
            else if (node.type === "include")
                this._handleInclude(node, result);
            else if (node.type === "multilineComment" && node.start.line === node.end.line)
                this._handleComment(node, result);
        }
        return result;
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!WebInspector.SCSSParser.Result} result
     */
    _handleDeclaration: function(node, result)
    {
        var propertyNode = node.content.find(node => node.type === "property");
        var delimeterNode = node.content.find(node => node.type === "propertyDelimiter");
        var valueNode = node.content.find(node => node.type === "value");
        if (!propertyNode || !delimeterNode || !valueNode)
            return;

        var nameRange = new WebInspector.TextRange(propertyNode.start.line - 1, propertyNode.start.column - 1, delimeterNode.start.line - 1, delimeterNode.start.column - 1);
        var valueRange = new WebInspector.TextRange(delimeterNode.end.line - 1, delimeterNode.end.column, valueNode.end.line - 1, valueNode.end.column);
        var range = /** @type {!WebInspector.TextRange} */(node.declarationRange);

        var property = new WebInspector.SCSSParser.Property(range, nameRange, valueRange, false);
        var isVariable = !!propertyNode.content.find(node => node.type === "variable");
        if (isVariable)
            result.variables.push(property);
        else
            result.properties.push(property);
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!WebInspector.SCSSParser.Result} result
     */
    _handleInclude: function(node, result)
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
            result.mixins.push(property);
        }
    },

    /**
     * @param {!Gonzales.Node} node
     * @param {!WebInspector.SCSSParser.Result} result
     */
    _handleComment: function(node, result)
    {
        if (node.start.line !== node.end.line)
            return;
        var innerText = /** @type {string} */(node.content);
        var innerResult = this.parse(innerText);
        if (innerResult.properties.length !== 1 || innerResult.variables.length !== 0 || innerResult.mixins.length !== 0)
            return;
        var property = innerResult.properties[0];
        var disabledProperty = property.rebaseInsideOneLineComment(node);
        result.properties.push(disabledProperty);
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
 * @param {!Gonzales.Node} node
 * @param {!Array<!Gonzales.Node>} output
 */
WebInspector.SCSSParser.extractNodes = function(node, output)
{
    if (!Array.isArray(node.content))
        return;
    var lastDeclaration = null;
    for (var i = 0; i < node.content.length; ++i) {
        var child = node.content[i];
        if (child.type === "declarationDelimiter" && lastDeclaration) {
            lastDeclaration.declarationRange.endLine = child.end.line - 1;
            lastDeclaration.declarationRange.endColumn = child.end.column;
            lastDeclaration = null;
        }
        if (child.type === "include" || child.type === "declaration" || child.type === "multilineComment")
            output.push(child);
        if (child.type === "declaration") {
            lastDeclaration = child;
            lastDeclaration.declarationRange = WebInspector.TextRange.createFromLocation(child.start.line - 1, child.start.column - 1);
        }
        WebInspector.SCSSParser.extractNodes(child, output);
    }
    if (lastDeclaration) {
        lastDeclaration.declarationRange.endLine = node.end.line - 1;
        lastDeclaration.declarationRange.endColumn = node.end.column - 1;
    }
}
