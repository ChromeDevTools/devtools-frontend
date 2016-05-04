// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SASSSupport = {}

/**
 * @param {string} url
 * @param {string} content
 * @return {!Promise<!WebInspector.SASSSupport.AST>}
 */
WebInspector.SASSSupport.parseSCSS = function(url, content)
{
    var text = new WebInspector.Text(content);
    var document = new WebInspector.SASSSupport.ASTDocument(url, text);

    return WebInspector.formatterWorkerPool.runTask("parseSCSS", {content: content}).then(onParsed);

    /**
     * @param {?MessageEvent} event
     * @return {!WebInspector.SASSSupport.AST}
     */
    function onParsed(event)
    {
        if (!event)
            return new WebInspector.SASSSupport.AST(document, []);
        var data = /** @type {!Array<!Object>} */(event.data);
        var rules = [];
        for (var i = 0; i < data.length; ++i) {
            var rulePayload = data[i];
            var selectorText = "";
            if (rulePayload.selectors.length) {
                var first = rulePayload.selectors[0];
                var last = rulePayload.selectors.peekLast();
                var selectorRange = new WebInspector.TextRange(first.startLine, first.startColumn, last.endLine, last.endColumn);
                selectorText = text.extract(selectorRange);
            }
            var properties = rulePayload.properties.map(createProperty);
            var range = WebInspector.TextRange.fromObject(rulePayload.styleRange);
            var rule = new WebInspector.SASSSupport.Rule(document, selectorText, range, properties);
            rules.push(rule);
        }
        return new WebInspector.SASSSupport.AST(document, rules);
    }

    /**
     * @param {!Object} payload
     */
    function createTextNode(payload)
    {
        var range = WebInspector.TextRange.fromObject(payload);
        var value = text.extract(range);
        return new WebInspector.SASSSupport.TextNode(document, text.extract(range), range);
    }

    /**
     * @param {!Object} payload
     */
    function createProperty(payload)
    {
        var name = createTextNode(payload.name);
        var value = createTextNode(payload.value);
        return new WebInspector.SASSSupport.Property(document, name, value, WebInspector.TextRange.fromObject(payload.range), payload.disabled);
    }
}

/**
 * @constructor
 * @param {string} url
 * @param {!WebInspector.Text} text
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
     * @return {boolean}
     */
    hasChanged: function()
    {
        return !!this.edits.length;
    },

    /**
     * @return {!WebInspector.Text}
     */
    newText: function()
    {
        this.edits.stableSort(sequentialOrder);
        var text = this.text;
        for (var i = this.edits.length - 1; i >= 0; --i) {
            var range = this.edits[i].oldRange;
            var newText = this.edits[i].newText;
            text = new WebInspector.Text(text.replaceRange(range, newText));
        }
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
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, this.range, newText));
    },

    /**
     * @param {!WebInspector.SASSSupport.ASTDocument} document
     * @return {!WebInspector.SASSSupport.TextNode}
     */
    clone: function(document)
    {
        return new WebInspector.SASSSupport.TextNode(document, this.text, this.range.clone());
    },

    /**
     * @param {!WebInspector.SASSSupport.TextNode} other
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>=} outNodeMapping
     * @return {boolean}
     */
    match: function(other, outNodeMapping)
    {
        if (this.text.trim() !== other.text.trim())
            return false;
        if (outNodeMapping)
            outNodeMapping.set(this, other);
        return true;
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
     * @param {!WebInspector.SASSSupport.Property} other
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>=} outNodeMapping
     * @return {boolean}
     */
    match: function(other, outNodeMapping)
    {
        if (this.disabled !== other.disabled)
            return false;
        if (outNodeMapping)
            outNodeMapping.set(this, other);
        return this.name.match(other.name, outNodeMapping) && this.value.match(other.value, outNodeMapping);
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
            var edit1 = new WebInspector.SourceEdit(this.document.url, oldRange1, "/* ");
            var oldRange2 = WebInspector.TextRange.createFromLocation(this.range.endLine, this.range.endColumn);
            var edit2 = new WebInspector.SourceEdit(this.document.url, oldRange2, " */");
            this.document.edits.push(edit1, edit2);
            return;
        }
        var oldRange1 = new WebInspector.TextRange(this.range.startLine, this.range.startColumn, this.range.startLine, this.name.range.startColumn);
        var edit1 = new WebInspector.SourceEdit(this.document.url, oldRange1, "");
        var oldRange2 = new WebInspector.TextRange(this.range.endLine, this.range.endColumn - 2, this.range.endLine, this.range.endColumn);
        var edit2 = new WebInspector.SourceEdit(this.document.url, oldRange2, "");
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
        if (this.document.text.extract(lineRange).trim() === this.document.text.extract(this.range).trim())
            oldRange = lineRange;
        else
            oldRange = this.range;
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, oldRange, ""));
    },

    __proto__: WebInspector.SASSSupport.Node.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSSupport.Node}
 * @param {!WebInspector.SASSSupport.ASTDocument} document
 * @param {string} selector
 * @param {!WebInspector.TextRange} styleRange
 * @param {!Array<!WebInspector.SASSSupport.Property>} properties
 */
WebInspector.SASSSupport.Rule = function(document, selector, styleRange, properties)
{
    WebInspector.SASSSupport.Node.call(this, document);
    this.selector = selector;
    this.properties = properties;
    this.styleRange = styleRange;
    for (var i = 0; i < this.properties.length; ++i)
        this.properties[i].parent = this;

    this._hasTrailingSemicolon = !this.properties.length || this.document.text.extract(this.properties.peekLast().range).endsWith(";");
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
        return new WebInspector.SASSSupport.Rule(document, this.selector, this.styleRange.clone(), properties);
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

    /**
     * @param {!WebInspector.SASSSupport.Rule} other
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>=} outNodeMapping
     * @return {boolean}
     */
    match: function(other, outNodeMapping)
    {
        if (this.selector !== other.selector)
            return false;
        if (this.properties.length !== other.properties.length)
            return false;
        if (outNodeMapping)
            outNodeMapping.set(this, other);
        var result = true;
        for (var i = 0; result && i < this.properties.length; ++i)
            result = result && this.properties[i].match(other.properties[i], outNodeMapping);
        return result;
    },

    _addTrailingSemicolon: function()
    {
        if (this._hasTrailingSemicolon || !this.properties)
            return;
        this._hasTrailingSemicolon = true;
        this.document.edits.push(new WebInspector.SourceEdit(this.document.url, this.properties.peekLast().range.collapseToEnd(), ";"))
    },

    /**
     * @param {!Array<string>} nameTexts
     * @param {!Array<string>} valueTexts
     * @param {!Array<boolean>} disabledStates
     * @param {!WebInspector.SASSSupport.Property} anchorProperty
     * @param {boolean} insertBefore
     * @return {!Array<!WebInspector.SASSSupport.Property>}
     */
    insertProperties: function(nameTexts, valueTexts, disabledStates, anchorProperty, insertBefore)
    {
        console.assert(this.properties.length, "Cannot insert in empty rule.");
        console.assert(nameTexts.length === valueTexts.length && valueTexts.length === disabledStates.length, "Input array should be of the same size.");

        this._addTrailingSemicolon();
        var newProperties = [];
        var index = this.properties.indexOf(anchorProperty);
        for (var i = 0; i < nameTexts.length; ++i) {
            var nameText = nameTexts[i];
            var valueText = valueTexts[i];
            var disabled = disabledStates[i];
            this.document.edits.push(this._insertPropertyEdit(nameText, valueText, disabled, anchorProperty, insertBefore));

            var name = new WebInspector.SASSSupport.TextNode(this.document, nameText, WebInspector.TextRange.createFromLocation(0, 0));
            var value = new WebInspector.SASSSupport.TextNode(this.document, valueText, WebInspector.TextRange.createFromLocation(0, 0));
            var newProperty = new WebInspector.SASSSupport.Property(this.document, name, value, WebInspector.TextRange.createFromLocation(0, 0), disabled);

            this.properties.splice(insertBefore ? index + i : index + i + 1, 0, newProperty);
            newProperty.parent = this;

            newProperties.push(newProperty);
        }
        return newProperties;
    },

    /**
     * @param {string} nameText
     * @param {string} valueText
     * @param {boolean} disabled
     * @param {!WebInspector.SASSSupport.Property} anchorProperty
     * @param {boolean} insertBefore
     * @return {!WebInspector.SourceEdit}
     */
    _insertPropertyEdit: function(nameText, valueText, disabled, anchorProperty, insertBefore)
    {
        var oldRange = insertBefore ? anchorProperty.range.collapseToStart() : anchorProperty.range.collapseToEnd();
        var indent = this.document.text.extract(new WebInspector.TextRange(anchorProperty.range.startLine, 0, anchorProperty.range.startLine, anchorProperty.range.startColumn));
        if (!/^\s+$/.test(indent)) indent = "";

        var newText = "";
        var leftComment = disabled ? "/* " : "";
        var rightComment = disabled ? " */" : "";

        if (insertBefore) {
            newText = String.sprintf("%s%s: %s;%s\n%s", leftComment, nameText, valueText, rightComment, indent);
        } else {
            newText = String.sprintf("\n%s%s%s: %s;%s", indent, leftComment, nameText, valueText, rightComment);
        }
        return new WebInspector.SourceEdit(this.document.url, oldRange, newText);
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
     * @param {!WebInspector.SASSSupport.AST} other
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>=} outNodeMapping
     * @return {boolean}
     */
    match: function(other, outNodeMapping)
    {
        if (other.document.url !== this.document.url)
            return false;
        if (other.rules.length !== this.rules.length)
            return false;
        if (outNodeMapping)
            outNodeMapping.set(this, other);
        var result = true;
        for (var i = 0; result && i < this.rules.length; ++i)
            result = result && this.rules[i].match(other.rules[i], outNodeMapping);
        return result;
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
        this._ensureNodePositionsIndex();
        var index = this._sortedTextNodes.lowerBound({lineNumber: lineNumber, columnNumber: columnNumber}, nodeComparator);
        var node = this._sortedTextNodes[index];
        if (!node)
            return null;
        return node.range.containsLocation(lineNumber, columnNumber) ? node : null;

        /**
         * @param {!{lineNumber: number, columnNumber: number}} position
         * @param {!WebInspector.SASSSupport.TextNode} textNode
         * @return {number}
         */
        function nodeComparator(position, textNode)
        {
            return textNode.range.compareToPosition(position.lineNumber, position.columnNumber);
        }
    },

    _ensureNodePositionsIndex: function()
    {
        if (this._sortedTextNodes)
            return;
        this._sortedTextNodes = [];
        this.visit(onNode.bind(this));
        this._sortedTextNodes.sort(nodeComparator);

        /**
         * @param {!WebInspector.SASSSupport.Node} node
         * @this {WebInspector.SASSSupport.AST}
         */
        function onNode(node)
        {
            if (!(node instanceof WebInspector.SASSSupport.TextNode))
                return;
            this._sortedTextNodes.push(node);
        }

        /**
         * @param {!WebInspector.SASSSupport.TextNode} text1
         * @param {!WebInspector.SASSSupport.TextNode} text2
         * @return {number}
         */
        function nodeComparator(text1, text2)
        {
            return WebInspector.TextRange.comparator(text1.range, text2.range);
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

WebInspector.SASSSupport.PropertyChange.prototype = {
    /**
     * @return {?WebInspector.SASSSupport.Property}
     */
    oldProperty: function()
    {
        return this.oldRule.properties[this.oldPropertyIndex] || null;
    },

    /**
     * @return {?WebInspector.SASSSupport.Property}
     */
    newProperty: function()
    {
        return this.newRule.properties[this.newPropertyIndex] || null;
    }
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
