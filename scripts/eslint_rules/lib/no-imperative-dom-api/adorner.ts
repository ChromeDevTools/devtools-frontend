// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed Adorner.
 */

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const adorner: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      propertyAssignment(property, propertyValue, domFragment) {
        if (domFragment.tagName === 'devtools-adorner' && isIdentifier(property, 'data') &&
            propertyValue.type === 'ObjectExpression') {
          for (const property of propertyValue.properties) {
            if (property.type !== 'Property') {
              continue;
            }
            if (isIdentifier(property.key, 'name')) {
              domFragment.attributes.push({
                key: 'aria-label',
                value: property.value,
              });
            }
            if (isIdentifier(property.key, 'jslogContext')) {
              domFragment.attributes.push(
                  {key: 'jslog', value: '${VisualLogging.adorner(' + sourceCode.getText(property.value) + ')}'});
            }
            if (isIdentifier(property.key, 'content')) {
              domFragment.appendChild(property.value, sourceCode);
            }
          }
          return true;
        }
        return false;
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['Adorners', 'Adorner', 'Adorner'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-adorner';
        }
      },
    };
  }
};
