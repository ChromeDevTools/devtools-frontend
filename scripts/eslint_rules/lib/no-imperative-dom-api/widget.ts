// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Library to identify and templatize manually construction of widgets.
 */

import {isIdentifier} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const widget = {
  create: function(context) {
    const sourceCode = context.getSourceCode();
    return {
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression' && isIdentifier(node.property, ['element', 'contentElement'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'div';
        }
      }
    };
  }
};
