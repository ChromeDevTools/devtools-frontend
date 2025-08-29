// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to ban usage of `adoptedStyleSheets`.
 * @see https://web.dev/articles/constructable-stylesheets
 * @author Benedikt Meurer
 */

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-adopted-style-sheets',
  meta: {
    type: 'problem',

    docs: {
      description: 'Disallow usage of adoptedStyleSheets',
      category: 'Possible Errors',
    },
    messages: {
      noAdoptedStyleSheetsProperty: 'The adoptedStyleSheets property is banned, use <style> elements instead.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type === 'Identifier' && node.property.name === 'adoptedStyleSheets') {
          context.report({node, messageId: 'noAdoptedStyleSheetsProperty'});
        }
      },
    };
  },
});
