// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import {createRule} from './utils/ruleCreator.ts';

const allowedPaths = [
  'front_end/ui/components/suggestion_input/',
];

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
    const filename = context.filename;
    const normalizedFilename = path.normalize(filename);
    if (allowedPaths.some(allowedPath => normalizedFilename.includes(path.normalize(allowedPath)))) {
      return {};
    }

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
