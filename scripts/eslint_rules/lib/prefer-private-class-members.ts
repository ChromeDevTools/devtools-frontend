// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'prefer-private-class-members',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer private properties over regular properties with `private` modifier',
      category: 'Possible Errors',
    },
    schema: [],  // no options
    messages: {
      doNotUsePrivate: 'Use private properties (starting with `#`) rather than the `private` modifier.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    function isTypeScriptPrivate(node: TSESTree.MethodDefinition|TSESTree.PropertyDefinition) {
      if (node.type === 'MethodDefinition' && node.kind === 'constructor') {
        return;
      }
      if (node.accessibility === 'private') {
        context.report({
          node: node.key,
          messageId: 'doNotUsePrivate',
        });
      }
    }

    return {
      MethodDefinition(node) {
        isTypeScriptPrivate(node);
      },
      PropertyDefinition(node) {
        isTypeScriptPrivate(node);
      }
    };
  }
});
