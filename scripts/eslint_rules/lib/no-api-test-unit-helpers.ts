// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-api-test-unit-helpers',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow TestUniverse and describeWithEnvironment in API tests.',
      category: 'Possible Errors',
    },
    messages: {
      noTestUniverse:
          '`TestUniverse` is not allowed in API tests. API tests should test foundation models against a real target page.',
      noDescribeWithEnvironment:
          '`describeWithEnvironment` is not allowed in API tests. API tests run against a real target page via ApiStateProvider.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Identifier(node: TSESTree.Identifier) {
        if (node.name !== 'TestUniverse' && node.name !== 'describeWithEnvironment') {
          return;
        }

        if (node.parent.type === 'ImportSpecifier' && node !== node.parent.local) {
          return;
        }
        if (node.parent.type === 'ExportSpecifier' && node !== node.parent.local) {
          return;
        }

        if (node.name === 'TestUniverse') {
          context.report({
            node,
            messageId: 'noTestUniverse',
          });
        } else {
          context.report({
            node,
            messageId: 'noDescribeWithEnvironment',
          });
        }
      },
    };
  },
});
