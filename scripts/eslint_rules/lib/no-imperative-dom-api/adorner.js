// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize manually constructed Adorner.
 */
'use strict';

const {isIdentifier, isMemberExpression} = require('./ast.js');
const {DomFragment} = require('./dom-fragment.js');

/** @typedef {import('eslint').Rule.Node} Node */

module.exports = {
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      /**
       * @param {Node} property
       * @param {Node} propertyValue
       * @param {DomFragment} domFragment
       */
      propertyAssignment(property, propertyValue, domFragment) {
        if (domFragment.tagName === 'devtools-adorner' && isIdentifier(property, 'data') &&
            propertyValue.type === 'ObjectExpression') {
          for (const property of propertyValue.properties) {
            if (property.type !== 'Property') {
              continue;
            }
            const key = /** @type {Node} */ (property.key);
            if (isIdentifier(key, 'name')) {
              domFragment.attributes.push({
                key: 'aria-label',
                value: /** @type {Node} */ (property.value),
              });
            }
            if (isIdentifier(key, 'jslogContext')) {
              domFragment.attributes.push(
                  {key: 'jslog', value: '${VisualLogging.adorner(' + sourceCode.getText(property.value) + ')}'});
            }
            if (isIdentifier(key, 'content')) {
              const childFragment = DomFragment.getOrCreate(/** @type {Node} */ (property.value), sourceCode);
              childFragment.parent = domFragment;
              domFragment.children.push(childFragment);
            }
          }
        }
      },
      NewExpression(node) {
        if (isMemberExpression(
                node.callee,
                n => isMemberExpression(n, n => isIdentifier(n, 'Adorners'), n => isIdentifier(n, 'Adorner')),
                n => isIdentifier(n, 'Adorner'))) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-adorner';
        }
      },
    };
  }
};
