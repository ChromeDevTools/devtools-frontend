// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

const allowedPaths = [
  'front_end/panels/recorder/',
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
    schema: []  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const filename = context.filename ?? context.getFilename();
    return {
      ClassDeclaration(node) {
        // Use `extends LitElement` as a signal.
        if (node.superClass?.type !== 'Identifier' || node.superClass?.name !== 'LitElement') {
          return;
        }
        // Existing components are still allowed.
        if (allowedPaths.some(path => filename.startsWith(path))) {
          return;
        }
        context.report({
          node,
          messageId: 'noNewLitElementComponents',
        });
      },
    };
  }
});
