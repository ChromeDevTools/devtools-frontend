// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const allowedPaths = [
  'front_end/panels/recorder/',
  'front_end/panels/protocol_monitor/components/',
  'front_end/ui/components/suggestion_input/',
];
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check that no new LitElement components are introduced',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ClassDeclaration(node) {
        const filename = context.getFilename();
        // Use `extends LitElement` as a signal.
        if (node.superClass?.name !== 'LitElement') {
          return;
        }
        // Existing components are still allowed.
        if (allowedPaths.some(path => filename.startsWith(path))) {
          return;
        }
        context.report({
          node,
          message:
              'New LitElement components are banned.',
        });
      },
    };
  }
};
