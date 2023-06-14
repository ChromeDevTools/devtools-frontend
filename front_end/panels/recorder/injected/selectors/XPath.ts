// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SelectorPart, type Selector} from './Selector.js';

const attributeSelector = (name: string, value: string): string => {
  return `//*[@${name}=${JSON.stringify(value)}]`;
};

const getSelectorPart = (
    node: Node,
    optimized?: boolean,
    attributes: string[] = [],
    ): SelectorPart|undefined => {
  let value: string;
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (!(node instanceof Element)) {
        return;
      }
      if (optimized) {
        for (const attribute of attributes) {
          value = node.getAttribute(attribute) ?? '';
          if (value) {
            return new SelectorPart(attributeSelector(attribute, value), true);
          }
        }
      }
      if (node.id) {
        return new SelectorPart(attributeSelector('id', node.id), true);
      }
      value = node.localName;
      break;
    case Node.ATTRIBUTE_NODE:
      value = '@' + node.nodeName;
      break;
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
      value = 'text()';
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      value = 'processing-instruction()';
      break;
    case Node.COMMENT_NODE:
      value = 'comment()';
      break;
    case Node.DOCUMENT_NODE:
      value = '';
      break;
    default:
      value = '';
      break;
  }

  const index = getXPathIndexInParent(node);
  if (index > 0) {
    value += `[${index}]`;
  }

  return new SelectorPart(value, node.nodeType === Node.DOCUMENT_NODE);
};

const getXPathIndexInParent = (node: Node): number => {
  /**
   * @returns -1 in case of error, 0 if no siblings matching the same expression,
   * XPath index among the same expression-matching sibling nodes otherwise.
   */
  function areNodesSimilar(left: Node, right: Node): boolean {
    if (left === right) {
      return true;
    }

    if (left instanceof Element && right instanceof Element) {
      return left.localName === right.localName;
    }

    if (left.nodeType === right.nodeType) {
      return true;
    }

    // XPath treats CDATA as text nodes.
    const leftType = left.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType;
    const rightType = right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;
    return leftType === rightType;
  }

  const children = node.parentNode ? node.parentNode.children : null;
  if (!children) {
    return 0;
  }
  let hasSameNamedElements;
  for (let i = 0; i < children.length; ++i) {
    if (areNodesSimilar(node, children[i]) && children[i] !== node) {
      hasSameNamedElements = true;
      break;
    }
  }
  if (!hasSameNamedElements) {
    return 0;
  }
  let ownIndex = 1;  // XPath indices start with 1.
  for (let i = 0; i < children.length; ++i) {
    if (areNodesSimilar(node, children[i])) {
      if (children[i] === node) {
        return ownIndex;
      }
      ++ownIndex;
    }
  }

  throw new Error(
      'This is impossible; a child must be the child of the parent',
  );
};

/**
 * Computes the XPath for a node.
 *
 * @param node - The node to compute.
 * @param optimized - Whether to optimize the XPath for the node. Does not imply
 * the XPath is shorter; implies the XPath will be highly-scoped to the node.
 * @returns The computed XPath.
 *
 * @internal
 */
export const computeXPath = (
    node: Node,
    optimized?: boolean,
    attributes?: string[],
    ): Selector|undefined => {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return '/';
  }

  const selectors = [];

  const buffer = [];
  let contextNode: Node|null = node;
  while (contextNode !== document && contextNode) {
    const part = getSelectorPart(contextNode, optimized, attributes);
    if (!part) {
      return;
    }
    buffer.unshift(part);
    if (part.optimized) {
      contextNode = contextNode.getRootNode();
    } else {
      contextNode = contextNode.parentNode;
    }
    if (contextNode instanceof ShadowRoot) {
      selectors.unshift((buffer[0].optimized ? '' : '/') + buffer.join('/'));
      buffer.splice(0, buffer.length);
      contextNode = contextNode.host;
    }
  }

  if (buffer.length) {
    selectors.unshift((buffer[0].optimized ? '' : '/') + buffer.join('/'));
  }

  if (!selectors.length || selectors.length > 1) {
    // XPath evaluation does not work on shadowRoot.
    return;
  }

  return selectors;
};
