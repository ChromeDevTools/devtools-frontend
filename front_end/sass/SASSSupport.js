// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Sass.SASSSupport = {};

/**
 * @param {string} url
 * @param {string} content
 * @return {!Promise<!Sass.SASSSupport.AST>}
 */
Sass.SASSSupport.parseSCSS = function(url, content) {
  var text = new Common.Text(content);
  var document = new Sass.SASSSupport.ASTDocument(url, text);

  return Common.formatterWorkerPool.parseSCSS(content).then(onParsed);

  /**
   * @param {!Array<!Common.FormatterWorkerPool.SCSSRule>} rulePayloads
   * @return {!Sass.SASSSupport.AST}
   */
  function onParsed(rulePayloads) {
    var rules = [];
    for (var i = 0; i < rulePayloads.length; ++i) {
      var rulePayload = rulePayloads[i];
      var selectors = rulePayload.selectors.map(createTextNode);
      var properties = rulePayload.properties.map(createProperty);
      var range = Common.TextRange.fromObject(rulePayload.styleRange);
      var rule = new Sass.SASSSupport.Rule(document, selectors, range, properties);
      rules.push(rule);
    }
    return new Sass.SASSSupport.AST(document, rules);
  }

  /**
   * @param {!Object} payload
   */
  function createTextNode(payload) {
    var range = Common.TextRange.fromObject(payload);
    return new Sass.SASSSupport.TextNode(document, text.extract(range), range);
  }

  /**
   * @param {!Object} payload
   */
  function createProperty(payload) {
    var name = createTextNode(payload.name);
    var value = createTextNode(payload.value);
    return new Sass.SASSSupport.Property(
        document, name, value, Common.TextRange.fromObject(payload.range), payload.disabled);
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.ASTDocument = class {
  /**
   * @param {string} url
   * @param {!Common.Text} text
   */
  constructor(url, text) {
    this.url = url;
    this.text = text;
    this.edits = [];
  }

  /**
   * @return {!Sass.SASSSupport.ASTDocument}
   */
  clone() {
    return new Sass.SASSSupport.ASTDocument(this.url, this.text);
  }

  /**
   * @return {boolean}
   */
  hasChanged() {
    return !!this.edits.length;
  }

  /**
   * @return {!Common.Text}
   */
  newText() {
    this.edits.stableSort(sequentialOrder);
    var text = this.text;
    for (var i = this.edits.length - 1; i >= 0; --i) {
      var range = this.edits[i].oldRange;
      var newText = this.edits[i].newText;
      text = new Common.Text(text.replaceRange(range, newText));
    }
    return text;

    /**
     * @param {!Common.SourceEdit} edit1
     * @param {!Common.SourceEdit} edit2
     * @return {number}
     */
    function sequentialOrder(edit1, edit2) {
      var range1 = edit1.oldRange.collapseToStart();
      var range2 = edit2.oldRange.collapseToStart();
      if (range1.equal(range2))
        return 0;
      return range1.follows(range2) ? 1 : -1;
    }
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.Node = class {
  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   */
  constructor(document) {
    this.document = document;
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.TextNode = class extends Sass.SASSSupport.Node {
  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @param {string} text
   * @param {!Common.TextRange} range
   */
  constructor(document, text, range) {
    super(document);
    this.text = text;
    this.range = range;
  }

  /**
   * @param {string} newText
   */
  setText(newText) {
    if (this.text === newText)
      return;
    this.text = newText;
    this.document.edits.push(new Common.SourceEdit(this.document.url, this.range, newText));
  }

  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @return {!Sass.SASSSupport.TextNode}
   */
  clone(document) {
    return new Sass.SASSSupport.TextNode(document, this.text, this.range.clone());
  }

  /**
   * @param {!Sass.SASSSupport.TextNode} other
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>=} outNodeMapping
   * @return {boolean}
   */
  match(other, outNodeMapping) {
    if (this.text.trim() !== other.text.trim())
      return false;
    if (outNodeMapping)
      outNodeMapping.set(this, other);
    return true;
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.Property = class extends Sass.SASSSupport.Node {
  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @param {!Sass.SASSSupport.TextNode} name
   * @param {!Sass.SASSSupport.TextNode} value
   * @param {!Common.TextRange} range
   * @param {boolean} disabled
   */
  constructor(document, name, value, range, disabled) {
    super(document);
    this.name = name;
    this.value = value;
    this.range = range;
    this.name.parent = this;
    this.value.parent = this;
    this.disabled = disabled;
  }

  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @return {!Sass.SASSSupport.Property}
   */
  clone(document) {
    return new Sass.SASSSupport.Property(
        document, this.name.clone(document), this.value.clone(document), this.range.clone(), this.disabled);
  }

  /**
   * @param {function(!Sass.SASSSupport.Node)} callback
   */
  visit(callback) {
    callback(this);
    callback(this.name);
    callback(this.value);
  }

  /**
   * @param {!Sass.SASSSupport.Property} other
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>=} outNodeMapping
   * @return {boolean}
   */
  match(other, outNodeMapping) {
    if (this.disabled !== other.disabled)
      return false;
    if (outNodeMapping)
      outNodeMapping.set(this, other);
    return this.name.match(other.name, outNodeMapping) && this.value.match(other.value, outNodeMapping);
  }

  /**
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    if (this.disabled === disabled)
      return;
    this.disabled = disabled;
    if (disabled) {
      var oldRange1 = Common.TextRange.createFromLocation(this.range.startLine, this.range.startColumn);
      var edit1 = new Common.SourceEdit(this.document.url, oldRange1, '/* ');
      var oldRange2 = Common.TextRange.createFromLocation(this.range.endLine, this.range.endColumn);
      var edit2 = new Common.SourceEdit(this.document.url, oldRange2, ' */');
      this.document.edits.push(edit1, edit2);
      return;
    }
    var oldRange1 = new Common.TextRange(
        this.range.startLine, this.range.startColumn, this.range.startLine, this.name.range.startColumn);
    var edit1 = new Common.SourceEdit(this.document.url, oldRange1, '');

    var propertyText = this.document.text.extract(this.range);
    var endsWithSemicolon = propertyText.slice(0, -2).trim().endsWith(';');
    var oldRange2 = new Common.TextRange(
        this.range.endLine, this.value.range.endColumn + (endsWithSemicolon ? 1 : 0), this.range.endLine,
        this.range.endColumn);
    var edit2 = new Common.SourceEdit(this.document.url, oldRange2, '');
    this.document.edits.push(edit1, edit2);
  }

  remove() {
    console.assert(this.parent);
    var rule = this.parent;
    var index = rule.properties.indexOf(this);
    rule.properties.splice(index, 1);
    this.parent = null;

    var lineRange = new Common.TextRange(this.range.startLine, 0, this.range.endLine + 1, 0);
    var oldRange;
    if (this.document.text.extract(lineRange).trim() === this.document.text.extract(this.range).trim())
      oldRange = lineRange;
    else
      oldRange = this.range;
    this.document.edits.push(new Common.SourceEdit(this.document.url, oldRange, ''));
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.Rule = class extends Sass.SASSSupport.Node {
  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @param {!Array<!Sass.SASSSupport.TextNode>} selectors
   * @param {!Common.TextRange} styleRange
   * @param {!Array<!Sass.SASSSupport.Property>} properties
   */
  constructor(document, selectors, styleRange, properties) {
    super(document);
    this.selectors = selectors;
    this.properties = properties;
    this.styleRange = styleRange;

    var blockStartRange = styleRange.collapseToStart();
    blockStartRange.startColumn -= 1;
    this.blockStart =
        new Sass.SASSSupport.TextNode(document, this.document.text.extract(blockStartRange), blockStartRange);
    this.blockStart.parent = this;

    for (var i = 0; i < this.properties.length; ++i)
      this.properties[i].parent = this;

    this._hasTrailingSemicolon =
        !this.properties.length || this.document.text.extract(this.properties.peekLast().range).endsWith(';');
  }

  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @return {!Sass.SASSSupport.Rule}
   */
  clone(document) {
    var properties = [];
    for (var i = 0; i < this.properties.length; ++i)
      properties.push(this.properties[i].clone(document));
    var selectors = [];
    for (var i = 0; i < this.selectors.length; ++i)
      selectors.push(this.selectors[i].clone(document));
    return new Sass.SASSSupport.Rule(document, selectors, this.styleRange.clone(), properties);
  }

  /**
   * @param {function(!Sass.SASSSupport.Node)} callback
   */
  visit(callback) {
    callback(this);
    for (var i = 0; i < this.selectors.length; ++i)
      callback(this.selectors[i]);
    callback(this.blockStart);
    for (var i = 0; i < this.properties.length; ++i)
      this.properties[i].visit(callback);
  }

  /**
   * @param {!Sass.SASSSupport.Rule} other
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>=} outNodeMapping
   * @return {boolean}
   */
  match(other, outNodeMapping) {
    if (this.selectors.length !== other.selectors.length)
      return false;
    if (this.properties.length !== other.properties.length)
      return false;
    if (outNodeMapping)
      outNodeMapping.set(this, other);
    var result = this.blockStart.match(other.blockStart, outNodeMapping);
    for (var i = 0; result && i < this.selectors.length; ++i)
      result = result && this.selectors[i].match(other.selectors[i], outNodeMapping);
    for (var i = 0; result && i < this.properties.length; ++i)
      result = result && this.properties[i].match(other.properties[i], outNodeMapping);
    return result;
  }

  _addTrailingSemicolon() {
    if (this._hasTrailingSemicolon || !this.properties)
      return;
    this._hasTrailingSemicolon = true;
    this.document.edits.push(
        new Common.SourceEdit(this.document.url, this.properties.peekLast().range.collapseToEnd(), ';'));
  }

  /**
   * @param {?Sass.SASSSupport.Property} anchorProperty
   * @param {!Array<string>} nameTexts
   * @param {!Array<string>} valueTexts
   * @param {!Array<boolean>} disabledStates
   * @return {!Array<!Sass.SASSSupport.Property>}
   */
  insertProperties(anchorProperty, nameTexts, valueTexts, disabledStates) {
    console.assert(
        nameTexts.length === valueTexts.length && valueTexts.length === disabledStates.length,
        'Input array should be of the same size.');

    this._addTrailingSemicolon();
    var newProperties = [];
    var index = anchorProperty ? this.properties.indexOf(anchorProperty) : -1;
    for (var i = 0; i < nameTexts.length; ++i) {
      var nameText = nameTexts[i];
      var valueText = valueTexts[i];
      var disabled = disabledStates[i];
      this.document.edits.push(this._insertPropertyEdit(anchorProperty, nameText, valueText, disabled));

      var name = new Sass.SASSSupport.TextNode(this.document, nameText, Common.TextRange.createFromLocation(0, 0));
      var value = new Sass.SASSSupport.TextNode(this.document, valueText, Common.TextRange.createFromLocation(0, 0));
      var newProperty = new Sass.SASSSupport.Property(
          this.document, name, value, Common.TextRange.createFromLocation(0, 0), disabled);

      this.properties.splice(index + i + 1, 0, newProperty);
      newProperty.parent = this;
      newProperties.push(newProperty);
    }
    return newProperties;
  }

  /**
   * @param {?Sass.SASSSupport.Property} anchorProperty
   * @param {string} nameText
   * @param {string} valueText
   * @param {boolean} disabled
   * @return {!Common.SourceEdit}
   */
  _insertPropertyEdit(anchorProperty, nameText, valueText, disabled) {
    var anchorRange = anchorProperty ? anchorProperty.range : this.blockStart.range;
    var indent = this._computePropertyIndent();
    var leftComment = disabled ? '/* ' : '';
    var rightComment = disabled ? ' */' : '';
    var newText = String.sprintf('\n%s%s%s: %s;%s', indent, leftComment, nameText, valueText, rightComment);
    return new Common.SourceEdit(this.document.url, anchorRange.collapseToEnd(), newText);
  }

  /**
   * @return {string}
   */
  _computePropertyIndent() {
    var indentProperty = this.properties.find(property => !property.range.isEmpty());
    var result = '';
    if (indentProperty) {
      result = this.document.text.extract(new Common.TextRange(
          indentProperty.range.startLine, 0, indentProperty.range.startLine, indentProperty.range.startColumn));
    } else {
      var lineNumber = this.blockStart.range.startLine;
      var columnNumber = this.blockStart.range.startColumn;
      var baseLine = this.document.text.extract(new Common.TextRange(lineNumber, 0, lineNumber, columnNumber));
      result = Common.TextUtils.lineIndent(baseLine) + Common.moduleSetting('textEditorIndent').get();
    }
    return result.isWhitespace() ? result : '';
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.AST = class extends Sass.SASSSupport.Node {
  /**
   * @param {!Sass.SASSSupport.ASTDocument} document
   * @param {!Array<!Sass.SASSSupport.Rule>} rules
   */
  constructor(document, rules) {
    super(document);
    this.rules = rules;
    for (var i = 0; i < rules.length; ++i)
      rules[i].parent = this;
  }

  /**
   * @return {!Sass.SASSSupport.AST}
   */
  clone() {
    var document = this.document.clone();
    var rules = [];
    for (var i = 0; i < this.rules.length; ++i)
      rules.push(this.rules[i].clone(document));
    return new Sass.SASSSupport.AST(document, rules);
  }

  /**
   * @param {!Sass.SASSSupport.AST} other
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>=} outNodeMapping
   * @return {boolean}
   */
  match(other, outNodeMapping) {
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
  }

  /**
   * @param {function(!Sass.SASSSupport.Node)} callback
   */
  visit(callback) {
    callback(this);
    for (var i = 0; i < this.rules.length; ++i)
      this.rules[i].visit(callback);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Sass.SASSSupport.TextNode}
   */
  findNodeForPosition(lineNumber, columnNumber) {
    this._ensureNodePositionsIndex();
    var index = this._sortedTextNodes.lowerBound({lineNumber: lineNumber, columnNumber: columnNumber}, nodeComparator);
    var node = this._sortedTextNodes[index];
    if (!node)
      return null;
    return node.range.containsLocation(lineNumber, columnNumber) ? node : null;

    /**
     * @param {!{lineNumber: number, columnNumber: number}} position
     * @param {!Sass.SASSSupport.TextNode} textNode
     * @return {number}
     */
    function nodeComparator(position, textNode) {
      return textNode.range.compareToPosition(position.lineNumber, position.columnNumber);
    }
  }

  _ensureNodePositionsIndex() {
    if (this._sortedTextNodes)
      return;
    this._sortedTextNodes = [];
    this.visit(onNode.bind(this));
    this._sortedTextNodes.sort(nodeComparator);

    /**
     * @param {!Sass.SASSSupport.Node} node
     * @this {Sass.SASSSupport.AST}
     */
    function onNode(node) {
      if (!(node instanceof Sass.SASSSupport.TextNode))
        return;
      this._sortedTextNodes.push(node);
    }

    /**
     * @param {!Sass.SASSSupport.TextNode} text1
     * @param {!Sass.SASSSupport.TextNode} text2
     * @return {number}
     */
    function nodeComparator(text1, text2) {
      return Common.TextRange.comparator(text1.range, text2.range);
    }
  }
};

/** @enum {string} */
Sass.SASSSupport.PropertyChangeType = {
  PropertyAdded: 'PropertyAdded',
  PropertyRemoved: 'PropertyRemoved',
  PropertyToggled: 'PropertyToggled',
  ValueChanged: 'ValueChanged',
  NameChanged: 'NameChanged'
};

/**
 * @unrestricted
 */
Sass.SASSSupport.PropertyChange = class {
  /**
   * @param {!Sass.SASSSupport.PropertyChangeType} type
   * @param {!Sass.SASSSupport.Rule} oldRule
   * @param {!Sass.SASSSupport.Rule} newRule
   * @param {number} oldPropertyIndex
   * @param {number} newPropertyIndex
   */
  constructor(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex) {
    this.type = type;
    this.oldRule = oldRule;
    this.newRule = newRule;
    this.oldPropertyIndex = oldPropertyIndex;
    this.newPropertyIndex = newPropertyIndex;
  }

  /**
   * @return {?Sass.SASSSupport.Property}
   */
  oldProperty() {
    return this.oldRule.properties[this.oldPropertyIndex] || null;
  }

  /**
   * @return {?Sass.SASSSupport.Property}
   */
  newProperty() {
    return this.newRule.properties[this.newPropertyIndex] || null;
  }
};

/**
 * @unrestricted
 */
Sass.SASSSupport.ASTDiff = class {
  /**
   * @param {string} url
   * @param {!Sass.SASSSupport.AST} oldAST
   * @param {!Sass.SASSSupport.AST} newAST
   * @param {!Map<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} mapping
   * @param {!Array<!Sass.SASSSupport.PropertyChange>} changes
   */
  constructor(url, oldAST, newAST, mapping, changes) {
    this.url = url;
    this.mapping = mapping;
    this.changes = changes;
    this.oldAST = oldAST;
    this.newAST = newAST;
  }
};

/**
 * @param {!Sass.SASSSupport.AST} oldAST
 * @param {!Sass.SASSSupport.AST} newAST
 * @return {!Sass.SASSSupport.ASTDiff}
 */
Sass.SASSSupport.diffModels = function(oldAST, newAST) {
  console.assert(oldAST.rules.length === newAST.rules.length, 'Not implemented for rule diff.');
  console.assert(oldAST.document.url === newAST.document.url, 'Diff makes sense for models with the same url.');
  var T = Sass.SASSSupport.PropertyChangeType;
  var changes = [];
  /** @type {!Map<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} */
  var mapping = new Map();
  for (var i = 0; i < oldAST.rules.length; ++i) {
    var oldRule = oldAST.rules[i];
    var newRule = newAST.rules[i];
    computeRuleDiff(mapping, oldRule, newRule);
  }
  return new Sass.SASSSupport.ASTDiff(oldAST.document.url, oldAST, newAST, mapping, changes);

  /**
   * @param {!Sass.SASSSupport.PropertyChangeType} type
   * @param {!Sass.SASSSupport.Rule} oldRule
   * @param {!Sass.SASSSupport.Rule} newRule
   * @param {number} oldPropertyIndex
   * @param {number} newPropertyIndex
   */
  function addChange(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex) {
    changes.push(new Sass.SASSSupport.PropertyChange(type, oldRule, newRule, oldPropertyIndex, newPropertyIndex));
  }

  /**
   * @param {!Map<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} mapping
   * @param {!Sass.SASSSupport.Rule} oldRule
   * @param {!Sass.SASSSupport.Rule} newRule
   */
  function computeRuleDiff(mapping, oldRule, newRule) {
    var oldLines = [];
    for (var i = 0; i < oldRule.properties.length; ++i)
      oldLines.push(oldRule.properties[i].name.text.trim() + ':' + oldRule.properties[i].value.text.trim());
    var newLines = [];
    for (var i = 0; i < newRule.properties.length; ++i)
      newLines.push(newRule.properties[i].name.text.trim() + ':' + newRule.properties[i].value.text.trim());
    var diff = Diff.Diff.lineDiff(oldLines, newLines);
    diff = Diff.Diff.convertToEditDiff(diff);

    var p1 = 0, p2 = 0;
    for (var i = 0; i < diff.length; ++i) {
      var token = diff[i];
      if (token[0] === Diff.Diff.Operation.Delete) {
        for (var j = 0; j < token[1]; ++j)
          addChange(T.PropertyRemoved, oldRule, newRule, p1++, p2);
      } else if (token[0] === Diff.Diff.Operation.Insert) {
        for (var j = 0; j < token[1]; ++j)
          addChange(T.PropertyAdded, oldRule, newRule, p1, p2++);
      } else {
        for (var j = 0; j < token[1]; ++j)
          computePropertyDiff(mapping, oldRule, newRule, p1++, p2++);
      }
    }
  }

  /**
   * @param {!Map<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} mapping
   * @param {!Sass.SASSSupport.Rule} oldRule
   * @param {!Sass.SASSSupport.Rule} newRule
   * @param {number} oldPropertyIndex
   * @param {number} newPropertyIndex
   */
  function computePropertyDiff(mapping, oldRule, newRule, oldPropertyIndex, newPropertyIndex) {
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
};
