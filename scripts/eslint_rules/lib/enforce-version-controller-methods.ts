// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'enforce-version-controller-methods',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Enforces that VersionController has the correct number of update methods and that they are contiguous.',
      category: 'Possible Errors',
    },
    messages: {
      incorrectMethodCount:
          'VersionController.CURRENT_VERSION is {{currentVersion}} but there are {{methodCount}} updateVersion methods. These numbers should match.',
      nonContiguousMethods:
          'Missing or non-contiguous updateVersion method: expected updateVersionFrom{{expectedFrom}}To{{expectedTo}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    return {
      ClassDeclaration(node) {
        if (node.id?.name !== 'VersionController') {
          return;
        }

        let currentVersion: number|undefined;
        let currentVersionNode: TSESTree.Node|undefined;
        const updateMethods: Array<{from: number, to: number, node: TSESTree.Node}> = [];

        for (const element of node.body.body) {
          if (element.type === 'PropertyDefinition' && element.static && element.key.type === 'Identifier' &&
              element.key.name === 'CURRENT_VERSION') {
            if (element.value?.type === 'Literal' && typeof element.value.value === 'number') {
              currentVersion = element.value.value;
              currentVersionNode = element.key;
            }
          }

          if (element.type === 'MethodDefinition' && element.key.type === 'Identifier') {
            const match = element.key.name.match(/^updateVersionFrom(\d+)To(\d+)$/);
            if (match) {
              updateMethods.push({
                from: parseInt(match[1], 10),
                to: parseInt(match[2], 10),
                node: element.key,
              });
            }
          }
        }

        if (currentVersion === undefined) {
          // If we can't find CURRENT_VERSION, assume it's valid or being enforced by another rule/type system.
          return;
        }

        if (updateMethods.length !== currentVersion) {
          context.report({
            node: currentVersionNode || node,
            messageId: 'incorrectMethodCount',
            data: {
              currentVersion,
              methodCount: updateMethods.length,
            }
          });
          // Don't report non-contiguous methods if the count is wrong to avoid spam
          return;
        }

        // Sort the methods just in case they are out of order in the file
        updateMethods.sort((a, b) => a.from - b.from);

        for (let i = 0; i < currentVersion; ++i) {
          const expectedFrom = i;
          const expectedTo = i + 1;
          const actual = updateMethods[i];

          if (actual?.from !== expectedFrom || actual.to !== expectedTo) {
            context.report({
              node: actual ? actual.node : (currentVersionNode || node),
              messageId: 'nonContiguousMethods',
              data: {
                expectedFrom,
                expectedTo,
              }
            });
            break;  // Only report the first missing method
          }
        }
      },
    };
  },
});
