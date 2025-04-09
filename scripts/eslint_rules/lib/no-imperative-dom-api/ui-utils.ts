// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to identify and templatize UI.UIUtils calls.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isMemberExpression} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';
type CallExpression = TSESTree.CallExpression;
type MemberExpression = TSESTree.MemberExpression;
type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;

export const uiUtils = {
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      CallExpression(node: CallExpression) {
        if (!isMemberExpression(
                node.callee, n => isMemberExpression(n, n => isIdentifier(n, 'UI'), n => isIdentifier(n, 'UIUtils')),
                n => n.type === 'Identifier')) {
          return;
        }
        const functionName = ((node.callee as MemberExpression).property as Identifier).name;
        if (functionName === 'createLabel') {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'label';
          const title = node.arguments[0];
          if (title) {
            domFragment.textContent = title;
          }
          const className = node.arguments[1];
          if (className) {
            domFragment.classList.push(className);
          }
          const associatedControl = node.arguments[2];
          if (associatedControl) {
            domFragment.appendChild(associatedControl, sourceCode);
          }
        }
        if (functionName === 'createTextButton') {
          const opts = node.arguments[2];
          if (opts && opts.type !== 'ObjectExpression') {
            return;
          }
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-button';
          const text = node.arguments[0];
          if (text) {
            domFragment.textContent = text;
          }
          const clickHandler = node.arguments[1];
          if (clickHandler) {
            domFragment.eventListeners.push({
              key: 'click',
              value: clickHandler,
            });
          }
          let variant: string|Node = 'Buttons.Button.Variant.OUTLINED';
          if (opts) {
            for (const property of opts.properties) {
              if (property.type !== 'Property') {
                continue;
              }
              if (isIdentifier(property.key, 'className')) {
                domFragment.classList.push(property.value);
              }
              if (isIdentifier(property.key, 'jslogContext')) {
                domFragment.bindings.push({
                  key: 'jslogContext',
                  value: property.value,
                });
              }
              if (isIdentifier(property.key, 'variant')) {
                variant = property.value;
              }
              if (isIdentifier(property.key, 'title')) {
                domFragment.attributes.push({
                  key: 'title',
                  value: property.value,
                });
              }
              if (isIdentifier(property.key, 'icon')) {
                domFragment.bindings.push({
                  key: 'iconName',
                  value: property.value,
                });
              }
            }
          }
          domFragment.bindings.push({
            key: 'variant',
            value: variant,
          });
        }
        if (functionName === 'createOption') {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'option';
          const title = node.arguments[0];
          if (title) {
            domFragment.textContent = title;
          }
          const value = node.arguments[1];
          if (value) {
            domFragment.attributes.push({
              key: 'value',
              value,
            });
          }
          const jslogContext = node.arguments[1];
          if (jslogContext) {
            domFragment.attributes.push({
              key: 'jslog',
              value: '${VisualLogging.dropDown(' + sourceCode.getText(jslogContext) + ').track({click: true})}',
            });
          }
        }
      },
    };
  }
};
