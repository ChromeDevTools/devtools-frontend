// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to enforce that within TypeScript Types, optional properties should come last.
 * This is to avoid a bug where clang-format will incorrectly indent a type that's failing this.
 * @author Paul Irish
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define the message IDs used by the rule.
type MessageIds = 'optionalPropertyBeforeRequired';

// Define the structure of the options expected by the rule (none in this case).
type RuleOptions = [];

export default createRule<RuleOptions, MessageIds>({
  name: 'enforce-optional-properties-last',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce optional properties to be defined after required properties',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      optionalPropertyBeforeRequired: 'Optional property \'{{name}}\' should be defined after required properties.',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    function handleTypeElements(typeElements: TSESTree.TypeElement[]) {
      let misplacedOptionalProp: TSESTree.TSPropertySignature|null = null;

      for (const member of typeElements) {
        // We only care about TSPropertySignature members (key: type)
        if (member.type !== 'TSPropertySignature') {
          continue;
        }

        // Ensure the key is an Identifier for safe name access
        if (member.key.type !== 'Identifier') {
          continue;
        }

        if (member.optional) {
          misplacedOptionalProp = member;
        } else if (misplacedOptionalProp) {
          // Required property found after an optional one
          const requiredProp = member;
          const misplacedNode = misplacedOptionalProp;

          context.report({
            node: misplacedNode,
            messageId: 'optionalPropertyBeforeRequired',
            data: {
              name: 'name' in misplacedNode.key ? misplacedNode.key.name : 'unknown',
            },
            fix(fixer) {
              const optionalPropertyText = sourceCode.getText(misplacedNode);
              const requiredPropertyText = sourceCode.getText(requiredProp);

              // Swap the positions of the two properties
              return [
                fixer.replaceText(misplacedNode, requiredPropertyText),
                fixer.replaceText(requiredProp, optionalPropertyText),
              ];
            },
          });
        }
      }
    }

    return {
      TSTypeLiteral(node) {
        handleTypeElements(node.members);
      },
    };
  },
});
