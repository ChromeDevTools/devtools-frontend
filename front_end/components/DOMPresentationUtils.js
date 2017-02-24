/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Components.DOMPresentationUtils = {};

/**
 * @param {!SDK.DOMNode} node
 * @param {!Element} parentElement
 */
Components.DOMPresentationUtils.decorateNodeLabel = function(node, parentElement) {
  var originalNode = node;
  var isPseudo = node.nodeType() === Node.ELEMENT_NODE && node.pseudoType();
  if (isPseudo && node.parentNode)
    node = node.parentNode;

  var title = node.nodeNameInCorrectCase();

  var nameElement = parentElement.createChild('span', 'node-label-name');
  nameElement.textContent = title;

  var idAttribute = node.getAttribute('id');
  if (idAttribute) {
    var idElement = parentElement.createChild('span', 'node-label-id');
    var part = '#' + idAttribute;
    title += part;
    idElement.createTextChild(part);

    // Mark the name as extra, since the ID is more important.
    nameElement.classList.add('extra');
  }

  var classAttribute = node.getAttribute('class');
  if (classAttribute) {
    var classes = classAttribute.split(/\s+/);
    var foundClasses = {};

    if (classes.length) {
      var classesElement = parentElement.createChild('span', 'extra node-label-class');
      for (var i = 0; i < classes.length; ++i) {
        var className = classes[i];
        if (className && !(className in foundClasses)) {
          var part = '.' + className;
          title += part;
          classesElement.createTextChild(part);
          foundClasses[className] = true;
        }
      }
    }
  }

  if (isPseudo) {
    var pseudoElement = parentElement.createChild('span', 'extra node-label-pseudo');
    var pseudoText = '::' + originalNode.pseudoType();
    pseudoElement.createTextChild(pseudoText);
    title += pseudoText;
  }
  parentElement.title = title;
};

/**
 * @param {!Element} container
 * @param {string} nodeTitle
 */
Components.DOMPresentationUtils.createSpansForNodeTitle = function(container, nodeTitle) {
  var match = nodeTitle.match(/([^#.]+)(#[^.]+)?(\..*)?/);
  container.createChild('span', 'webkit-html-tag-name').textContent = match[1];
  if (match[2])
    container.createChild('span', 'webkit-html-attribute-value').textContent = match[2];
  if (match[3])
    container.createChild('span', 'webkit-html-attribute-name').textContent = match[3];
};

/**
 * @param {?SDK.DOMNode} node
 * @param {string=} idref
 * @return {!Node}
 */
Components.DOMPresentationUtils.linkifyNodeReference = function(node, idref) {
  if (!node)
    return createTextNode(Common.UIString('<node>'));

  var root = createElementWithClass('span', 'monospace');
  var shadowRoot = UI.createShadowRootWithCoreStyles(root, 'components/domUtils.css');
  var link = shadowRoot.createChild('div', 'node-link');

  if (idref)
    link.createChild('span', 'node-label-id').createTextChild('#' + idref);
  else
    Components.DOMPresentationUtils.decorateNodeLabel(node, link);

  link.addEventListener('click', Common.Revealer.reveal.bind(Common.Revealer, node, undefined), false);
  link.addEventListener('mouseover', node.highlight.bind(node, undefined, undefined), false);
  link.addEventListener('mouseleave', SDK.DOMModel.hideDOMNodeHighlight.bind(SDK.DOMModel), false);

  return root;
};

/**
 * @param {!SDK.DeferredDOMNode} deferredNode
 * @return {!Node}
 */
Components.DOMPresentationUtils.linkifyDeferredNodeReference = function(deferredNode) {
  var root = createElement('div');
  var shadowRoot = UI.createShadowRootWithCoreStyles(root, 'components/domUtils.css');
  var link = shadowRoot.createChild('div', 'node-link');
  link.createChild('content');
  link.addEventListener('click', deferredNode.resolve.bind(deferredNode, onDeferredNodeResolved), false);
  link.addEventListener('mousedown', e => e.consume(), false);

  /**
   * @param {?SDK.DOMNode} node
   */
  function onDeferredNodeResolved(node) {
    Common.Revealer.reveal(node);
  }

  return root;
};

/**
 * @param {!SDK.Target} target
 * @param {string} originalImageURL
 * @param {boolean} showDimensions
 * @param {function(!Element=)} userCallback
 * @param {!Object=} precomputedFeatures
 */
Components.DOMPresentationUtils.buildImagePreviewContents = function(
    target, originalImageURL, showDimensions, userCallback, precomputedFeatures) {
  var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
  if (!resourceTreeModel) {
    userCallback();
    return;
  }
  var resource = resourceTreeModel.resourceForURL(originalImageURL);
  var imageURL = originalImageURL;
  if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
    imageURL = precomputedFeatures.currentSrc;
    resource = resourceTreeModel.resourceForURL(imageURL);
  }
  if (!isImageResource(resource)) {
    userCallback();
    return;
  }

  var imageElement = createElement('img');
  imageElement.addEventListener('load', buildContent, false);
  imageElement.addEventListener('error', errorCallback, false);
  resource.populateImageSource(imageElement);

  function errorCallback() {
    // Drop the event parameter when invoking userCallback.
    userCallback();
  }

  /**
   * @param {?SDK.Resource} resource
   * @return {boolean}
   */
  function isImageResource(resource) {
    return !!resource && resource.resourceType() === Common.resourceTypes.Image;
  }

  function buildContent() {
    var container = createElement('table');
    UI.appendStyle(container, 'components/imagePreview.css');
    container.className = 'image-preview-container';
    var naturalWidth = precomputedFeatures ? precomputedFeatures.naturalWidth : imageElement.naturalWidth;
    var naturalHeight = precomputedFeatures ? precomputedFeatures.naturalHeight : imageElement.naturalHeight;
    var offsetWidth = precomputedFeatures ? precomputedFeatures.offsetWidth : naturalWidth;
    var offsetHeight = precomputedFeatures ? precomputedFeatures.offsetHeight : naturalHeight;
    var description;
    if (showDimensions) {
      if (offsetHeight === naturalHeight && offsetWidth === naturalWidth) {
        description = Common.UIString('%d \xd7 %d pixels', offsetWidth, offsetHeight);
      } else {
        description = Common.UIString(
            '%d \xd7 %d pixels (Natural: %d \xd7 %d pixels)', offsetWidth, offsetHeight, naturalWidth, naturalHeight);
      }
    }

    container.createChild('tr').createChild('td', 'image-container').appendChild(imageElement);
    if (description)
      container.createChild('tr').createChild('td').createChild('span', 'description').textContent = description;
    if (imageURL !== originalImageURL) {
      container.createChild('tr').createChild('td').createChild('span', 'description').textContent =
          String.sprintf('currentSrc: %s', imageURL.trimMiddle(100));
    }
    userCallback(container);
  }
};

/**
 * @param {!SDK.Target} target
 * @param {!Components.Linkifier} linkifier
 * @param {!Protocol.Runtime.StackTrace=} stackTrace
 * @return {!Element}
 */
Components.DOMPresentationUtils.buildStackTracePreviewContents = function(target, linkifier, stackTrace) {
  var element = createElement('span');
  element.style.display = 'inline-block';
  var shadowRoot = UI.createShadowRootWithCoreStyles(element, 'components/domUtils.css');
  var contentElement = shadowRoot.createChild('table', 'stack-preview-container');

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   */
  function appendStackTrace(stackTrace) {
    for (var stackFrame of stackTrace.callFrames) {
      var row = createElement('tr');
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'function-name').textContent = UI.beautifyFunctionName(stackFrame.functionName);
      var link = linkifier.maybeLinkifyConsoleCallFrame(target, stackFrame);
      if (link) {
        row.createChild('td').textContent = ' @ ';
        row.createChild('td').appendChild(link);
      }
      contentElement.appendChild(row);
    }
  }

  if (!stackTrace)
    return element;

  appendStackTrace(stackTrace);

  var asyncStackTrace = stackTrace.parent;
  while (asyncStackTrace) {
    if (!asyncStackTrace.callFrames.length) {
      asyncStackTrace = asyncStackTrace.parent;
      continue;
    }
    var row = contentElement.createChild('tr');
    row.createChild('td').textContent = '\n';
    row.createChild('td', 'stack-preview-async-description').textContent =
        UI.asyncStackTraceLabel(asyncStackTrace.description);
    row.createChild('td');
    row.createChild('td');
    appendStackTrace(asyncStackTrace);
    asyncStackTrace = asyncStackTrace.parent;
  }

  return element;
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} justSelector
 * @return {string}
 */
Components.DOMPresentationUtils.fullQualifiedSelector = function(node, justSelector) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return node.localName() || node.nodeName().toLowerCase();
  return Components.DOMPresentationUtils.cssPath(node, justSelector);
};

/**
 * @param {!SDK.DOMNode} node
 * @return {string}
 */
Components.DOMPresentationUtils.simpleSelector = function(node) {
  var lowerCaseName = node.localName() || node.nodeName().toLowerCase();
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return lowerCaseName;
  if (lowerCaseName === 'input' && node.getAttribute('type') && !node.getAttribute('id') && !node.getAttribute('class'))
    return lowerCaseName + '[type="' + node.getAttribute('type') + '"]';
  if (node.getAttribute('id'))
    return lowerCaseName + '#' + node.getAttribute('id');
  if (node.getAttribute('class')) {
    return (lowerCaseName === 'div' ? '' : lowerCaseName) + '.' +
        node.getAttribute('class').trim().replace(/\s+/g, '.');
  }
  return lowerCaseName;
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} optimized
 * @return {string}
 */
Components.DOMPresentationUtils.cssPath = function(node, optimized) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return '';

  var steps = [];
  var contextNode = node;
  while (contextNode) {
    var step = Components.DOMPresentationUtils._cssPathStep(contextNode, !!optimized, contextNode === node);
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
 * @return {?Components.DOMNodePathStep}
 */
Components.DOMPresentationUtils._cssPathStep = function(node, optimized, isTargetNode) {
  if (node.nodeType() !== Node.ELEMENT_NODE)
    return null;

  var id = node.getAttribute('id');
  if (optimized) {
    if (id)
      return new Components.DOMNodePathStep(idSelector(id), true);
    var nodeNameLower = node.nodeName().toLowerCase();
    if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html')
      return new Components.DOMNodePathStep(node.nodeNameInCorrectCase(), true);
  }
  var nodeName = node.nodeNameInCorrectCase();

  if (id)
    return new Components.DOMNodePathStep(nodeName + idSelector(id), true);
  var parent = node.parentNode;
  if (!parent || parent.nodeType() === Node.DOCUMENT_NODE)
    return new Components.DOMNodePathStep(nodeName, true);

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
    return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
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

  return new Components.DOMNodePathStep(result, false);
};

/**
 * @param {!SDK.DOMNode} node
 * @param {boolean=} optimized
 * @return {string}
 */
Components.DOMPresentationUtils.xPath = function(node, optimized) {
  if (node.nodeType() === Node.DOCUMENT_NODE)
    return '/';

  var steps = [];
  var contextNode = node;
  while (contextNode) {
    var step = Components.DOMPresentationUtils._xPathValue(contextNode, optimized);
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
 * @return {?Components.DOMNodePathStep}
 */
Components.DOMPresentationUtils._xPathValue = function(node, optimized) {
  var ownValue;
  var ownIndex = Components.DOMPresentationUtils._xPathIndex(node);
  if (ownIndex === -1)
    return null;  // Error.

  switch (node.nodeType()) {
    case Node.ELEMENT_NODE:
      if (optimized && node.getAttribute('id'))
        return new Components.DOMNodePathStep('//*[@id="' + node.getAttribute('id') + '"]', true);
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

  return new Components.DOMNodePathStep(ownValue, node.nodeType() === Node.DOCUMENT_NODE);
};

/**
 * @param {!SDK.DOMNode} node
 * @return {number}
 */
Components.DOMPresentationUtils._xPathIndex = function(node) {
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
Components.DOMNodePathStep = class {
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

/**
 * @interface
 */
Components.DOMPresentationUtils.MarkerDecorator = function() {};

Components.DOMPresentationUtils.MarkerDecorator.prototype = {
  /**
   * @param {!SDK.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {}
};

/**
 * @implements {Components.DOMPresentationUtils.MarkerDecorator}
 * @unrestricted
 */
Components.DOMPresentationUtils.GenericDecorator = class {
  /**
   * @param {!Runtime.Extension} extension
   */
  constructor(extension) {
    this._title = Common.UIString(extension.title());
    this._color = extension.descriptor()['color'];
  }

  /**
   * @override
   * @param {!SDK.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {
    return {title: this._title, color: this._color};
  }
};
