// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize manually constructed Adorner.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';
type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;

export const adorner = {
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      propertyAssignment(property: Identifier, propertyValue: Node, domFragment: DomFragment) {
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
