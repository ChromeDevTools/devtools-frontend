// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed Button.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;

export const button: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      propertyAssignment(property: Identifier, propertyValue: Node, domFragment: DomFragment) {
        if (domFragment.tagName === 'devtools-button') {
          if (isIdentifier(property, [
                'iconName', 'toggledIconName', 'toggleType', 'variant', 'size', 'reducedFocusRing', 'type',
                'toggleOnClick', 'toggled', 'active', 'spinner', 'jslogContext', 'longClickable', 'data'
              ])) {
            domFragment.bindings.push({
              key: property.name,
              value: propertyValue,
            });
            return true;
          }
        } else if (
            domFragment.tagName === 'devtools-icon' && isIdentifier(property, 'data') &&
            propertyValue.type === 'ObjectExpression') {
          for (const property of propertyValue.properties) {
            if (property.type !== 'Property' || property.key.type !== 'Identifier') {
              continue;
            }
            if (isIdentifier(property.key, 'iconName')) {
              domFragment.attributes.push({
                key: 'name',
                value: property.value,
              });
            } else {
              domFragment.style.push({
                key: property.key.name,
                value: property.value,
              });
            }
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
        if (isIdentifierChain(node.callee, ['IconButton', 'Icon', 'Icon'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-icon';
        }
      },
      CallExpression(node) {
        if (isIdentifierChain(node.callee, ['IconButton', 'Icon', 'create'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-icon';
          domFragment.attributes.push({
            key: 'name',
            value: node.arguments[0],
          });
          const className = node.arguments[1];
          if (className) {
            domFragment.classList.push(className);
          }
        }
      },
    };
  }
};
