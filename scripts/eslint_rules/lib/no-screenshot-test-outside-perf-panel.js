// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const PERFORMANCE_PANEL_INTERACTION_TESTS_PATH =
    path.join(__dirname, '..', '..', '..', 'test', 'interactions', 'panels', 'performance');
const UI_COMPONENTS_PATH = path.join(__dirname, '..', '..', '..', 'test', 'interactions', 'ui', 'components');

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta : {
    type : 'problem',

    docs : {
      description :  'Bans writting screenshot tests outside the directory for the Performance Panel interaction tests.',
      category : 'Possible Errors',
    },
    fixable : 'code',
    messages : {
      invalidScreenshotTest : 'It is banned to write screenshot tests outside the directory of the Performance Panel interaction tests.',
    },
    schema : []
  },
  create : function(context) {
    const filename = context.filename ?? context.getFilename();
    const fileName = path.resolve(filename);
    function reportPathIfInvalid(node) {
      if (!fileName.includes(PERFORMANCE_PANEL_INTERACTION_TESTS_PATH) && !fileName.includes(UI_COMPONENTS_PATH)) {
        context.report({
          node,
          messageId: 'invalidScreenshotTest'
        });
      }
    }

    return {
      'CallExpression[callee.type="Identifier"][callee.name="itScreenshot"], MemberExpression'(node) {
        const isScreenshotTest = node.type === 'CallExpression';
        const isSkippedScreenshotTest = (node.property?.name === 'skip' && node.object?.name === 'itScreenshot' );
        if (isScreenshotTest || isSkippedScreenshotTest) {
          reportPathIfInvalid(node);
        }
      },
    };
  }
};
