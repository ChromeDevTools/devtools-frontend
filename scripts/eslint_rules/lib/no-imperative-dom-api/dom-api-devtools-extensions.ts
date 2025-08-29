// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Library to identify and templatize manually calls to DevTools DOM API extensions.
 */

import {isIdentifier, type RuleCreator} from './ast.ts';

export const domApiDevtoolsExtensions: RuleCreator = {
  create: function(context) {
    const sourceCode = context.sourceCode;

    return {
      methodCall(property, firstArg, secondArg, domFragment, call) {
        if (isIdentifier(property, 'createChild')) {
          if (firstArg?.type === 'Literal') {
            const childFragment = domFragment.appendChild(
                call, sourceCode,
                /* processed=*/ !['CallExpression', 'MemberExpression'].includes(call.parent?.type ?? ''));
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
