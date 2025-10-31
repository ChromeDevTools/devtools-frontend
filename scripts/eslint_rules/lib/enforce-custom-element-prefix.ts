// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/types';

import {createRule} from './utils/ruleCreator.ts';

function getTextValue(node: TSESTree.Node): string|undefined {
  if (node.type === 'Literal') {
    return node.value?.toString();
  }
  if (node.type === 'TemplateLiteral') {
    if (node.quasis.length === 0) {
      return;
    }
    return node.quasis[0].value.cooked;
  }
  return;
}

export default createRule({
  name: 'enforce-custom-element-prefix',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that all customElements.define() calls use a "devtools-" prefix for the tag name.',
      category: 'Possible Errors',
    },
    messages: {
      onlyStatic: 'Custom element tag name should be called with static string.',
      missingPrefix: 'Custom element tag name \'{{tagName}}\' must be prefixed with \'devtools-\'.',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // customElements.define(<string>, <class>);
        if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier' ||
            callee.object.name !== 'customElements' || callee.property.type !== 'Identifier' ||
            callee.property.name !== 'define') {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg) {
          return;
        }

        const tagName = getTextValue(firstArg);

        if (typeof tagName !== 'string') {
          context.report({
            node: firstArg,
            messageId: 'onlyStatic',
          });
          return;
        }

        if (!tagName.startsWith('devtools-')) {
          context.report({
            node: firstArg,
            messageId: 'missingPrefix',
            data: {
              tagName,
            },
          });
        }
      },
    };
  },
});
