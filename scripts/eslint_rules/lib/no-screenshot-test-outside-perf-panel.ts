// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

import {createRule} from './utils/ruleCreator.ts';

const PERFORMANCE_PANEL_INTERACTION_TESTS_PATH = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'test',
    'interactions',
    'panels',
    'performance',
);
const UI_COMPONENTS_PATH = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'test',
    'interactions',
    'ui',
    'components',
);

export default createRule({
  name: 'no-screenshot-test-outside-perf-panel',
  meta: {
    type: 'problem',
    docs: {
      description: 'Bans writing screenshot tests outside the directory for the Performance Panel interaction tests.',
      category: 'Possible Errors',
    },
    messages: {
      invalidScreenshotTest:
          'It is banned to write screenshot tests outside the directory of the Performance Panel interaction tests or UI components tests.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const filename: string = context.filename;
    const absoluteFileName: string = path.resolve(filename);

    if (absoluteFileName.includes(PERFORMANCE_PANEL_INTERACTION_TESTS_PATH) ||
        absoluteFileName.includes(UI_COMPONENTS_PATH)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'itScreenshot') {
          context.report({
            node,
            messageId: 'invalidScreenshotTest',
          });
        }
      },

      MemberExpression(node) {
        if (node.object.type === 'Identifier' && node.object.name === 'itScreenshot' &&
            node.property.type === 'Identifier' && (node.property.name === 'skip' || node.property.name === 'only')) {
          context.report({
            node,
            messageId: 'invalidScreenshotTest',
          });
        }
      },
    };
  },
});
