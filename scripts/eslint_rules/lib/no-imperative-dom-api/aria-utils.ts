// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize UI.ARIAUtils calls.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression} from './ast.ts';
import type {DomFragment} from './dom-fragment.ts';

type Node = TSESTree.Node;
type CallExpression = TSESTree.CallExpression;

export const ariaUtils = {
  create(_) {
    return {
      functionCall(call: CallExpression, _firstArg: Node, _secondArg: Node, domFragment: DomFragment): boolean {
        const func = isMemberExpression(
            call.callee, n => isIdentifierChain(n, ['UI', 'ARIAUtils']), n => n.type === 'Identifier');
        if (!func) {
          return false;
        }
        if (isIdentifier(func, 'markAsPresentation')) {
          domFragment.attributes.push({
            key: 'role',
            value: 'presentation',
          });
          return true;
        }
        return false;
      },
    };
  }
};
