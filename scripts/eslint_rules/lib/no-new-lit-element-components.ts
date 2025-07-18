// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

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
    const filename = context.filename;
    return {
      ClassDeclaration(node) {
        // Use `extends LitElement` as a signal.
        if (node.superClass?.type !== 'Identifier' || node.superClass?.name !== 'LitElement') {
          return;
        }
        // Existing components are still allowed.
        // This needs to use includes if we resolve the full path
        if (allowedPaths.some(allowedPath => path.normalize(filename).includes(path.normalize(allowedPath)))) {
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
