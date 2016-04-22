// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.ASTService} astService
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!Array<!WebInspector.SASSProcessor.EditOperation>} editOperations
 */
WebInspector.SASSProcessor = function(astService, map, editOperations)
{
    this._astService = astService;
    this._map = map;
    this._editOperations = editOperations;
}

WebInspector.SASSProcessor.prototype = {
    /**
     * @return {!Promise<?WebInspector.SourceMap.EditResult>}
     */
    _mutate: function()
    {
        /** @type {!Set<!WebInspector.SASSSupport.Rule>} */
        var changedCSSRules = new Set();
        for (var editOperation of this._editOperations) {
            var rules = editOperation.perform();
            changedCSSRules.addAll(rules);
        }

        // Reparse new texts, make sure changes result in anticipated AST trees.
        var promises = [];
        for (var ast of this._map.models().values()) {
            if (!ast.document.hasChanged())
                continue;
            var promise;
            if (ast.document.url === this._map.compiledURL())
                promise = this._astService.parseCSS(ast.document.url, ast.document.newText().value());
            else
                promise = this._astService.parseSCSS(ast.document.url, ast.document.newText().value());
            promises.push(promise);
        }

        return Promise.all(promises)
            .then(this._onFinished.bind(this, changedCSSRules));
    },

    /**
     * @param {!Set<!WebInspector.SASSSupport.Rule>} changedCSSRules
     * @param {!Array<!WebInspector.SASSSupport.AST>} changedModels
     * @return {?WebInspector.SourceMap.EditResult}
     */
    _onFinished: function(changedCSSRules, changedModels)
    {
        var nodeMapping = new Map();
        var map = this._map.rebase(changedModels, nodeMapping);
        if (!map)
            return null;

        var cssEdits = [];
        for (var rule of changedCSSRules) {
            var oldRange = rule.styleRange;
            var newRule = nodeMapping.get(rule);
            var newText = newRule.document.text.extract(newRule.styleRange);
            cssEdits.push(new WebInspector.SourceEdit(newRule.document.url, oldRange, newText));
        }

        /** @type {!Map<string, string>} */
        var newSASSSources = new Map();
        for (var model of changedModels) {
            if (model.document.url === map.compiledURL())
                continue;
            newSASSSources.set(model.document.url, model.document.text.value());
        }
        return new WebInspector.SourceMap.EditResult(map, cssEdits, newSASSSources);
    }
}

/**
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.Property} cssProperty
 * @return {?WebInspector.SASSSupport.Property}
 */
WebInspector.SASSProcessor._toSASSProperty = function(map, cssProperty)
{
    var sassName = map.toSourceNode(cssProperty.name);
    return sassName ? sassName.parent : null;
}

/**
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.Property} sassProperty
 * @return {!Array<!WebInspector.SASSSupport.Property>}
 */
WebInspector.SASSProcessor._toCSSProperties = function(map, sassProperty)
{
    return map.toCompiledNodes(sassProperty.name).map(name => name.parent);
}

/**
 * @param {!WebInspector.ASTService} astService
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!Array<!WebInspector.TextRange>} ranges
 * @param {!Array<string>} newTexts
 * @return {!Promise<?WebInspector.SourceMap.EditResult>}
 */
WebInspector.SASSProcessor.processCSSEdits = function(astService, map, ranges, newTexts)
{
    console.assert(ranges.length === newTexts.length);
    var cssURL = map.compiledURL();
    var cssText = map.compiledModel().document.text;
    for (var i = 0; i < ranges.length; ++i)
        cssText = new WebInspector.Text(cssText.replaceRange(ranges[i], newTexts[i]));
    return astService.parseCSS(cssURL, cssText.value())
        .then(onCSSParsed);

    /**
     * @param {!WebInspector.SASSSupport.AST} newCSSAST
     * @return {!Promise<?WebInspector.SourceMap.EditResult>}
     */
    function onCSSParsed(newCSSAST)
    {
        if (newCSSAST.rules.length !== map.compiledModel().rules.length)
            return Promise.resolve(/** @type {?WebInspector.SourceMap.EditResult} */(null));
        // TODO(lushnikov): only diff changed styles.
        var cssDiff = WebInspector.SASSSupport.diffModels(map.compiledModel(), newCSSAST);
        var edits = WebInspector.SASSProcessor._editsFromCSSDiff(cssDiff, map);

        // Determine AST trees which will change and clone them.
        var changedURLs = new Set(edits.map(edit => edit.sassURL));
        changedURLs.add(map.compiledURL());
        var clonedModels = [];
        for (var url of changedURLs)
            clonedModels.push(map.modelForURL(url).clone());

        // Rebase map and edits onto a cloned AST trees.
        var nodeMapping = new Map();
        var rebasedMap = /** @type {!WebInspector.ASTSourceMap} */(map.rebase(clonedModels, nodeMapping));
        console.assert(rebasedMap);
        var rebasedEdits = edits.map(edit => edit.rebase(rebasedMap, nodeMapping));

        return new WebInspector.SASSProcessor(astService, rebasedMap, rebasedEdits)._mutate();
    }
}

/**
 * @param {!WebInspector.SASSSupport.ASTDiff} cssDiff
 * @param {!WebInspector.ASTSourceMap} map
 * @return {!Array<!WebInspector.SASSProcessor.EditOperation>}
 */
WebInspector.SASSProcessor._editsFromCSSDiff = function(cssDiff, map)
{
    var T = WebInspector.SASSSupport.PropertyChangeType;
    var operations = [];
    for (var i = 0; i < cssDiff.changes.length; ++i) {
        var change = cssDiff.changes[i];
        var operation = null;
        if (change.type === T.ValueChanged || change.type === T.NameChanged)
            operation = WebInspector.SASSProcessor.SetTextOperation.fromCSSChange(change, map);
        else if (change.type === T.PropertyToggled)
            operation = WebInspector.SASSProcessor.TogglePropertyOperation.fromCSSChange(change, map);
        else if (change.type === T.PropertyRemoved)
            operation = WebInspector.SASSProcessor.RemovePropertyOperation.fromCSSChange(change, map);
        else if (change.type === T.PropertyAdded)
            operation = WebInspector.SASSProcessor.InsertPropertiesOperation.fromCSSChange(change, map);
        if (!operation) {
            WebInspector.console.error("Operation ignored: " + change.type);
            continue;
        }

        var merged = false;
        for (var j = 0; !merged && j < operations.length; ++j)
            merged = operations[j].merge(operation);
        if (!merged)
            operations.push(operation);
    }
    return operations;
}

/**
 * @constructor
 * @param {!WebInspector.ASTSourceMap} map
 * @param {string} sassURL
 */
WebInspector.SASSProcessor.EditOperation = function(map, sassURL)
{
    this.map = map;
    this.sassURL = sassURL;
}

WebInspector.SASSProcessor.EditOperation.prototype = {
    /**
     * @param {!WebInspector.SASSProcessor.EditOperation} other
     * @return {boolean}
     */
    merge: function(other)
    {
        return false;
    },

    /**
     * @return {!Array<!WebInspector.SASSSupport.Rule>}
     */
    perform: function()
    {
        return [];
    },

    /**
     * @param {!WebInspector.ASTSourceMap} newMap
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>} nodeMapping
     * @return {!WebInspector.SASSProcessor.EditOperation}
     */
    rebase: function(newMap, nodeMapping)
    {
        return this;
    },
}

/**
 * @constructor
 * @extends {WebInspector.SASSProcessor.EditOperation}
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.TextNode} sassNode
 * @param {string} newText
 */
WebInspector.SASSProcessor.SetTextOperation = function(map, sassNode, newText)
{
    WebInspector.SASSProcessor.EditOperation.call(this, map, sassNode.document.url);
    this._sassNode = sassNode;
    this._newText = newText;
}

/**
 * @param {!WebInspector.SASSSupport.PropertyChange} change
 * @param {!WebInspector.ASTSourceMap} map
 * @return {?WebInspector.SASSProcessor.SetTextOperation}
 */
WebInspector.SASSProcessor.SetTextOperation.fromCSSChange = function(change, map)
{
    var oldProperty = /** @type {!WebInspector.SASSSupport.Property} */(change.oldProperty());
    var newProperty = /** @type {!WebInspector.SASSSupport.Property} */(change.newProperty());
    console.assert(oldProperty && newProperty, "SetTextOperation must have both oldProperty and newProperty");
    var newValue = null;
    var sassNode = null;
    if (change.type === WebInspector.SASSSupport.PropertyChangeType.NameChanged) {
        newValue = newProperty.name.text;
        sassNode = map.toSourceNode(oldProperty.name);
    } else {
        newValue = newProperty.value.text;
        sassNode = map.toSourceNode(oldProperty.value);
    }
    if (!sassNode)
        return null;
    return new WebInspector.SASSProcessor.SetTextOperation(map, sassNode, newValue);
}

WebInspector.SASSProcessor.SetTextOperation.prototype = {
    /**
     * @override
     * @param {!WebInspector.SASSProcessor.EditOperation} other
     * @return {boolean}
     */
    merge: function(other)
    {
        if (!(other instanceof WebInspector.SASSProcessor.SetTextOperation))
            return false;
        return this._sassNode === other._sassNode;
    },

    /**
     * @override
     * @return {!Array<!WebInspector.SASSSupport.Rule>}
     */
    perform: function()
    {
        this._sassNode.setText(this._newText);
        var nodes = this.map.toCompiledNodes(this._sassNode);
        for (var node of nodes)
            node.setText(this._newText);

        var cssRules = nodes.map(textNode => textNode.parent.parent);
        return cssRules;
    },

    /**
     * @override
     * @param {!WebInspector.ASTSourceMap} newMap
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>} nodeMapping
     * @return {!WebInspector.SASSProcessor.SetTextOperation}
     */
    rebase: function(newMap, nodeMapping)
    {
        var sassNode = /** @type {?WebInspector.SASSSupport.TextNode} */(nodeMapping.get(this._sassNode)) || this._sassNode;
        return new WebInspector.SASSProcessor.SetTextOperation(newMap, sassNode, this._newText);
    },

    __proto__: WebInspector.SASSProcessor.EditOperation.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSProcessor.EditOperation}
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.Property} sassProperty
 * @param {boolean} newDisabled
 */
WebInspector.SASSProcessor.TogglePropertyOperation = function(map, sassProperty, newDisabled)
{
    WebInspector.SASSProcessor.EditOperation.call(this, map, sassProperty.document.url);
    this._sassProperty = sassProperty;
    this._newDisabled = newDisabled;
}

/**
 * @param {!WebInspector.SASSSupport.PropertyChange} change
 * @param {!WebInspector.ASTSourceMap} map
 * @return {?WebInspector.SASSProcessor.TogglePropertyOperation}
 */
WebInspector.SASSProcessor.TogglePropertyOperation.fromCSSChange = function(change, map)
{
    var oldCSSProperty = /** @type {!WebInspector.SASSSupport.Property} */(change.oldProperty());
    console.assert(oldCSSProperty, "TogglePropertyOperation must have old CSS property");
    var sassProperty = WebInspector.SASSProcessor._toSASSProperty(map, oldCSSProperty);
    if (!sassProperty)
        return null;
    var newDisabled = change.newProperty().disabled;
    return new WebInspector.SASSProcessor.TogglePropertyOperation(map, sassProperty, newDisabled);
}

WebInspector.SASSProcessor.TogglePropertyOperation.prototype = {
    /**
     * @override
     * @param {!WebInspector.SASSProcessor.EditOperation} other
     * @return {boolean}
     */
    merge: function(other)
    {
        if (!(other instanceof WebInspector.SASSProcessor.TogglePropertyOperation))
            return false;
        return this._sassProperty === other._sassProperty;
    },

    /**
     * @override
     * @return {!Array<!WebInspector.SASSSupport.Rule>}
     */
    perform: function()
    {
        this._sassProperty.setDisabled(this._newDisabled);
        var cssProperties = WebInspector.SASSProcessor._toCSSProperties(this.map, this._sassProperty);
        for (var property of cssProperties)
            property.setDisabled(this._newDisabled);

        var cssRules = cssProperties.map(property => property.parent);
        return cssRules;
    },

    /**
     * @override
     * @param {!WebInspector.ASTSourceMap} newMap
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>} nodeMapping
     * @return {!WebInspector.SASSProcessor.TogglePropertyOperation}
     */
    rebase: function(newMap, nodeMapping)
    {
        var sassProperty = /** @type {?WebInspector.SASSSupport.Property} */(nodeMapping.get(this._sassProperty)) || this._sassProperty;
        return new WebInspector.SASSProcessor.TogglePropertyOperation(newMap, sassProperty, this._newDisabled);
    },

    __proto__: WebInspector.SASSProcessor.EditOperation.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSProcessor.EditOperation}
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.Property} sassProperty
 */
WebInspector.SASSProcessor.RemovePropertyOperation = function(map, sassProperty)
{
    WebInspector.SASSProcessor.EditOperation.call(this, map, sassProperty.document.url);
    this._sassProperty = sassProperty;
}

/**
 * @param {!WebInspector.SASSSupport.PropertyChange} change
 * @param {!WebInspector.ASTSourceMap} map
 * @return {?WebInspector.SASSProcessor.RemovePropertyOperation}
 */
WebInspector.SASSProcessor.RemovePropertyOperation.fromCSSChange = function(change, map)
{
    var removedProperty = /** @type {!WebInspector.SASSSupport.Property} */(change.oldProperty());
    console.assert(removedProperty, "RemovePropertyOperation must have removed CSS property");
    var sassProperty = WebInspector.SASSProcessor._toSASSProperty(map, removedProperty);
    if (!sassProperty)
        return null;
    return new WebInspector.SASSProcessor.RemovePropertyOperation(map, sassProperty);
}

WebInspector.SASSProcessor.RemovePropertyOperation.prototype = {
    /**
     * @override
     * @param {!WebInspector.SASSProcessor.EditOperation} other
     * @return {boolean}
     */
    merge: function(other)
    {
        if (!(other instanceof WebInspector.SASSProcessor.RemovePropertyOperation))
            return false;
        return this._sassProperty === other._sassProperty;
    },

    /**
     * @override
     * @return {!Array<!WebInspector.SASSSupport.Rule>}
     */
    perform: function()
    {
        var cssProperties = WebInspector.SASSProcessor._toCSSProperties(this.map, this._sassProperty);
        var cssRules = cssProperties.map(property => property.parent);
        this._sassProperty.remove();
        for (var cssProperty of cssProperties) {
            cssProperty.remove();
            this.map.removeMapping(cssProperty.name, this._sassProperty.name);
            this.map.removeMapping(cssProperty.value, this._sassProperty.value);
        }

        return cssRules;
    },

    /**
     * @override
     * @param {!WebInspector.ASTSourceMap} newMap
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>} nodeMapping
     * @return {!WebInspector.SASSProcessor.RemovePropertyOperation}
     */
    rebase: function(newMap, nodeMapping)
    {
        var sassProperty = /** @type {?WebInspector.SASSSupport.Property} */(nodeMapping.get(this._sassProperty)) || this._sassProperty;
        return new WebInspector.SASSProcessor.RemovePropertyOperation(newMap, sassProperty);
    },

    __proto__: WebInspector.SASSProcessor.EditOperation.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SASSProcessor.EditOperation}
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!WebInspector.SASSSupport.Property} sassAnchor
 * @param {boolean} insertBefore
 * @param {!Array<string>} propertyNames
 * @param {!Array<string>} propertyValues
 * @param {!Array<boolean>} disabledStates
 */
WebInspector.SASSProcessor.InsertPropertiesOperation = function(map, sassAnchor, insertBefore, propertyNames, propertyValues, disabledStates)
{
    console.assert(propertyNames.length === propertyValues.length && propertyValues.length === disabledStates.length);
    WebInspector.SASSProcessor.EditOperation.call(this, map, sassAnchor.document.url);
    this._sassAnchor = sassAnchor;
    this._insertBefore = insertBefore;
    this._nameTexts = propertyNames;
    this._valueTexts = propertyValues;
    this._disabledStates = disabledStates;
}

/**
 * @param {!WebInspector.SASSSupport.PropertyChange} change
 * @param {!WebInspector.ASTSourceMap} map
 * @return {?WebInspector.SASSProcessor.InsertPropertiesOperation}
 */
WebInspector.SASSProcessor.InsertPropertiesOperation.fromCSSChange = function(change, map)
{
    var insertBefore = false;
    var cssAnchor = null;
    var sassAnchor = null;
    if (change.oldPropertyIndex) {
        cssAnchor = change.oldRule.properties[change.oldPropertyIndex - 1].name;
        sassAnchor = map.toSourceNode(cssAnchor);
    } else {
        insertBefore = true;
        cssAnchor = change.oldRule.properties[0].name;
        sassAnchor = map.toSourceNode(cssAnchor);
    }
    if (!sassAnchor)
        return null;
    var insertedProperty = /** @type {!WebInspector.SASSSupport.Property} */(change.newProperty());
    console.assert(insertedProperty, "InsertPropertiesOperation must have inserted CSS property");
    var names = [insertedProperty.name.text];
    var values = [insertedProperty.value.text];
    var disabledStates = [insertedProperty.disabled];
    return new WebInspector.SASSProcessor.InsertPropertiesOperation(map, sassAnchor.parent, insertBefore, names, values, disabledStates);
}

WebInspector.SASSProcessor.InsertPropertiesOperation.prototype = {
    /**
     * @override
     * @param {!WebInspector.SASSProcessor.EditOperation} other
     * @return {boolean}
     */
    merge: function(other)
    {
        if (!(other instanceof WebInspector.SASSProcessor.InsertPropertiesOperation))
            return false;
        if (this._sassAnchor !== other._sassAnchor || this._insertBefore !== other._insertBefore)
            return false;
        var names = new Set(this._nameTexts);
        for (var i = 0; i < other._nameTexts.length; ++i) {
            var nameText = other._nameTexts[i];
            if (names.has(nameText))
                continue;
            this._nameTexts.push(nameText);
            this._valueTexts.push(other._valueTexts[i]);
            this._disabledStates.push(other._disabledStates[i]);
        }
        return true;
    },

    /**
     * @override
     * @return {!Array<!WebInspector.SASSSupport.Rule>}
     */
    perform: function()
    {
        var cssRules = [];
        var sassRule = this._sassAnchor.parent;
        var newSASSProperties = sassRule.insertProperties(this._nameTexts, this._valueTexts, this._disabledStates, this._sassAnchor, this._insertBefore);
        var cssAnchors = WebInspector.SASSProcessor._toCSSProperties(this.map, this._sassAnchor);
        for (var cssAnchor of cssAnchors) {
            var cssRule = cssAnchor.parent;
            cssRules.push(cssRule);
            var newCSSProperties = cssRule.insertProperties(this._nameTexts, this._valueTexts, this._disabledStates, cssAnchor, this._insertBefore);
            for (var i = 0; i < newCSSProperties.length; ++i) {
                this.map.addMapping(newCSSProperties[i].name, newSASSProperties[i].name);
                this.map.addMapping(newCSSProperties[i].value, newSASSProperties[i].value);
            }
        }
        return cssRules;
    },

    /**
     * @override
     * @param {!WebInspector.ASTSourceMap} newMap
     * @param {!Map<!WebInspector.SASSSupport.Node, !WebInspector.SASSSupport.Node>} nodeMapping
     * @return {!WebInspector.SASSProcessor.InsertPropertiesOperation}
     */
    rebase: function(newMap, nodeMapping)
    {
        var sassAnchor = /** @type {?WebInspector.SASSSupport.Property} */(nodeMapping.get(this._sassAnchor)) || this._sassAnchor;
        return new WebInspector.SASSProcessor.InsertPropertiesOperation(newMap, sassAnchor, this._insertBefore, this._nameTexts, this._valueTexts, this._disabledStates);
    },

    __proto__: WebInspector.SASSProcessor.EditOperation.prototype
}
