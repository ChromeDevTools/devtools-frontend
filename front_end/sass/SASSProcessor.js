// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Sass.SASSProcessor = class {
  /**
   * @param {!Sass.ASTService} astService
   * @param {!Sass.ASTSourceMap} map
   * @param {!Array<!Sass.SASSProcessor.EditOperation>} editOperations
   */
  constructor(astService, map, editOperations) {
    this._astService = astService;
    this._map = map;
    this._editOperations = editOperations;
  }

  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.Property} cssProperty
   * @return {?Sass.SASSSupport.Property}
   */
  static _toSASSProperty(map, cssProperty) {
    var sassName = map.toSourceNode(cssProperty.name);
    return sassName ? sassName.parent : null;
  }

  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.Property} sassProperty
   * @return {!Array<!Sass.SASSSupport.Property>}
   */
  static _toCSSProperties(map, sassProperty) {
    return map.toCompiledNodes(sassProperty.name).map(name => name.parent);
  }

  /**
   * @param {!Sass.ASTService} astService
   * @param {!Sass.ASTSourceMap} map
   * @param {!Array<!Common.TextRange>} ranges
   * @param {!Array<string>} newTexts
   * @return {!Promise<?SDK.SourceMap.EditResult>}
   */
  static processCSSEdits(astService, map, ranges, newTexts) {
    console.assert(ranges.length === newTexts.length);
    var cssURL = map.compiledURL();
    var cssText = map.compiledModel().document.text;
    for (var i = 0; i < ranges.length; ++i)
      cssText = new Common.Text(cssText.replaceRange(ranges[i], newTexts[i]));
    return astService.parseCSS(cssURL, cssText.value()).then(onCSSParsed);

    /**
     * @param {!Sass.SASSSupport.AST} newCSSAST
     * @return {!Promise<?SDK.SourceMap.EditResult>}
     */
    function onCSSParsed(newCSSAST) {
      if (newCSSAST.rules.length !== map.compiledModel().rules.length)
        return Promise.resolve(/** @type {?SDK.SourceMap.EditResult} */ (null));
      // TODO(lushnikov): only diff changed styles.
      var cssDiff = Sass.SASSSupport.diffModels(map.compiledModel(), newCSSAST);
      var edits = Sass.SASSProcessor._editsFromCSSDiff(cssDiff, map);

      // Determine AST trees which will change and clone them.
      var changedURLs = new Set(edits.map(edit => edit.sassURL));
      changedURLs.add(map.compiledURL());
      var clonedModels = [];
      for (var url of changedURLs)
        clonedModels.push(map.modelForURL(url).clone());

      // Rebase map and edits onto a cloned AST trees.
      var nodeMapping = new Map();
      var rebasedMap = /** @type {!Sass.ASTSourceMap} */ (map.rebase(clonedModels, nodeMapping));
      console.assert(rebasedMap);
      var rebasedEdits = edits.map(edit => edit.rebase(rebasedMap, nodeMapping));

      return new Sass.SASSProcessor(astService, rebasedMap, rebasedEdits)._mutate();
    }
  }

  /**
   * @param {!Sass.SASSSupport.ASTDiff} cssDiff
   * @param {!Sass.ASTSourceMap} map
   * @return {!Array<!Sass.SASSProcessor.EditOperation>}
   */
  static _editsFromCSSDiff(cssDiff, map) {
    var T = Sass.SASSSupport.PropertyChangeType;
    var operations = [];
    for (var i = 0; i < cssDiff.changes.length; ++i) {
      var change = cssDiff.changes[i];
      var operation = null;
      if (change.type === T.ValueChanged || change.type === T.NameChanged)
        operation = Sass.SASSProcessor.SetTextOperation.fromCSSChange(change, map);
      else if (change.type === T.PropertyToggled)
        operation = Sass.SASSProcessor.TogglePropertyOperation.fromCSSChange(change, map);
      else if (change.type === T.PropertyRemoved)
        operation = Sass.SASSProcessor.RemovePropertyOperation.fromCSSChange(change, map);
      else if (change.type === T.PropertyAdded)
        operation = Sass.SASSProcessor.InsertPropertiesOperation.fromCSSChange(change, map);
      if (!operation) {
        Common.console.error('Operation ignored: ' + change.type);
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
   * @return {!Promise<?SDK.SourceMap.EditResult>}
   */
  _mutate() {
    /** @type {!Set<!Sass.SASSSupport.Rule>} */
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

    return Promise.all(promises).then(this._onFinished.bind(this, changedCSSRules));
  }

  /**
   * @param {!Set<!Sass.SASSSupport.Rule>} changedCSSRules
   * @param {!Array<!Sass.SASSSupport.AST>} changedModels
   * @return {?SDK.SourceMap.EditResult}
   */
  _onFinished(changedCSSRules, changedModels) {
    var nodeMapping = new Map();
    var map = this._map.rebase(changedModels, nodeMapping);
    if (!map)
      return null;

    var cssEdits = [];
    for (var rule of changedCSSRules) {
      var oldRange = rule.styleRange;
      var newRule = nodeMapping.get(rule);
      var newText = newRule.document.text.extract(newRule.styleRange);
      cssEdits.push(new Common.SourceEdit(newRule.document.url, oldRange, newText));
    }

    /** @type {!Map<string, string>} */
    var newSASSSources = new Map();
    for (var model of changedModels) {
      if (model.document.url === map.compiledURL())
        continue;
      newSASSSources.set(model.document.url, model.document.text.value());
    }
    return new SDK.SourceMap.EditResult(map, cssEdits, newSASSSources);
  }
};


/**
 * @unrestricted
 */
Sass.SASSProcessor.EditOperation = class {
  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {string} sassURL
   */
  constructor(map, sassURL) {
    this.map = map;
    this.sassURL = sassURL;
  }

  /**
   * @param {!Sass.SASSProcessor.EditOperation} other
   * @return {boolean}
   */
  merge(other) {
    return false;
  }

  /**
   * @return {!Array<!Sass.SASSSupport.Rule>}
   */
  perform() {
    return [];
  }

  /**
   * @param {!Sass.ASTSourceMap} newMap
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>} nodeMapping
   * @return {!Sass.SASSProcessor.EditOperation}
   */
  rebase(newMap, nodeMapping) {
    return this;
  }
};

/**
 * @unrestricted
 */
Sass.SASSProcessor.SetTextOperation = class extends Sass.SASSProcessor.EditOperation {
  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.TextNode} sassNode
   * @param {string} newText
   */
  constructor(map, sassNode, newText) {
    super(map, sassNode.document.url);
    this._sassNode = sassNode;
    this._newText = newText;
  }

  /**
   * @param {!Sass.SASSSupport.PropertyChange} change
   * @param {!Sass.ASTSourceMap} map
   * @return {?Sass.SASSProcessor.SetTextOperation}
   */
  static fromCSSChange(change, map) {
    var oldProperty = /** @type {!Sass.SASSSupport.Property} */ (change.oldProperty());
    var newProperty = /** @type {!Sass.SASSSupport.Property} */ (change.newProperty());
    console.assert(oldProperty && newProperty, 'SetTextOperation must have both oldProperty and newProperty');
    var newValue = null;
    var sassNode = null;
    if (change.type === Sass.SASSSupport.PropertyChangeType.NameChanged) {
      newValue = newProperty.name.text;
      sassNode = map.toSourceNode(oldProperty.name);
    } else {
      newValue = newProperty.value.text;
      sassNode = map.toSourceNode(oldProperty.value);
    }
    if (!sassNode)
      return null;
    return new Sass.SASSProcessor.SetTextOperation(map, sassNode, newValue);
  }

  /**
   * @override
   * @param {!Sass.SASSProcessor.EditOperation} other
   * @return {boolean}
   */
  merge(other) {
    if (!(other instanceof Sass.SASSProcessor.SetTextOperation))
      return false;
    return this._sassNode === other._sassNode;
  }

  /**
   * @override
   * @return {!Array<!Sass.SASSSupport.Rule>}
   */
  perform() {
    this._sassNode.setText(this._newText);
    var nodes = this.map.toCompiledNodes(this._sassNode);
    for (var node of nodes)
      node.setText(this._newText);

    var cssRules = nodes.map(textNode => textNode.parent.parent);
    return cssRules;
  }

  /**
   * @override
   * @param {!Sass.ASTSourceMap} newMap
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>} nodeMapping
   * @return {!Sass.SASSProcessor.SetTextOperation}
   */
  rebase(newMap, nodeMapping) {
    var sassNode =
        /** @type {?Sass.SASSSupport.TextNode} */ (nodeMapping.get(this._sassNode)) || this._sassNode;
    return new Sass.SASSProcessor.SetTextOperation(newMap, sassNode, this._newText);
  }
};


/**
 * @unrestricted
 */
Sass.SASSProcessor.TogglePropertyOperation = class extends Sass.SASSProcessor.EditOperation {
  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.Property} sassProperty
   * @param {boolean} newDisabled
   */
  constructor(map, sassProperty, newDisabled) {
    super(map, sassProperty.document.url);
    this._sassProperty = sassProperty;
    this._newDisabled = newDisabled;
  }

  /**
   * @param {!Sass.SASSSupport.PropertyChange} change
   * @param {!Sass.ASTSourceMap} map
   * @return {?Sass.SASSProcessor.TogglePropertyOperation}
   */
  static fromCSSChange(change, map) {
    var oldCSSProperty = /** @type {!Sass.SASSSupport.Property} */ (change.oldProperty());
    console.assert(oldCSSProperty, 'TogglePropertyOperation must have old CSS property');
    var sassProperty = Sass.SASSProcessor._toSASSProperty(map, oldCSSProperty);
    if (!sassProperty)
      return null;
    var newDisabled = change.newProperty().disabled;
    return new Sass.SASSProcessor.TogglePropertyOperation(map, sassProperty, newDisabled);
  }

  /**
   * @override
   * @param {!Sass.SASSProcessor.EditOperation} other
   * @return {boolean}
   */
  merge(other) {
    if (!(other instanceof Sass.SASSProcessor.TogglePropertyOperation))
      return false;
    return this._sassProperty === other._sassProperty;
  }

  /**
   * @override
   * @return {!Array<!Sass.SASSSupport.Rule>}
   */
  perform() {
    this._sassProperty.setDisabled(this._newDisabled);
    var cssProperties = Sass.SASSProcessor._toCSSProperties(this.map, this._sassProperty);
    for (var property of cssProperties)
      property.setDisabled(this._newDisabled);

    var cssRules = cssProperties.map(property => property.parent);
    return cssRules;
  }

  /**
   * @override
   * @param {!Sass.ASTSourceMap} newMap
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>} nodeMapping
   * @return {!Sass.SASSProcessor.TogglePropertyOperation}
   */
  rebase(newMap, nodeMapping) {
    var sassProperty =
        /** @type {?Sass.SASSSupport.Property} */ (nodeMapping.get(this._sassProperty)) || this._sassProperty;
    return new Sass.SASSProcessor.TogglePropertyOperation(newMap, sassProperty, this._newDisabled);
  }
};


/**
 * @unrestricted
 */
Sass.SASSProcessor.RemovePropertyOperation = class extends Sass.SASSProcessor.EditOperation {
  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.Property} sassProperty
   */
  constructor(map, sassProperty) {
    super(map, sassProperty.document.url);
    this._sassProperty = sassProperty;
  }

  /**
   * @param {!Sass.SASSSupport.PropertyChange} change
   * @param {!Sass.ASTSourceMap} map
   * @return {?Sass.SASSProcessor.RemovePropertyOperation}
   */
  static fromCSSChange(change, map) {
    var removedProperty = /** @type {!Sass.SASSSupport.Property} */ (change.oldProperty());
    console.assert(removedProperty, 'RemovePropertyOperation must have removed CSS property');
    var sassProperty = Sass.SASSProcessor._toSASSProperty(map, removedProperty);
    if (!sassProperty)
      return null;
    return new Sass.SASSProcessor.RemovePropertyOperation(map, sassProperty);
  }

  /**
   * @override
   * @param {!Sass.SASSProcessor.EditOperation} other
   * @return {boolean}
   */
  merge(other) {
    if (!(other instanceof Sass.SASSProcessor.RemovePropertyOperation))
      return false;
    return this._sassProperty === other._sassProperty;
  }

  /**
   * @override
   * @return {!Array<!Sass.SASSSupport.Rule>}
   */
  perform() {
    var cssProperties = Sass.SASSProcessor._toCSSProperties(this.map, this._sassProperty);
    var cssRules = cssProperties.map(property => property.parent);
    this._sassProperty.remove();
    for (var cssProperty of cssProperties) {
      cssProperty.remove();
      this.map.removeMapping(cssProperty.name, this._sassProperty.name);
      this.map.removeMapping(cssProperty.value, this._sassProperty.value);
    }

    return cssRules;
  }

  /**
   * @override
   * @param {!Sass.ASTSourceMap} newMap
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>} nodeMapping
   * @return {!Sass.SASSProcessor.RemovePropertyOperation}
   */
  rebase(newMap, nodeMapping) {
    var sassProperty =
        /** @type {?Sass.SASSSupport.Property} */ (nodeMapping.get(this._sassProperty)) || this._sassProperty;
    return new Sass.SASSProcessor.RemovePropertyOperation(newMap, sassProperty);
  }
};


/**
 * @unrestricted
 */
Sass.SASSProcessor.InsertPropertiesOperation = class extends Sass.SASSProcessor.EditOperation {
  /**
   * @param {!Sass.ASTSourceMap} map
   * @param {!Sass.SASSSupport.Rule} sassRule
   * @param {?Sass.SASSSupport.Property} afterSASSProperty
   * @param {!Array<string>} propertyNames
   * @param {!Array<string>} propertyValues
   * @param {!Array<boolean>} disabledStates
   */
  constructor(map, sassRule, afterSASSProperty, propertyNames, propertyValues, disabledStates) {
    console.assert(propertyNames.length === propertyValues.length && propertyValues.length === disabledStates.length);
    super(map, sassRule.document.url);
    this._sassRule = sassRule;
    this._afterSASSProperty = afterSASSProperty;
    this._nameTexts = propertyNames;
    this._valueTexts = propertyValues;
    this._disabledStates = disabledStates;
  }

  /**
   * @param {!Sass.SASSSupport.PropertyChange} change
   * @param {!Sass.ASTSourceMap} map
   * @return {?Sass.SASSProcessor.InsertPropertiesOperation}
   */
  static fromCSSChange(change, map) {
    var sassRule = null;
    var afterSASSProperty = null;
    if (change.oldPropertyIndex) {
      var cssAnchor = change.oldRule.properties[change.oldPropertyIndex - 1].name;
      var sassAnchor = map.toSourceNode(cssAnchor);
      afterSASSProperty = sassAnchor ? sassAnchor.parent : null;
      sassRule = afterSASSProperty ? afterSASSProperty.parent : null;
    } else {
      var cssAnchor = change.oldRule.blockStart;
      var sassAnchor = map.toSourceNode(cssAnchor);
      sassRule = sassAnchor ? sassAnchor.parent : null;
    }
    if (!sassRule)
      return null;
    var insertedProperty = /** @type {!Sass.SASSSupport.Property} */ (change.newProperty());
    console.assert(insertedProperty, 'InsertPropertiesOperation must have inserted CSS property');
    var names = [insertedProperty.name.text];
    var values = [insertedProperty.value.text];
    var disabledStates = [insertedProperty.disabled];
    return new Sass.SASSProcessor.InsertPropertiesOperation(
        map, sassRule, afterSASSProperty, names, values, disabledStates);
  }

  /**
   * @override
   * @param {!Sass.SASSProcessor.EditOperation} other
   * @return {boolean}
   */
  merge(other) {
    if (!(other instanceof Sass.SASSProcessor.InsertPropertiesOperation))
      return false;
    if (this._sassRule !== other._sassRule || this._afterSASSProperty !== other._afterSASSProperty)
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
  }

  /**
   * @override
   * @return {!Array<!Sass.SASSSupport.Rule>}
   */
  perform() {
    var newSASSProperties = this._sassRule.insertProperties(
        this._afterSASSProperty, this._nameTexts, this._valueTexts, this._disabledStates);
    var cssRules = [];
    var afterCSSProperties = [];
    if (this._afterSASSProperty) {
      afterCSSProperties = Sass.SASSProcessor._toCSSProperties(this.map, this._afterSASSProperty);
      cssRules = afterCSSProperties.map(property => property.parent);
    } else {
      cssRules = this.map.toCompiledNodes(this._sassRule.blockStart).map(blockStart => blockStart.parent);
    }
    for (var i = 0; i < cssRules.length; ++i) {
      var cssRule = cssRules[i];
      var afterCSSProperty = afterCSSProperties.length ? afterCSSProperties[i] : null;
      var newCSSProperties =
          cssRule.insertProperties(afterCSSProperty, this._nameTexts, this._valueTexts, this._disabledStates);
      for (var j = 0; j < newCSSProperties.length; ++j) {
        this.map.addMapping(newCSSProperties[j].name, newSASSProperties[j].name);
        this.map.addMapping(newCSSProperties[j].value, newSASSProperties[j].value);
      }
    }
    return cssRules;
  }

  /**
   * @override
   * @param {!Sass.ASTSourceMap} newMap
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>} nodeMapping
   * @return {!Sass.SASSProcessor.InsertPropertiesOperation}
   */
  rebase(newMap, nodeMapping) {
    var sassRule = /** @type {?Sass.SASSSupport.Rule} */ (nodeMapping.get(this._sassRule)) || this._sassRule;
    var afterSASSProperty = this._afterSASSProperty ?
        /** @type {?Sass.SASSSupport.Property} */ (nodeMapping.get(this._afterSASSProperty)) ||
            this._afterSASSProperty :
        null;
    return new Sass.SASSProcessor.InsertPropertiesOperation(
        newMap, sassRule, afterSASSProperty, this._nameTexts, this._valueTexts, this._disabledStates);
  }
};
