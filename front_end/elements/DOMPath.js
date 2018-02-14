// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Elements.DOMPath = {};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} justSelector
 * @return {string}
 */
Elements.DOMPath.fullQualifiedSelector = function(node, justSelector) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return node.localName() || node.nodeName().toLowerCase();
  return Elements.DOMPath.cssPath(node, justSelector);
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} optimized
 * @return {string}
 */
Elements.DOMPath.cssPath = function(node, optimized) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return '';

  var steps = [];
  var contextNode = node;
  while (contextNode) {
    var step = Elements.DOMPath._cssPathStep(contextNode, !!optimized, contextNode === node);
    if (!step)
      break;  // Error - bail out early.
    steps.push(step);
    if (step.optimized)
      break;
    contextNode = contextNode.parentNode;
  }

  steps.reverse();
  return steps.join(' > ');
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean} optimized
 * @param {boolean} isTargetNode
 * @return {?Elements.DOMPath.Step}
 */
Elements.DOMPath._cssPathStep = function(node, optimized, isTargetNode) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return null;

  var id = node.getAttribute('id');
  if (optimized) {
    if (id)
      return new Elements.DOMPath.Step(idSelector(id), true);
    var nodeNameLower = node.nodeName().toLowerCase();
    if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html')
      return new Elements.DOMPath.Step(node.nodeNameInCorrectCase(), true);
  }
  var nodeName = node.nodeNameInCorrectCase();

  if (id)
    return new Elements.DOMPath.Step(nodeName + idSelector(id), true);
  var parent = node.parentNode;
  if (!parent || parent.nodeType() === Node.DOCUMENT_NODE)
    return new Elements.DOMPath.Step(nodeName, true);

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Array.<string>}
   */
  function prefixedElementClassNames(node) {
    var classAttribute = node.getAttribute('class');
    if (!classAttribute)
      return [];

    return classAttribute.split(/\s+/g).filter(Boolean).map(function(name) {
      // The prefix is required to store "__proto__" in a object-based map.
      return '$' + name;
    });
  }

  /**
   * @param {string} id
   * @return {string}
   */
  function idSelector(id) {
    return '#' + escapeIdentifierIfNeeded(id);
  }

  /**
   * @param {string} ident
   * @return {string}
   */
  function escapeIdentifierIfNeeded(ident) {
    if (isCSSIdentifier(ident))
      return ident;
    var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
    var lastIndex = ident.length - 1;
    return ident.replace(/./g, function(c, i) {
      return ((shouldEscapeFirst && i === 0) || !isCSSIdentChar(c)) ? escapeAsciiChar(c, i === lastIndex) : c;
    });
  }

  /**
   * @param {string} c
   * @param {boolean} isLast
   * @return {string}
   */
  function escapeAsciiChar(c, isLast) {
    return '\\' + toHexByte(c) + (isLast ? '' : ' ');
  }

  /**
   * @param {string} c
   */
  function toHexByte(c) {
    var hexByte = c.charCodeAt(0).toString(16);
    if (hexByte.length === 1)
      hexByte = '0' + hexByte;
    return hexByte;
  }

  /**
   * @param {string} c
   * @return {boolean}
   */
  function isCSSIdentChar(c) {
    if (/[a-zA-Z0-9_-]/.test(c))
      return true;
    return c.charCodeAt(0) >= 0xA0;
  }

  /**
   * @param {string} value
   * @return {boolean}
   */
  function isCSSIdentifier(value) {
    // Double hyphen prefixes are not allowed by specification, but many sites use it.
    return /^-{0,2}[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
  }

  var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
  var needsClassNames = false;
  var needsNthChild = false;
  var ownIndex = -1;
  var elementIndex = -1;
  var siblings = parent.children();
  for (var i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
    var sibling = siblings[i];
    if (sibling.nodeType() !== Node.ELEMENT_NODE)
      continue;
    elementIndex += 1;
    if (sibling === node) {
      ownIndex = elementIndex;
      continue;
    }
    if (needsNthChild)
      continue;
    if (sibling.nodeNameInCorrectCase() !== nodeName)
      continue;

    needsClassNames = true;
    var ownClassNames = new Set(prefixedOwnClassNamesArray);
    if (!ownClassNames.size) {
      needsNthChild = true;
      continue;
    }
    var siblingClassNamesArray = prefixedElementClassNames(sibling);
    for (var j = 0; j < siblingClassNamesArray.length; ++j) {
      var siblingClass = siblingClassNamesArray[j];
      if (!ownClassNames.has(siblingClass))
        continue;
      ownClassNames.delete(siblingClass);
      if (!ownClassNames.size) {
        needsNthChild = true;
        break;
      }
    }
  }

  var result = nodeName;
  if (isTargetNode && nodeName.toLowerCase() === 'input' && node.getAttribute('type') && !node.getAttribute('id') &&
      !node.getAttribute('class'))
    result += '[type="' + node.getAttribute('type') + '"]';
  if (needsNthChild) {
    result += ':nth-child(' + (ownIndex + 1) + ')';
  } else if (needsClassNames) {
    for (var prefixedName of prefixedOwnClassNamesArray)
      result += '.' + escapeIdentifierIfNeeded(prefixedName.substr(1));
  }

  return new Elements.DOMPath.Step(result, false);
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} optimized
 * @return {string}
 */
Elements.DOMPath.xPath = function(node, optimized) {
  if (node.nodeType() === Node.DOCUMENT_NODE)
    return '/';

  var steps = [];
  var contextNode = node;
  while (contextNode) {
    var step = Elements.DOMPath._xPathValue(contextNode, optimized);
    if (!step)
      break;  // Error - bail out early.
    steps.push(step);
    if (step.optimized)
      break;
    contextNode = contextNode.parentNode;
  }

  steps.reverse();
  return (steps.length && steps[0].optimized ? '' : '/') + steps.join('/');
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} optimized
 * @return {?Elements.DOMPath.Step}
 */
Elements.DOMPath._xPathValue = function(node, optimized) {
  var ownValue;
  var ownIndex = Elements.DOMPath._xPathIndex(node);
  if (ownIndex === -1)
    return null;  // Error.

  switch (node.nodeType()) {
    case Node.ELEMENT_NODE:
      if (optimized && node.getAttribute('id'))
        return new Elements.DOMPath.Step('//*[@id="' + node.getAttribute('id') + '"]', true);
      ownValue = node.localName();
      break;
    case Node.ATTRIBUTE_NODE:
      ownValue = '@' + node.nodeName();
      break;
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
      ownValue = 'text()';
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      ownValue = 'processing-instruction()';
      break;
    case Node.COMMENT_NODE:
      ownValue = 'comment()';
      break;
    case Node.DOCUMENT_NODE:
      ownValue = '';
      break;
    default:
      ownValue = '';
      break;
  }

  if (ownIndex > 0)
    ownValue += '[' + ownIndex + ']';

  return new Elements.DOMPath.Step(ownValue, node.nodeType() === Node.DOCUMENT_NODE);
};

/**
 * @param {!SDK.DOMNode} node
 * @return {number}
 */
Elements.DOMPath._xPathIndex = function(node) {
  // Returns -1 in case of error, 0 if no siblings matching the same expression, <XPath index among the same expression-matching sibling nodes> otherwise.
  function areNodesSimilar(left, right) {
    if (left === right)
      return true;

    if (left.nodeType() === Node.ELEMENT_NODE && right.nodeType() === Node.ELEMENT_NODE)
      return left.localName() === right.localName();

    if (left.nodeType() === right.nodeType())
      return true;

    // XPath treats CDATA as text nodes.
    var leftType = left.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType();
    var rightType = right.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType();
    return leftType === rightType;
  }

  var siblings = node.parentNode ? node.parentNode.children() : null;
  if (!siblings)
    return 0;  // Root node - no siblings.
  var hasSameNamedElements;
  for (var i = 0; i < siblings.length; ++i) {
    if (areNodesSimilar(node, siblings[i]) && siblings[i] !== node) {
      hasSameNamedElements = true;
      break;
    }
  }
  if (!hasSameNamedElements)
    return 0;
  var ownIndex = 1;  // XPath indices start with 1.
  for (var i = 0; i < siblings.length; ++i) {
    if (areNodesSimilar(node, siblings[i])) {
      if (siblings[i] === node)
        return ownIndex;
      ++ownIndex;
    }
  }
  return -1;  // An error occurred: |node| not found in parent's children.
};

/**
 * @unrestricted
 */
Elements.DOMPath.Step = class {
  /**
   * @param {string} value
   * @param {boolean} optimized
   */
  constructor(value, optimized) {
    this.value = value;
    this.optimized = optimized || false;
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return this.value;
  }
};
