// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to ban usage of expect from chai and default/namespace imports from chai
 */

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noChaiExpect'|'noChaiDefault'|'noChaiNamespace';

export default createRule<[], MessageIds>({
  name: 'prefer-chai-assert',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of expect from chai and default/namespace imports from chai',
      category: 'Possible Errors',
    },
    messages: {
      noChaiExpect: 'Using expect from chai is not allowed. Use assert instead.',
      noChaiDefault: 'Default import from chai is not allowed. Import { assert } instead.',
      noChaiNamespace: 'Namespace import from chai is not allowed. Import { assert } instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'chai') {
          return;
        }

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') {
            context.report({
              node: specifier,
              messageId: 'noChaiDefault',
            });
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            context.report({
              node: specifier,
              messageId: 'noChaiNamespace',
            });
          } else if (specifier.type === 'ImportSpecifier') {
            const importedName =
                specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
            if (importedName === 'expect') {
              context.report({
                node: specifier,
                messageId: 'noChaiExpect',
              });
            }
          }
        }
      },
    };
  },
});
