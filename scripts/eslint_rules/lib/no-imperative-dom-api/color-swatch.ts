// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed ColorSwatch.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;

export const colorSwatch: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      propertyAssignment(property, propertyValue, domFragment) {
        if (domFragment.tagName === 'devtools-color-swatch' && isIdentifier(property, ['color', 'readonly'])) {
          domFragment.bindings.push({key: (property as Identifier).name, value: propertyValue});
          return true;
        }
        return false;
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['InlineEditor', 'ColorSwatch', 'ColorSwatch'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-color-swatch';
        }
      },
    };
  }
};
