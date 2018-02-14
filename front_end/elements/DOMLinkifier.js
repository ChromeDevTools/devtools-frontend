// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Elements.DOMLinkifier = {};

/**
 * @param {!SDK.DOMNode} node
 * @param {!Element} parentElement
 * @param {string=} tooltipContent
 */
Elements.DOMLinkifier.decorateNodeLabel = function(node, parentElement, tooltipContent) {
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
  parentElement.title = tooltipContent || title;
};

/**
 * @param {?SDK.DOMNode} node
 * @param {string=} tooltipContent
 * @return {!Node}
 */
Elements.DOMLinkifier.linkifyNodeReference = function(node, tooltipContent) {
  if (!node)
    return createTextNode(Common.UIString('<node>'));

  var root = createElementWithClass('span', 'monospace');
  var shadowRoot = UI.createShadowRootWithCoreStyles(root, 'elements/domLinkifier.css');
  var link = shadowRoot.createChild('div', 'node-link');

  Elements.DOMLinkifier.decorateNodeLabel(node, link, tooltipContent);

  link.addEventListener('click', () => Common.Revealer.reveal(node, false) && false, false);
  link.addEventListener('mouseover', node.highlight.bind(node, undefined, undefined), false);
  link.addEventListener('mouseleave', () => SDK.OverlayModel.hideDOMNodeHighlight(), false);

  return root;
};

/**
 * @param {!SDK.DeferredDOMNode} deferredNode
 * @return {!Node}
 */
Elements.DOMLinkifier.linkifyDeferredNodeReference = function(deferredNode) {
  var root = createElement('div');
  var shadowRoot = UI.createShadowRootWithCoreStyles(root, 'elements/domLinkifier.css');
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
 * @implements {Common.Linkifier}
 */
Elements.DOMLinkifier.Linkifier = class {
  /**
   * @override
   * @param {!Object} object
   * @param {!Common.Linkifier.Options=} options
   * @return {!Node}
   */
  linkify(object, options) {
    if (object instanceof SDK.DOMNode)
      return Elements.DOMLinkifier.linkifyNodeReference(object, options ? options.title : undefined);
    if (object instanceof SDK.DeferredDOMNode)
      return Elements.DOMLinkifier.linkifyDeferredNodeReference(object);
    throw new Error('Can\'t linkify non-node');
  }
};
