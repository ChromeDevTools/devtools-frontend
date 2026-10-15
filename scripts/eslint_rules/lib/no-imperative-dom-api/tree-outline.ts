// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify manually constructed TreeOutline and TreeElement.
 */

import {isIdentifierChain, type RuleCreator} from './ast.ts';

export const treeOutline: RuleCreator = {
  create(context) {
    return {
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'TreeOutline', 'TreeOutline']) ||
            isIdentifierChain(node.callee, ['UI', 'TreeOutline', 'TreeOutlineInShadow']) ||
            isIdentifierChain(node.callee, ['UI', 'TreeOutline', 'TreeElement'])) {
          context.report({
            node,
            messageId: 'preferTemplateLiterals',
          });
        }
      },
    };
  },
};
