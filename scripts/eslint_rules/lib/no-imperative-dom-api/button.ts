// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize manually constructed Button.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';
type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;

export const button = {
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      propertyAssignment(property: Identifier, propertyValue: Node, domFragment: DomFragment) {
        if (domFragment.tagName !== 'devtools-button') {
          return false;
        }
        if (isIdentifier(property, [
              'iconName', 'toggledIconName', 'toggleType', 'variant', 'size', 'reducedFocusRing', 'type',
              'toggleOnClick', 'toggled', 'active', 'spinner', 'jslogContext', 'longClickable'
            ])) {
          domFragment.bindings.push({
            key: property.name,
            value: propertyValue,
          });
          return true;
        }
        if (isIdentifier(property, 'data') && propertyValue.type === 'ObjectExpression') {
          for (const property of propertyValue.properties) {
            if (property.type !== 'Property' || property.key.type !== 'Identifier') {
              continue;
            }
            domFragment.bindings.push({
              key: property.key.name,
              value: property.value,
            });
          }
          return true;
        }
        return false;
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['Buttons', 'Button', 'Button'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-button';
        }
      },
    };
  }
};
