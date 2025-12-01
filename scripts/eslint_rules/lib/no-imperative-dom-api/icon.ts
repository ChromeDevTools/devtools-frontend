// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed Icon.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;

export const icon: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      propertyAssignment(property: Identifier, propertyValue: Node, domFragment: DomFragment) {
        if (domFragment.tagName !== 'devtools-icon') {
          return false;
        }
        if (isIdentifier(property, 'data') && propertyValue.type === 'ObjectExpression') {
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
        if (isIdentifier(property, 'name')) {
          domFragment.attributes.push({
            key: 'name',
            value: propertyValue,
          });
          return true;
        }
        return false;
      },
      NewExpression(node) {
        if (isIdentifier(node.callee, 'Icon')) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-icon';
        }
      },
      CallExpression(node) {
        if (isIdentifier(node.callee, 'createIcon')) {
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
