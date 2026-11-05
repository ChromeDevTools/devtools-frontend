// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify manually constructed ListControl.
 */

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';

export const listControl: RuleCreator = {
  create(context) {
    return {
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'ListControl', 'ListControl']) ||
            isIdentifierChain(node.callee, ['ListControl', 'ListControl']) ||
            isIdentifier(node.callee, 'ListControl')) {
          context.report({
            node,
            messageId: 'preferTemplateLiterals',
          });
        }
      },
    };
  },
};
