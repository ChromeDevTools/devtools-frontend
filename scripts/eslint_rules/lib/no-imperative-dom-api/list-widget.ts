// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify manually constructed ListWidget and Editor.
 */

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';

export const listWidget: RuleCreator = {
  create(context) {
    return {
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'ListWidget', 'ListWidget']) ||
            isIdentifierChain(node.callee, ['UI', 'ListWidget', 'Editor']) ||
            isIdentifierChain(node.callee, ['ListWidget', 'ListWidget']) ||
            isIdentifierChain(node.callee, ['ListWidget', 'Editor']) || isIdentifier(node.callee, 'ListWidget')) {
          context.report({
            node,
            messageId: 'preferTemplateLiterals',
          });
        }
      },
    };
  },
};
