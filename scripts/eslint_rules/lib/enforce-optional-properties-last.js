// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to enforce that within TypeScript Types, optional properties should come last. This is to avoid a bug where clang-format will incorrectly indent a type that's failing this.
 * @author Paul Irish
 */
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce optional properties to be defined after required properties',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],
  },

  create: function (context) {
    return {
      TSTypeAliasDeclaration(node) {
        const typeAnnotation = node.typeAnnotation;
        if (typeAnnotation.type === 'TSTypeLiteral') {
          let misplacedOptionalProp = null;
          for (const property of typeAnnotation.members) {
            if (property.optional) {
              misplacedOptionalProp = property;
            } else if (misplacedOptionalProp && !property.optional) {
              // Required property found after an optional one
              const requiredProp = property;
              context.report({
                node: misplacedOptionalProp,
                message: 'Optional property \'{{name}}\' should be defined after required properties.',
                data: {name: misplacedOptionalProp.key.name},
                fix(fixer) {
                  const sourceCode = context.getSourceCode();
                  const optionalPropertyText = sourceCode.getText(misplacedOptionalProp);
                  const requiredPropertyText = sourceCode.getText(requiredProp);

                  // Swap the positions of the two properties
                  return [fixer.replaceText(misplacedOptionalProp, requiredPropertyText), fixer.replaceText(requiredProp, optionalPropertyText)];
                },
              });
            }
          }
        }
      },
    };
  },
};
