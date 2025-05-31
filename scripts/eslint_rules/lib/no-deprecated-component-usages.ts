// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-deprecated-component-usages',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of deprecated component implementations.',
      category: 'Possible Errors',
    },
    messages: {
      noDevToolsSelectMenu:
          'Usage of this component implementation is deprecated. Please refer to the UX style guide (docs/styleguide/ux/components.md) for recomended implementation.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create(context) {
    const forbiddenString = '<devtools-select-menu';

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && node.value.includes(forbiddenString)) {
          context.report({
            node,
            messageId: 'noDevToolsSelectMenu',
          });
        }
      },
      TemplateElement(node: TSESTree.TemplateElement) {
        if (node.value.raw.includes(forbiddenString)) {
          context.report({
            node,
            messageId: 'noDevToolsSelectMenu',
          });
        }
      },
    };
  },
});
