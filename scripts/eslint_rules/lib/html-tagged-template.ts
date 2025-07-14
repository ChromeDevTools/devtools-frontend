// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type ImportDeclaration = TSESTree.ImportDeclaration;
type RuleFix = TSESLint.RuleFix;

export default createRule({
  name: 'html-tagged-template',
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of Lit.html',
      category: 'Possible Errors',
    },
    messages: {
      useUnqualifiedHtmlTaggedTemplate: 'Use unqualified html tagged template for compatibility with lit-analyzer',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    let lastImport: ImportDeclaration|null = null;
    let shorthandDefined = false;
    return {
      ImportDeclaration(node) {
        lastImport = node;
      },
      VariableDeclarator(node) {
        const scope = sourceCode.getScope(node);
        if (scope.type !== 'module') {
          return;
        }
        if (node.id.type === 'Identifier' && node.id.name === 'html') {
          shorthandDefined = true;
        }

        if (node.id.type !== 'ObjectPattern') {
          return;
        }

        for (const property of node.id.properties || []) {
          if (property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'html') {
            shorthandDefined = true;
          }
        }
      },
      TaggedTemplateExpression(node) {
        const tag = node.tag;
        if (tag.type === 'MemberExpression' && tag.object.type === 'Identifier' && tag.object.name === 'Lit' &&
            tag.property.type === 'Identifier' && tag.property.name === 'html') {
          context.report({
            node,
            messageId: 'useUnqualifiedHtmlTaggedTemplate',
            fix(fixer) {
              const result: RuleFix[] = [];
              if (tag.object?.range?.[0] && tag.property?.range?.[0]) {
                result.push(
                    fixer.removeRange([
                      tag.object.range[0],
                      tag.property.range[0],
                    ]),
                );
              }

              if (lastImport && !shorthandDefined) {
                result.push(
                    fixer.insertTextAfter(lastImport, '\n\nconst {html} = Lit;'),
                );
                shorthandDefined = true;
              }
              return result;
            },
          });
        }
      },
    };
  },
});
