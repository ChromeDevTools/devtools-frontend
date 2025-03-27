// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Library to identify and templatize manually construction of widgets.
 * $ npx tsc --noEmit --allowJS --checkJS --downlevelIteration scripts/eslint_rules/lib/no-imperative-dom-api.js
 */
'use strict';

const {isIdentifier} = require('./ast.js');
const {DomFragment} = require('./dom-fragment.js');

module.exports = {
  create : function(context) {
    const sourceCode = context.getSourceCode();
    return {
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression' && isIdentifier(node.property, 'contentElement')) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'div';
        }
      }
    };
  }
};
