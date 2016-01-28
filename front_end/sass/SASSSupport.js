// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SASSSupport = {}

/**
 * @param {!WebInspector.CSSParser} parser
 * @param {string} url
 * @param {string} text
 * @return {!Promise<!WebInspector.SASSSupport.AST>}
 */
WebInspector.SASSSupport.parseCSS = function(parser, url, text)
{
    return parser.parsePromise(text)
        .then(onParsed);

    /**
     * @param {!Array.<!WebInspector.CSSParser.Rule>} parsedCSS
     * @return {!WebInspector.SASSSupport.AST}
     */
    function onParsed(parsedCSS)
    {
        var document = new WebInspector.SASSSupport.ASTDocument(url, text);
        var rules = [];
        for (var i = 0; i < parsedCSS.length; ++i) {
            var rule = parsedCSS[i];
            if (!rule.properties)
                continue;
            var properties = [];
            for (var j = 0; j < rule.properties.length; ++j) {
                var cssProperty = rule.properties[j];
                var name = new WebInspector.SASSSupport.TextNode(document, cssProperty.name, WebInspector.TextRange.fromObject(cssProperty.nameRange));
                var value = new WebInspector.SASSSupport.TextNode(document, cssProperty.value, WebInspector.TextRange.fromObject(cssProperty.valueRange));
                var property = new WebInspector.SASSSupport.Property(document, name, value, WebInspector.TextRange.fromObject(cssProperty.range), !!cssProperty.disabled);
                properties.push(property);
            }
            rules.push(new WebInspector.SASSSupport.Rule(document, rule.selectorText, properties));
        }
        return new WebInspector.SASSSupport.AST(document, rules);
    }
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
 * @param {string} url
 * @param {string} text
 */
WebInspector.SASSSupport.ASTDocument = function(url, text)
{
    this.url = url;
    this.text = text;
    this.edits = [];
}

WebInspector.SASSSupport.ASTDocument.prototype = {
    /**
     * @return {!WebInspector.SASSSupport.ASTDocument}
     */
    clone: function()
    {
        return new WebInspector.SASSSupport.ASTDocument(this.url, this.text);
    },

    /**
     * @return {string}
     */
    newText: function()
    {
        this.edits.stableSort(sequentialOrder);
        var text = this.text;
        for (var i = this.edits.length - 1; i >= 0; --i)
            text = this.edits[i].applyToText(text);
        return text;

        /**
         * @param {!WebInspector.SourceEdit} edit1
         * @param {!WebInspector.SourceEdit} edit2
         * @return {number}
         */
        function sequentialOrder(edit1, edit2)
        {
            var range1 = edit1.oldRange.collapseToStart();
            var range2 = edit2.oldRange.collapseToStart();
            if (range1.equal(range2))
                return 0;
            return range1.follows(range2) ? 1 : -1;
        }
    },
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
     * @param {string} newText
     */
    setText: function(newText)
    {
        if (this.text === newText)
            return;
        this.text = newText;
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, this.range, this.text, newText));
    },

    /**
     * @param {!WebInspector.SASSSupport.ASTDocument} document
     * @return {!WebInspector.SASSSupport.TextNode}
     */
    clone: function(document)
    {
        return new WebInspector.SASSSupport.TextNode(document, this.text, this.range.clone());
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
     * @param {!WebInspector.SASSSupport.ASTDocument} document
     * @return {!WebInspector.SASSSupport.Property}
     */
    clone: function(document)
    {
        return new WebInspector.SASSSupport.Property(document, this.name.clone(document), this.value.clone(document), this.range.clone(), this.disabled);
    },

    /**
     * @param {function(!WebInspector.SASSSupport.Node)} callback
     */
    visit: function(callback)
    {
        callback(this);
        callback(this.name);
        callback(this.value);
    },

    /**
     * @param {boolean} disabled
     */
    setDisabled: function(disabled)
    {
        if (this.disabled === disabled)
            return;
        this.disabled = disabled;
        if (disabled) {
            var oldRange1 = WebInspector.TextRange.createFromLocation(this.range.startLine, this.range.startColumn);
            var edit1 = new WebInspector.SourceEdit(this.document.url, oldRange1, "", "/* ");
            var oldRange2 = WebInspector.TextRange.createFromLocation(this.range.endLine, this.range.endColumn);
            var edit2 = new WebInspector.SourceEdit(this.document.url, oldRange2, "", " */");
            this.document.edits.push(edit1, edit2);
            return;
        }
        var oldRange1 = new WebInspector.TextRange(this.range.startLine, this.range.startColumn, this.range.startLine, this.name.range.startColumn);
        var text = this.document.text;
        var edit1 = new WebInspector.SourceEdit(this.document.url, oldRange1, oldRange1.extract(text), "");
        var oldRange2 = new WebInspector.TextRange(this.range.endLine, this.range.endColumn - 2, this.range.endLine, this.range.endColumn);
        var edit2 = new WebInspector.SourceEdit(this.document.url, oldRange2, "*/", "");
        this.document.edits.push(edit1, edit2);
    },

    remove: function()
    {
        console.assert(this.parent);
        var rule = this.parent;
        var index = rule.properties.indexOf(this);
        rule.properties.splice(index, 1);
        this.parent = null;

        var lineRange = new WebInspector.TextRange(this.range.startLine, 0, this.range.endLine + 1, 0);
        var oldRange;
        if (lineRange.extract(this.document.text).trim() === this.range.extract(this.document.text).trim())
            oldRange = lineRange;
        else
            oldRange = this.range;
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, oldRange, oldRange.extract(this.document.text), ""));
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

    this._hasTrailingSemicolon = !this.properties.length || this.properties.peekLast().range.extract(this.document.text).endsWith(";");
}

WebInspector.SASSSupport.Rule.prototype = {
    /**
     * @param {!WebInspector.SASSSupport.ASTDocument} document
     * @return {!WebInspector.SASSSupport.Rule}
     */
    clone: function(document)
    {
        var properties = [];
        for (var i = 0; i < this.properties.length; ++i)
            properties.push(this.properties[i].clone(document));
        return new WebInspector.SASSSupport.Rule(document, this.selector, properties);
    },

    /**
     * @param {function(!WebInspector.SASSSupport.Node)} callback
     */
    visit: function(callback)
    {
        callback(this);
        for (var i = 0; i < this.properties.length; ++i)
            this.properties[i].visit(callback);
    },

    _addTrailingSemicolon: function()
    {
        if (this._hasTrailingSemicolon || !this.properties)
            return;
        this._hasTrailingSemicolon = true;
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, this.properties.peekLast().range.collapseToEnd(), "", ";"))
    },

    /**
     * @param {string} nameText
     * @param {string} valueText
     * @param {boolean} disabled
     * @param {!WebInspector.SASSSupport.Property} anchorProperty
     * @param {boolean} insertBefore
     * @return {!WebInspector.SASSSupport.Property}
     */
    insertProperty: function(nameText, valueText, disabled, anchorProperty, insertBefore)
    {
        console.assert(this.properties.length, "Cannot insert in empty rule.");

        this._addTrailingSemicolon();

        var name = new WebInspector.SASSSupport.TextNode(this.document, nameText, WebInspector.TextRange.createFromLocation(10, 0));
        var value = new WebInspector.SASSSupport.TextNode(this.document, valueText, WebInspector.TextRange.createFromLocation(10, 0));
        var newProperty = new WebInspector.SASSSupport.Property(this.document, name, value, WebInspector.TextRange.createFromLocation(10, 0), disabled);

        var index = this.properties.indexOf(anchorProperty);
        this.properties.splice(insertBefore ? index : index + 1, 0, newProperty);
        newProperty.parent = this;

        var oldRange = insertBefore ? anchorProperty.range.collapseToStart() : anchorProperty.range.collapseToEnd();
        var indent = (new WebInspector.TextRange(anchorProperty.range.startLine, 0, anchorProperty.range.startLine, anchorProperty.range.startColumn)).extract(this.document.text);
        if (!/^\s+$/.test(indent)) indent = "";

        var newText = "";
        var leftComment = disabled ? "/* " : "";
        var rightComment = disabled ? " */" : "";

        if (insertBefore) {
            newText = String.sprintf("%s%s: %s;%s\n%s", leftComment, newProperty.name.text, newProperty.value.text, rightComment, indent);
        } else {
            newText = String.sprintf("\n%s%s%s: %s;%s", indent, leftComment, newProperty.name.text, newProperty.value.text, rightComment);
        }
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, oldRange, "", newText));
        return newProperty;
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
        var document = this.document.clone();
        var rules = [];
        for (var i = 0; i < this.rules.length; ++i)
            rules.push(this.rules[i].clone(document));
        return new WebInspector.SASSSupport.AST(document, rules);
    },

    /**
     * @param {function(!WebInspector.SASSSupport.Node)} callback
     */
    visit: function(callback)
    {
        callback(this);
        for (var i = 0; i < this.rules.length; ++i)
            this.rules[i].visit(callback);
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.SASSSupport.TextNode}
     */
    findNodeForPosition: function(lineNumber, columnNumber)
    {
        var result = null;
        this.visit(onNode);
        return result;

        /**
         * @param {!WebInspector.SASSSupport.Node} node
         */
        function onNode(node)
        {
            if (!(node instanceof WebInspector.SASSSupport.TextNode))
                return;
            if (node.range.containsLocation(lineNumber, columnNumber))
                result = node;
        }
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

/** @enum {string} */
WebInspector.SASSSupport.PropertyChangeType = {
    PropertyAdded: "PropertyAdded",
    PropertyRemoved: "PropertyRemoved",
    PropertyToggled: "PropertyToggled",
    ValueChanged: "ValueChanged",
    NameChanged: "NameChanged"
}

/**
 * @constructor
 * @param {!WebInspector.SASSSupport.PropertyChangeType} type
 * @param {!WebInspector.SASSSupport.Rule} oldRule
 * @param {!WebInspector.SASSSupport.Rule} newRule
 * @param {number} oldPropertyIndex
 * @param {number} newPropertyIndex
 */
WebInspector.SASSSupport.PropertyChange = function(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex)
{
    this.type = type;
    this.oldRule = oldRule;
    this.newRule = newRule;
    this.oldPropertyIndex = oldPropertyIndex;
    this.newPropertyIndex = newPropertyIndex;
}

/**
 * @constructor
 * @param {string} url
 * @param {!WebInspector.SASSSupport.AST} oldAST
 * @param {!WebInspector.SASSSupport.AST} newAST
 * @param {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} mapping
 * @param {!Array<!WebInspector.SASSSupport.PropertyChange>} changes
 */
WebInspector.SASSSupport.ASTDiff = function(url, oldAST, newAST, mapping, changes)
{
    this.url = url;
    this.mapping = mapping;
    this.changes = changes;
    this.oldAST = oldAST;
    this.newAST = newAST;
}

/**
 * @param {!WebInspector.SASSSupport.AST} oldAST
 * @param {!WebInspector.SASSSupport.AST} newAST
 * @return {!WebInspector.SASSSupport.ASTDiff}
 */
WebInspector.SASSSupport.diffModels = function(oldAST, newAST)
{
    console.assert(oldAST.rules.length === newAST.rules.length, "Not implemented for rule diff.");
    console.assert(oldAST.document.url === newAST.document.url, "Diff makes sense for models with the same url.");
    var T = WebInspector.SASSSupport.PropertyChangeType;
    var changes = [];
    /** @type {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} */
    var mapping = new Map();
    for (var i = 0; i < oldAST.rules.length; ++i) {
        var oldRule = oldAST.rules[i];
        var newRule = newAST.rules[i];
        computeRuleDiff(mapping, oldRule, newRule);
    }
    return new WebInspector.SASSSupport.ASTDiff(oldAST.document.url, oldAST, newAST, mapping, changes);

    /**
     * @param {!WebInspector.SASSSupport.PropertyChangeType} type
     * @param {!WebInspector.SASSSupport.Rule} oldRule
     * @param {!WebInspector.SASSSupport.Rule} newRule
     * @param {number} oldPropertyIndex
     * @param {number} newPropertyIndex
     */
    function addChange(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex)
    {
        changes.push(new WebInspector.SASSSupport.PropertyChange(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex));
    }

    /**
     * @param {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} mapping
     * @param {!WebInspector.SASSSupport.Rule} oldRule
     * @param {!WebInspector.SASSSupport.Rule} newRule
     */
    function computeRuleDiff(mapping, oldRule, newRule)
    {
        var oldLines = [];
        for (var i = 0; i < oldRule.properties.length; ++i)
            oldLines.push(oldRule.properties[i].name.text.trim() + ":" + oldRule.properties[i].value.text.trim());
        var newLines = [];
        for (var i = 0; i < newRule.properties.length; ++i)
            newLines.push(newRule.properties[i].name.text.trim() + ":" + newRule.properties[i].value.text.trim());
        var diff = WebInspector.Diff.lineDiff(oldLines, newLines);
        diff = WebInspector.Diff.convertToEditDiff(diff);

        var p1 = 0, p2 = 0;
        for (var i = 0; i < diff.length; ++i) {
            var token = diff[i];
            if (token[0] === WebInspector.Diff.Operation.Delete) {
                for (var j = 0; j < token[1]; ++j)
                    addChange(T.PropertyRemoved, oldRule, newRule, p1++, p2);
            } else if (token[0] === WebInspector.Diff.Operation.Insert) {
                for (var j = 0; j < token[1]; ++j)
                    addChange(T.PropertyAdded, oldRule, newRule, p1, p2++);
            } else {
                for (var j = 0; j < token[1]; ++j)
                    computePropertyDiff(mapping, oldRule, newRule, p1++, p2++);
            }
        }
    }

    /**
     * @param {!Map<!WebInspector.SASSSupport.TextNode, !WebInspector.SASSSupport.TextNode>} mapping
     * @param {!WebInspector.SASSSupport.Rule} oldRule
     * @param {!WebInspector.SASSSupport.Rule} newRule
     * @param {number} oldPropertyIndex
     * @param {number} newPropertyIndex
     */
    function computePropertyDiff(mapping, oldRule, newRule, oldPropertyIndex, newPropertyIndex)
    {
        var oldProperty = oldRule.properties[oldPropertyIndex];
        var newProperty = newRule.properties[newPropertyIndex];
        mapping.set(oldProperty.name, newProperty.name);
        mapping.set(oldProperty.value, newProperty.value);
        if (oldProperty.name.text.trim() !== newProperty.name.text.trim())
            addChange(T.NameChanged, oldRule, newRule, oldPropertyIndex, newPropertyIndex);
        if (oldProperty.value.text.trim() !== newProperty.value.text.trim())
            addChange(T.ValueChanged, oldRule, newRule, oldPropertyIndex, newPropertyIndex);
        if (oldProperty.disabled !== newProperty.disabled)
            addChange(T.PropertyToggled, oldRule, newRule, oldPropertyIndex, newPropertyIndex);
    }
}
