// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Disallow customized built-in elements.
 *
 * Cusomized built-in elements are not supported in Safari and will likely never
 * be supported in Safari ever, which has already caused problems for example
 * for http://trace.cafe (https://crbug.com/379694205).
 *
 * Customized built-in elemens are also incompatible with the Vision for the
 * Chrome DevTools UI Engineering.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/is
 * @see http://go/chrome-devtools:ui-engineering-proposal
 */
'use strict';

const BUILTIN_ELEMENT_REGEXP = /^HTML\w+Element$/;
const GLOBAL_THIS_NAMES = new Set(['globalThis', 'self', 'window']);

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Disallow customized built-in elements',
      category: 'Best Practices',
    },
    messages: {
      unexpectedCustomElementsDefineWithExtends: 'Unexpected call to `{{ callee }}` extending a built-in element. Customized built-in elements are disallowed, use an autonomous custom element instead',
      unexpectedExtendsBuiltinElement: 'Unexpected built-in element `{{ superClass }}` subclass. Customized built-in elements are disallowed, use an autonomous custom element instead',
    },
    schema: [],  // no options
  },
  create: function(context) {
    function isCustomElementsDefine(calleeNode) {
      if (calleeNode.type !== 'MemberExpression' ||
          calleeNode.property.type !== 'Identifier' ||
          calleeNode.property.name !== 'define') {
        return false;
      }
      // Test for the common case `customElements.define(...)`
      if (calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'customElements') {
        return true;
      }
      // Test for `globalThis.customElements.define(...)`
      return calleeNode.object.type === 'MemberExpression' &&
             calleeNode.object.property.type === 'Identifier' &&
             calleeNode.object.property.name === 'customElements' &&
             calleeNode.object.object.type === 'Identifier' &&
             GLOBAL_THIS_NAMES.has(calleeNode.object.object.name);
    }

    function isObjectLiteralWithProperty(node, propertyName) {
      if (node.type !== 'ObjectExpression') {
        return false;
      }
      for (const property of node.properties) {
        if (property.type === 'Property') {
          if (property.key.type === 'Identifier' &&
              property.key.name === propertyName) {
            return true;
          }
          if (property.key.type === 'Literal' &&
              property.key.value === propertyName) {
            return true;
          }
        }
      }
      return false;
    }

    function isBuiltinElementClass(superNode) {
      // Test for the common case `HTMLFooElement`.
      if (superNode.type === 'Identifier' && BUILTIN_ELEMENT_REGEXP.test(superNode.name)) {
        return true;
      }
      // Test for `globalThis.HTMLFooElement`
      return superNode.type === 'MemberExpression' && superNode.object.type === 'Identifier' &&
          GLOBAL_THIS_NAMES.has(superNode.object.name) && superNode.property.type === 'Identifier' &&
          BUILTIN_ELEMENT_REGEXP.test(superNode.property.name);
    }

    function reportError(node, messageId, data) {
      context.report({
        node,
        messageId,
        data,
      });
    }

    return {
      CallExpression(node) {
        if (isCustomElementsDefine(node.callee) &&
            node.arguments.length >= 3 &&
            isObjectLiteralWithProperty(node.arguments[2], 'extends')) {
          const {sourceCode} = context;
          const callee = sourceCode.getText(node.callee);
          reportError(node, 'unexpectedCustomElementsDefineWithExtends', {callee});
        }
      },

      ClassDeclaration(node) {
        if (node.superClass && isBuiltinElementClass(node.superClass)) {
          const {sourceCode} = context;
          const superClass = sourceCode.getText(node.superClass);
          reportError(node, 'unexpectedExtendsBuiltinElement', {superClass});
        }
      },
    };
  }
};
