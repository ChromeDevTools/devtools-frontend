// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prefer `readonly` keyword over the `ReadonlyArray` type utility.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Prefer `readonly` keyword over the `ReadonlyArray` type utility.',
      category: 'Best Practices',
    },
    messages: {
      useReadonlyKeyword: 'Prefer `readonly` keyword over the `ReadonlyArray` type utility'
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    function isReadonlyArrayTypeReference(node) {
      return node.typeName.type === 'Identifier' &&
             node.typeName.name === 'ReadonlyArray' &&
             node.typeArguments !== undefined &&
             node.typeArguments.params.length === 1;
    }

    function reportError(node) {
      context.report({
        node,
        messageId: 'useReadonlyKeyword',
        fix(fixer) {
          const {sourceCode} = context;
          const [param] = node.typeArguments.params;
          return fixer.replaceText(node, `readonly ${sourceCode.getText(param)}[]`);
        }
      });
    }

    return {
      TSTypeReference(node) {
        if (isReadonlyArrayTypeReference(node)) {
          reportError(node);
        }
      },
    };
  }
};
