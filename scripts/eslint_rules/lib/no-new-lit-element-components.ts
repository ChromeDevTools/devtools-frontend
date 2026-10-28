// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-new-lit-element-components',
  meta: {
    type: 'problem',
    docs: {
      description: 'Check that no new LitElement components are introduced',
      category: 'Possible Errors',
    },
    messages: {
      noNewLitElementComponents: 'New LitElement components are banned.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      ClassDeclaration(node) {
        // Use `extends LitElement` or `extends Lit.LitElement` as a signal.
        const isLitElementIdentifier = node.superClass?.type === 'Identifier' && node.superClass.name === 'LitElement';
        const isLitElementMember = node.superClass?.type === 'MemberExpression' &&
            node.superClass.property.type === 'Identifier' && node.superClass.property.name === 'LitElement';
        if (!isLitElementIdentifier && !isLitElementMember) {
          return;
        }
        context.report({
          node,
          messageId: 'noNewLitElementComponents',
        });
      },
    };
  },
});
