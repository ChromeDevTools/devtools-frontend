// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'missingSuperCall';

type Options = [
  {
    methodNames: String[],
  },
];

export default createRule<Options, MessageIds>({
  name: 'require-super-calls-in-overridden-methods',
  meta: {
    type: 'problem',
    docs: {
      description: 'Checks that overridden methods contain super calls.',
      category: 'Possible Errors',
    },
    messages: {
      missingSuperCall: 'Missing call to super.{{ methodName }}() in overridden method {{ methodName }}.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          methodNames: {
            type: 'array',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    methodNames: [],
  }],
  create: function(context, options) {
    return {
      MethodDefinition(node) {
        if (!node.override || node.key.type !== 'Identifier' || !node.value.body) {
          return;
        }
        const methodName = node.key.name;
        if (!options[0].methodNames.includes(methodName)) {
          return;
        }

        const {body} = node.value;
        for (const statement of body.body) {
          if (statement.type !== 'ExpressionStatement') {
            continue;
          }
          if (statement.expression.type === 'CallExpression' &&
              statement.expression.callee.type === 'MemberExpression' &&
              statement.expression.callee.object.type === 'Super' &&
              statement.expression.callee.property.type === 'Identifier' &&
              statement.expression.callee.property.name === methodName) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'missingSuperCall',
          data: {methodName},
          fix(fixer) {
            const range: typeof body.range = [body.range[0], body.range[0] + 1];
            const text = ` super.${methodName}();`;
            return fixer.insertTextAfterRange(range, text);
          },
        });
      },
    };
  },
});
