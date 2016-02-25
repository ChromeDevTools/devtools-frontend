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
     * @return {!Promise<?WebInspector.SASSProcessor.Result>}
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
            if (ast.document.url === this._map.cssURL())
                promise = this._astService.parseCSS(ast.document.url, ast.document.newText());
            else
                promise = this._astService.parseSCSS(ast.document.url, ast.document.newText());
            promises.push(promise);
        }

        return Promise.all(promises)
            .then(this._onFinished.bind(this, changedCSSRules));
    },

    /**
     * @param {!Set<!WebInspector.SASSSupport.Rule>} changedCSSRules
     * @param {!Array<!WebInspector.SASSSupport.AST>} changedModels
     * @return {?WebInspector.SASSProcessor.Result}
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
            var newText = newRule.styleRange.extract(newRule.document.text);
            cssEdits.push(new WebInspector.SourceEdit(newRule.document.url, oldRange, newText));
        }

        /** @type {!Map<string, string>} */
        var newSASSSources = new Map();
        for (var model of changedModels) {
            if (model.document.url === map.cssURL())
                continue;
            newSASSSources.set(model.document.url, model.document.text);
        }
        return new WebInspector.SASSProcessor.Result(map, cssEdits, newSASSSources);
    }
}

/**
 * @constructor
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!Array<!WebInspector.SourceEdit>} cssEdits
 * @param {!Map<string, string>} newSASSSources
 */
WebInspector.SASSProcessor.Result = function(map, cssEdits, newSASSSources)
{
    this.map = map;
    this.cssEdits = cssEdits;
    this.newSASSSources = newSASSSources;
}

/**
 * @param {!WebInspector.ASTService} astService
 * @param {!WebInspector.ASTSourceMap} map
 * @param {!Array<!WebInspector.TextRange>} ranges
 * @param {!Array<string>} newTexts
 * @return {!Promise<?WebInspector.SASSProcessor.Result>}
 */
WebInspector.SASSProcessor.processCSSEdits = function(astService, map, ranges, newTexts)
{
    console.assert(ranges.length === newTexts.length);
    var cssURL = map.cssURL();
    var cssText = map.cssAST().document.text;
    for (var i = 0; i < ranges.length; ++i) {
        var range = ranges[i];
        var edit = new WebInspector.SourceEdit(cssURL, range, newTexts[i]);
        cssText = edit.applyToText(cssText);
    }
    return astService.parseCSS(cssURL, cssText)
        .then(onCSSParsed);

    /**
     * @param {!WebInspector.SASSSupport.AST} newCSSAST
     * @return {!Promise<?WebInspector.SASSProcessor.Result>}
     */
    function onCSSParsed(newCSSAST)
    {
        //TODO(lushnikov): only diff changed styles.
        var cssDiff = WebInspector.SASSSupport.diffModels(map.cssAST(), newCSSAST);
        var edits = WebInspector.SASSProcessor._editsFromCSSDiff(cssDiff, map);

        // Determine AST trees which will change and clone them.
        var changedURLs = new Set(edits.map(edit => edit.sassURL));
        changedURLs.add(map.cssURL());
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
        sassNode = map.toSASSNode(oldProperty.name);
    } else {
        newValue = newProperty.value.text;
        sassNode = map.toSASSNode(oldProperty.value);
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
        var nodes = this.map.toCSSNodes(this._sassNode);
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

