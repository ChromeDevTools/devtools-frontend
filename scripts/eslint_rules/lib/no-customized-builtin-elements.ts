// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Disallow customized built-in elements.
 * Cusomized built-in elements are not supported in Safari and will likely never
 * be supported in Safari ever, which has already caused problems for example
 * for http://trace.cafe (https://crbug.com/379694205).
 * Customized built-in elemens are also incompatible with the Vision for the
 * Chrome DevTools UI Engineering.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/is
 * @see http://go/chrome-devtools:ui-engineering-proposal
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define types based on TSESTree
type Node = TSESTree.Node;
type MemberExpression = TSESTree.MemberExpression;
type Identifier = TSESTree.Identifier;
type ObjectExpression = TSESTree.ObjectExpression;

// Define MessageIds used in the rule
type MessageIds =|'unexpectedCustomElementsDefineWithExtends'|'unexpectedExtendsBuiltinElement';

const BUILTIN_ELEMENT_REGEXP = /^HTML\w+Element$/;
const GLOBAL_THIS_NAMES = new Set(['globalThis', 'self', 'window']);

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

export default createRule<[], MessageIds>({
  // Add type parameters for options and messageIds
  name: 'no-customized-builtin-elements',  // Rule name should match the file name
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Disallow customized built-in elements',
      category: 'Best Practices',
    },
    messages: {
      // Define messages corresponding to MessageIds
      unexpectedCustomElementsDefineWithExtends:
          'Unexpected call to `{{ callee }}` extending a built-in element. Customized built-in elements are disallowed, use an autonomous custom element instead',
      unexpectedExtendsBuiltinElement:
          'Unexpected built-in element `{{ superClass }}` subclass. Customized built-in elements are disallowed, use an autonomous custom element instead',
    },
    schema: [],  // no options
  },
  defaultOptions: [],  // Add defaultOptions
  create: function(context) {
    // Type the node parameter
    function isCustomElementsDefine(calleeNode: Node): calleeNode is MemberExpression {
      if (calleeNode.type !== 'MemberExpression' || calleeNode.property.type !== 'Identifier' ||
          calleeNode.property.name !== 'define') {
        return false;
      }
      // Test for the common case `customElements.define(...)`
      if (calleeNode.object.type === 'Identifier' && calleeNode.object.name === 'customElements') {
        return true;
      }
      // Test for `globalThis.customElements.define(...)`
      return (
          calleeNode.object.type === 'MemberExpression' && calleeNode.object.property.type === 'Identifier' &&
          calleeNode.object.property.name === 'customElements' && calleeNode.object.object.type === 'Identifier' &&
          GLOBAL_THIS_NAMES.has(calleeNode.object.object.name));
    }

    // Type the node parameter
    function isObjectLiteralWithProperty(node: Node, propertyName: string): node is ObjectExpression {
      if (node.type !== 'ObjectExpression') {
        return false;
      }
      for (const property of node.properties) {
        // Ensure property is of type Property before accessing key
        if (property.type === 'Property') {
          if (property.key.type === 'Identifier' && property.key.name === propertyName) {
            return true;
          }
          if (property.key.type === 'Literal' && property.key.value === propertyName) {
            return true;
          }
        }
      }
      return false;
    }

    // Type the node parameter
    function isBuiltinElementClass(superNode: Node): superNode is Identifier|MemberExpression {
      // Test for the common case `HTMLFooElement`.
      if (superNode.type === 'Identifier' && BUILTIN_ELEMENT_REGEXP.test(superNode.name)) {
        return true;
      }
      // Test for `globalThis.HTMLFooElement`
      return (
          superNode.type === 'MemberExpression' && superNode.object.type === 'Identifier' &&
          GLOBAL_THIS_NAMES.has(superNode.object.name) && superNode.property.type === 'Identifier' &&
          BUILTIN_ELEMENT_REGEXP.test(superNode.property.name));
    }

    function reportError(node: Node, messageId: MessageIds, data?: Record<string, string>): void {
      context.report({
        node,
        messageId,
        data,
      });
    }

    const sourceCode = context.sourceCode;

    return {
      // Type the node parameter
      CallExpression(node) {
        if (isCustomElementsDefine(node.callee) && node.arguments.length >= 3 &&
            // Ensure argument exists and is a Node before passing
            node.arguments[2] && isObjectLiteralWithProperty(node.arguments[2], 'extends')) {
          // sourceCode is already defined above
          const callee = sourceCode.getText(node.callee);
          reportError(node, 'unexpectedCustomElementsDefineWithExtends', {
            callee,
          });
        }
      },

      ClassDeclaration(node) {
        if (node.superClass && isBuiltinElementClass(node.superClass)) {
          // sourceCode is already defined above
          const superClass = sourceCode.getText(node.superClass);
          reportError(node, 'unexpectedExtendsBuiltinElement', {superClass});
        }
      },
    };
  },
});
