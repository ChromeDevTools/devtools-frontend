// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SASSSupport = {}

/**
 * @constructor
 * @param {string} url
 * @param {string} text
 */
WebInspector.SASSSupport.ASTDocument = function(url, text)
{
    this.url = url;
    this.text = text;
}

/**
 * @param {string} url
 * @param {string} text
 * @param {!WebInspector.TokenizerFactory} tokenizerFactory
 * @return {!WebInspector.SASSSupport.AST}
 */
WebInspector.SASSSupport.parseSCSS = function(url, text, tokenizerFactory)
{
    var document = new WebInspector.SASSSupport.ASTDocument(url, text);
    var result = WebInspector.SASSSupport._innerParseSCSS(document, tokenizerFactory);

    var rules = [
        new WebInspector.SASSSupport.Rule(document, "variables", result.variables),
        new WebInspector.SASSSupport.Rule(document, "properties", result.properties),
        new WebInspector.SASSSupport.Rule(document, "mixins", result.mixins)
    ];

    return new WebInspector.SASSSupport.AST(document, rules);
}

/** @enum {string} */
WebInspector.SASSSupport.SCSSParserStates = {
    Initial: "Initial",
    PropertyName: "PropertyName",
    PropertyValue: "PropertyValue",
    VariableName: "VariableName",
    VariableValue: "VariableValue",
    MixinName: "MixinName",
    MixinValue: "MixinValue",
    Media: "Media",
}

/**
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {!WebInspector.TokenizerFactory} tokenizerFactory
 * @return {!{variables: !Array<!WebInspector.SASSSupport.Property>, properties: !Array<!WebInspector.SASSSupport.Property>, mixins: !Array<!WebInspector.SASSSupport.Property>}}
 */
WebInspector.SASSSupport._innerParseSCSS = function(document, tokenizerFactory)
{
    var lines = document.text.split("\n");
    var properties = [];
    var variables = [];
    var mixins = [];

    var States = WebInspector.SASSSupport.SCSSParserStates;
    var state = States.Initial;
    var propertyName, propertyValue;
    var variableName, variableValue;
    var mixinName, mixinValue;
    var UndefTokenType = {};

    /**
     * @param {string} tokenValue
     * @param {?string} tokenTypes
     * @param {number} column
     * @param {number} newColumn
     */
    function processToken(tokenValue, tokenTypes, column, newColumn)
    {
        var tokenType = tokenTypes ? tokenTypes.split(" ").keySet() : UndefTokenType;
        switch (state) {
        case States.Initial:
            if (tokenType["css-variable-2"]) {
                variableName = new WebInspector.SASSSupport.TextNode(document, tokenValue, new WebInspector.TextRange(lineNumber, column, lineNumber, newColumn));
                state = States.VariableName;
            } else if (tokenType["css-property"] || tokenType["css-meta"]) {
                propertyName = new WebInspector.SASSSupport.TextNode(document, tokenValue, new WebInspector.TextRange(lineNumber, column, lineNumber, newColumn));
                state = States.PropertyName;
            } else if (tokenType["css-def"] && tokenValue === "@include") {
                mixinName = new WebInspector.SASSSupport.TextNode(document, tokenValue, new WebInspector.TextRange(lineNumber, column, lineNumber, newColumn));
                state = States.MixinName;
            } else if (tokenType["css-comment"]) {
                // Support only a one-line comments.
                if (tokenValue.substring(0, 2) !== "/*" || tokenValue.substring(tokenValue.length - 2) !== "*/")
                    break;
                var uncommentedText = tokenValue.substring(2, tokenValue.length - 2);
                var fakeRuleText = "a{\n" + uncommentedText + "}";
                var fakeDocument = new WebInspector.SASSSupport.ASTDocument("", fakeRuleText);
                var result = WebInspector.SASSSupport._innerParseSCSS(fakeDocument, tokenizerFactory);
                if (result.properties.length === 1 && result.variables.length === 0 && result.mixins.length === 0) {
                    var disabledProperty = result.properties[0];
                    // We should offset property to current coordinates.
                    var offset = column + 2;
                    var nameRange = new WebInspector.TextRange(lineNumber, disabledProperty.name.range.startColumn + offset,
                            lineNumber, disabledProperty.name.range.endColumn + offset);
                    var valueRange = new WebInspector.TextRange(lineNumber, disabledProperty.value.range.startColumn + offset,
                            lineNumber, disabledProperty.value.range.endColumn + offset);
                    var name = new WebInspector.SASSSupport.TextNode(document, disabledProperty.name.text, nameRange);
                    var value = new WebInspector.SASSSupport.TextNode(document, disabledProperty.value.text, valueRange);
                    var range = new WebInspector.TextRange(lineNumber, column, lineNumber, newColumn);
                    var property = new WebInspector.SASSSupport.Property(document, name, value, range, true);
                    properties.push(property);
                }
            } else if (tokenType["css-def"] && tokenValue === "@media") {
                state = States.Media;
            }
            break;
        case States.VariableName:
            if (tokenValue === ")" && tokenType === UndefTokenType) {
                state = States.Initial;
            } else if (tokenValue === ":" && tokenType === UndefTokenType) {
                state = States.VariableValue;
                variableValue = new WebInspector.SASSSupport.TextNode(document, "", WebInspector.TextRange.createFromLocation(lineNumber, newColumn));
            } else if (tokenType !== UndefTokenType) {
                state = States.Initial;
            }
            break;
        case States.VariableValue:
            if (tokenValue === ";" && tokenType === UndefTokenType) {
                variableValue.range.endLine = lineNumber;
                variableValue.range.endColumn = column;
                var variable = new WebInspector.SASSSupport.Property(document, variableName, variableValue, variableName.range.clone(), false);
                variable.range.endLine = lineNumber;
                variable.range.endColumn = newColumn;
                variables.push(variable);
                state = States.Initial;
            } else {
                variableValue.text += tokenValue;
            }
            break;
        case States.PropertyName:
            if (tokenValue === ":" && tokenType === UndefTokenType) {
                state = States.PropertyValue;
                propertyName.range.endLine = lineNumber;
                propertyName.range.endColumn = column;
                propertyValue = new WebInspector.SASSSupport.TextNode(document, "", WebInspector.TextRange.createFromLocation(lineNumber, newColumn));
            } else if (tokenType["css-property"]) {
                propertyName.text += tokenValue;
            }
            break;
        case States.PropertyValue:
            if ((tokenValue === "}" || tokenValue === ";") && tokenType === UndefTokenType) {
                propertyValue.range.endLine = lineNumber;
                propertyValue.range.endColumn = column;
                var property = new WebInspector.SASSSupport.Property(document, propertyName, propertyValue, propertyName.range.clone(), false);
                property.range.endLine = lineNumber;
                property.range.endColumn = newColumn;
                properties.push(property);
                state = States.Initial;
            } else {
                propertyValue.text += tokenValue;
            }
            break;
        case States.MixinName:
            if (tokenValue === "(" && tokenType === UndefTokenType) {
                state = States.MixinValue;
                mixinName.range.endLine = lineNumber;
                mixinName.range.endColumn = column;
                mixinValue = new WebInspector.SASSSupport.TextNode(document, "", WebInspector.TextRange.createFromLocation(lineNumber, newColumn));
            } else if (tokenValue === ";" && tokenType === UndefTokenType) {
                state = States.Initial;
                mixinValue = null;
            } else {
                mixinName.text += tokenValue;
            }
            break;
        case States.MixinValue:
            if (tokenValue === ")" && tokenType === UndefTokenType) {
                mixinValue.range.endLine = lineNumber;
                mixinValue.range.endColumn = column;
                var mixin = new WebInspector.SASSSupport.Property(document, mixinName, /** @type {!WebInspector.SASSSupport.TextNode} */(mixinValue), mixinName.range.clone(), false);
                mixin.range.endLine = lineNumber;
                mixin.range.endColumn = newColumn;
                mixins.push(mixin);
                state = States.Initial;
            } else {
                mixinValue.text += tokenValue;
            }
            break;
        case States.Media:
            if (tokenValue === "{" && tokenType === UndefTokenType)
                state = States.Initial;
            break;
        default:
            console.assert(false, "Unknown SASS parser state.");
        }
    }
    var tokenizer = tokenizerFactory.createTokenizer("text/x-scss");
    var lineNumber;
    for (lineNumber = 0; lineNumber < lines.length; ++lineNumber) {
        var line = lines[lineNumber];
        tokenizer(line, processToken);
        processToken("\n", null, line.length, line.length + 1);
    }
    return {
        variables: variables,
        properties: properties,
        mixins: mixins
    };
}

/**
 * @constructor
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 */
WebInspector.SASSSupport.Node = function(document)
{
    this.document = document;
}

/**
 * @constructor
 * @extends {WebInspector.SASSSupport.Node}
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {string} text
 * @param {!WebInspector.TextRange} range
 */
WebInspector.SASSSupport.TextNode = function(document, text, range)
{
    WebInspector.SASSSupport.Node.call(this, document);
    this.text = text;
    this.range = range;
}

WebInspector.SASSSupport.TextNode.prototype = {
    /**
     * @return {!WebInspector.SASSSupport.TextNode}
     */
    clone: function()
    {
        return new WebInspector.SASSSupport.TextNode(this.document, this.text, this.range.clone());
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSSupport.Node}
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {!WebInspector.SASSSupport.TextNode} name
 * @param {!WebInspector.SASSSupport.TextNode} value
 * @param {!WebInspector.TextRange} range
 * @param {boolean} disabled
 */
WebInspector.SASSSupport.Property = function(document, name, value, range, disabled)
{
    WebInspector.SASSSupport.Node.call(this, document);
    this.name = name;
    this.value = value;
    this.range = range;
    this.name.parent = this;
    this.value.parent = this;
    this.disabled = disabled;
}

WebInspector.SASSSupport.Property.prototype = {
    /**
     * @return {!WebInspector.SASSSupport.Property}
     */
    clone: function()
    {
        return new WebInspector.SASSSupport.Property(this.document, this.name.clone(), this.value.clone(), this.range.clone(), this.disabled);
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSSupport.Node}
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {string} selector
 * @param {!Array<!WebInspector.SASSSupport.Property>} properties
 */
WebInspector.SASSSupport.Rule = function(document, selector, properties)
{
    WebInspector.SASSSupport.Node.call(this, document);
    this.selector = selector;
    this.properties = properties;
    for (var i = 0; i < this.properties.length; ++i)
        this.properties[i].parent = this;
}

WebInspector.SASSSupport.Rule.prototype = {
    /**
     * @return {!WebInspector.SASSSupport.Rule}
     */
    clone: function()
    {
        var properties = [];
        for (var i = 0; i < this.properties.length; ++i)
            properties.push(this.properties[i].clone());
        return new WebInspector.SASSSupport.Rule(this.document, this.selector, properties);
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSSupport.Node}
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {!Array<!WebInspector.SASSSupport.Rule>} rules
 */
WebInspector.SASSSupport.AST = function(document, rules)
{
    WebInspector.SASSSupport.Node.call(this, document);
    this.rules = rules;
    for (var i = 0; i < rules.length; ++i)
        rules[i].parent = this;
}

WebInspector.SASSSupport.AST.prototype = {
    /**
     * @return {!WebInspector.SASSSupport.AST}
     */
    clone: function()
    {
        var rules = [];
        for (var i = 0; i < this.rules.length; ++i)
            rules.push(this.rules[i].clone());
        return new WebInspector.SASSSupport.AST(this.document, rules);
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

