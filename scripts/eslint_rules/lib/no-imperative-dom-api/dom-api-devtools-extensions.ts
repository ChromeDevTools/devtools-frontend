// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Library to identify and templatize manually calls to DevTools DOM API extensions.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier} from './ast.ts';
import type {DomFragment} from './dom-fragment.ts';
type Node = TSESTree.Node;

export const domApiDevtoolsExtensions = {
  create: function(context) {
    const sourceCode = context.getSourceCode();

    return {
      methodCall(property: Node, firstArg: Node, secondArg: Node, domFragment: DomFragment, call: Node): boolean {
        if (isIdentifier(property, 'createChild')) {
          if (firstArg?.type === 'Literal') {
            const childFragment =
                domFragment.appendChild(call, sourceCode, /* processed=*/ call.parent?.type !== 'CallExpression');
            childFragment.tagName = String(firstArg.value);
            if (secondArg) {
              childFragment.classList.push(secondArg);
            }
            return true;
          }
        }
        return false;
      },
    };
  },
};
