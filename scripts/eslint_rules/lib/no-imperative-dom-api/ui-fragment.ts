// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize UI.Fragment and related calls.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type CallExpression = TSESTree.CallExpression;
type MemberExpression = TSESTree.MemberExpression;

export const uiFragment = {
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      MemberExpression(node: MemberExpression) {
        if (isIdentifierChain(node, ['UI', 'Fragment', 'Fragment', 'build']) &&
            node.parent?.type === 'TaggedTemplateExpression') {
          const domFragment = DomFragment.getOrCreate(node.parent, sourceCode);
          domFragment.expression =
              sourceCode.getText(node.parent.quasi)
                  .replace(
                      /\$=["']([^"']*)["']/g,
                      (_, id) =>
                          `\${ref(e => { output.${id.replace(/-[a-z]/g, c => c.substr(1).toUpperCase())} = e; })}`);
        }
      },
      CallExpression(node: CallExpression) {
        if (node.callee.type !== 'MemberExpression' || !isIdentifier(node.callee.property, ['element', '$'])) {
          return;
        }
        const object = node.callee.object;
        const objectFragment = DomFragment.get(object, sourceCode);
        if (!objectFragment || objectFragment.tagName || !objectFragment.expression?.startsWith('`')) {
          return;
        }
        if (isIdentifier(node.callee.property, 'element')) {
          DomFragment.set(node, sourceCode, objectFragment);
          for (const reference of objectFragment.references) {
            if (reference.node === object) {
              reference.processed = true;
              break;
            }
          }
        } else if (isIdentifier(node.callee.property, '$')) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'template';
          domFragment.attributes.push({
            key: 'id',
            value: node.arguments[0],
          });
        }
      }
    };
  }
};
