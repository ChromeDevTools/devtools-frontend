// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {FormatterWorker.FormatterWorkerContentParser}
 * @unrestricted
 */
Gonzales.SCSSParser = class {
  /**
   * @override
   * @param {string} content
   * @return {!Array<!Gonzales.SCSSParser.Rule>}
   */
  parse(content) {
    var ast = null;
    try {
      ast = gonzales.parse(content, {syntax: 'scss'});
    } catch (e) {
      return [];
    }

    /** @type {!{properties: !Array<!Gonzales.Node>, node: !Gonzales.Node}} */
    var rootBlock = {properties: [], node: ast};
    /** @type {!Array<!{properties: !Array<!Gonzales.Node>, node: !Gonzales.Node}>} */
    var blocks = [rootBlock];
    ast.selectors = [];
    Gonzales.SCSSParser.extractNodes(ast, blocks, rootBlock);

    var rules = [];
    for (var block of blocks)
      this._handleBlock(block, rules);
    return rules;
  }

  /**
   * @param {!{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}} block
   * @param {!Array<!Gonzales.SCSSParser.Rule>} output
   */
  _handleBlock(block, output) {
    var selectors = block.node.selectors.map(Gonzales.SCSSParser.rangeFromNode);
    var properties = [];
    var styleRange = Gonzales.SCSSParser.rangeFromNode(block.node);
    styleRange.startColumn += 1;
    styleRange.endColumn -= 1;
    for (var node of block.properties) {
      if (node.type === 'declaration')
        this._handleDeclaration(node, properties);
      else if (node.type === 'include')
        this._handleInclude(node, properties);
      else if (node.type === 'multilineComment' && node.start.line === node.end.line)
        this._handleComment(node, properties);
    }
    if (!selectors.length && !properties.length)
      return;
    var rule = new Gonzales.SCSSParser.Rule(selectors, properties, styleRange);
    output.push(rule);
  }

  /**
   * @param {!Gonzales.Node} node
   * @param {!Array<!Gonzales.SCSSParser.Property>} output
   */
  _handleDeclaration(node, output) {
    var propertyNode = node.content.find(node => node.type === 'property');
    var valueNode = node.content.find(node => node.type === 'value');
    if (!propertyNode || !valueNode)
      return;

    var nameRange = Gonzales.SCSSParser.rangeFromNode(propertyNode);
    var valueRange = Gonzales.SCSSParser.rangeFromNode(valueNode);
    var range = /** @type {!Gonzales.TextRange} */ (node.declarationRange);

    var property = new Gonzales.SCSSParser.Property(range, nameRange, valueRange, false);
    output.push(property);
  }

  /**
   * @param {!Gonzales.Node} node
   * @param {!Array<!Gonzales.SCSSParser.Property>} output
   */
  _handleInclude(node, output) {
    var mixinName = node.content.find(node => node.type === 'ident');
    if (!mixinName)
      return;
    var nameRange = Gonzales.SCSSParser.rangeFromNode(mixinName);
    var mixinArguments = node.content.find(node => node.type === 'arguments');
    if (!mixinArguments)
      return;
    var parameters = mixinArguments.content.filter(node => node.type !== 'delimiter' && node.type !== 'space');
    for (var parameter of parameters) {
      var range = Gonzales.SCSSParser.rangeFromNode(node);
      var valueRange = Gonzales.SCSSParser.rangeFromNode(parameter);
      var property = new Gonzales.SCSSParser.Property(range, nameRange, valueRange, false);
      output.push(property);
    }
  }

  /**
   * @param {!Gonzales.Node} node
   * @param {!Array<!Gonzales.SCSSParser.Property>} output
   */
  _handleComment(node, output) {
    if (node.start.line !== node.end.line)
      return;
    var innerText = /** @type {string} */ (node.content);
    var innerResult = this.parse(innerText);
    if (innerResult.length !== 1 || innerResult[0].properties.length !== 1)
      return;
    var property = innerResult[0].properties[0];
    var disabledProperty = property.rebaseInsideOneLineComment(node);
    output.push(disabledProperty);
  }
};

/**
 * @param {!Gonzales.Node} node
 * @return {!Gonzales.TextRange}
 */
Gonzales.SCSSParser.rangeFromNode = function(node) {
  return new Gonzales.TextRange(node.start.line - 1, node.start.column - 1, node.end.line - 1, node.end.column);
};

/**
 * @unrestricted
 */
Gonzales.SCSSParser.Property = class {
  /**
   * @param {!Gonzales.TextRange} range
   * @param {!Gonzales.TextRange} nameRange
   * @param {!Gonzales.TextRange} valueRange
   * @param {boolean} disabled
   */
  constructor(range, nameRange, valueRange, disabled) {
    this.range = range;
    this.name = nameRange;
    this.value = valueRange;
    this.disabled = disabled;
  }

  /**
   * @param {!Gonzales.Node} commentNode
   * @return {!Gonzales.SCSSParser.Property}
   */
  rebaseInsideOneLineComment(commentNode) {
    var lineOffset = commentNode.start.line - 1;
    // Account for the "/*".
    var columnOffset = commentNode.start.column - 1 + 2;
    var range = Gonzales.SCSSParser.rangeFromNode(commentNode);
    var name = rebaseRange(this.name, lineOffset, columnOffset);
    var value = rebaseRange(this.value, lineOffset, columnOffset);
    return new Gonzales.SCSSParser.Property(range, name, value, true);

    /**
     * @param {!Gonzales.TextRange} range
     * @param {number} lineOffset
     * @param {number} columnOffset
     * @return {!Gonzales.TextRange}
     */
    function rebaseRange(range, lineOffset, columnOffset) {
      return new Gonzales.TextRange(
          range.startLine + lineOffset, range.startColumn + columnOffset, range.endLine + lineOffset,
          range.endColumn + columnOffset);
    }
  }
};

/**
 * @unrestricted
 */
Gonzales.SCSSParser.Rule = class {
  /**
   * @param {!Array<!Gonzales.TextRange>} selectors
   * @param {!Array<!Gonzales.SCSSParser.Property>} properties
   * @param {!Gonzales.TextRange} styleRange
   */
  constructor(selectors, properties, styleRange) {
    this.selectors = selectors;
    this.properties = properties;
    this.styleRange = styleRange;
  }
};

/**
 * @param {!Gonzales.Node} node
 * @param {!Array<{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}>} blocks
 * @param {!{node: !Gonzales.Node, properties: !Array<!Gonzales.Node>}} lastBlock
 */
Gonzales.SCSSParser.extractNodes = function(node, blocks, lastBlock) {
  if (!Array.isArray(node.content))
    return;
  if (node.type === 'block') {
    lastBlock = {node: node, properties: []};
    blocks.push(lastBlock);
  }
  var lastDeclaration = null;
  var selectors = [];
  for (var i = 0; i < node.content.length; ++i) {
    var child = node.content[i];
    if (child.type === 'declarationDelimiter' && lastDeclaration) {
      lastDeclaration.declarationRange.endLine = child.end.line - 1;
      lastDeclaration.declarationRange.endColumn = child.end.column;
      lastDeclaration = null;
    } else if (child.type === 'selector') {
      selectors.push(child);
    } else if (child.type === 'block') {
      child.selectors = selectors;
      selectors = [];
    }
    if (child.type === 'include' || child.type === 'declaration' || child.type === 'multilineComment')
      lastBlock.properties.push(child);
    if (child.type === 'declaration') {
      lastDeclaration = child;
      const line = child.start.line - 1;
      const column = child.start.column - 1;
      lastDeclaration.declarationRange = new Gonzales.TextRange(line, column, line, column);
    }
    Gonzales.SCSSParser.extractNodes(child, blocks, lastBlock);
  }
  if (lastDeclaration) {
    lastDeclaration.declarationRange.endLine = node.end.line - 1;
    lastDeclaration.declarationRange.endColumn = node.end.column - 1;
  }
};

/**
 * @unrestricted
 */
Gonzales.TextRange = class {
  /**
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   */
  constructor(startLine, startColumn, endLine, endColumn) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }
};