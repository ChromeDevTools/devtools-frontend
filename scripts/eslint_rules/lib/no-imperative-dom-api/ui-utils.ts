// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize UI.UIUtils and related calls.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Node = TSESTree.Node;

export const uiUtils: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        let func = isMemberExpression(
            node.callee, n => isIdentifierChain(n, ['UI', 'UIUtils', 'CheckboxLabel']),
            n => isIdentifier(n, ['create', 'createWithStringLiteral']));
        if (func) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-checkbox';
          const args = node.arguments;
          const title = args.shift();
          if (title && !isIdentifier(title, 'undefined')) {
            domFragment.textContent = title;
          }
          const checked = args.shift();
          if (checked && !isIdentifier(checked, 'undefined')) {
            domFragment.booleanAttributes.push({
              key: 'checked',
              value: checked,
            });
          }
          if (isIdentifier(func, 'create')) {
            args.shift();  // TODO(b/348173254): Support subtitle
          }
          const jslogContext = args.shift();
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.bindings.push({
              key: 'jslogContext',
              value: jslogContext,
            });
          }
          const small = args.shift();
          if (small && !isIdentifier(small, 'undefined')) {
            domFragment.classList.push('small');
          }
        }
        func =
            isMemberExpression(node.callee, n => isIdentifierChain(n, ['UI', 'UIUtils']), n => n.type === 'Identifier');
        if (!func) {
          return;
        }
        if (isIdentifier(func, 'createLabel')) {
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
        if (isIdentifier(func, 'createTextButton')) {
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
        if (isIdentifier(func, 'createInput')) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'input';
          domFragment.attributes.push({
            key: 'spellcheck',
            value: 'false',
          });
          domFragment.classList.push('harmony-input');
          const className = node.arguments[0];
          if (className && !isIdentifier(className, 'undefined')) {
            domFragment.classList.push(className);
          }
          const type = node.arguments[1];
          if (type && !isIdentifier(type, 'undefined')) {
            domFragment.attributes.push({
              key: 'type',
              value: type,
            });
          }
          const jslogContext = node.arguments[2];
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.attributes.push({
              key: 'jslog',
              value: '${VisualLogging.textField(' + sourceCode.getText(jslogContext) +
                  ').track({keydown: \'Enter\', change: true})}'
            });
          }
        }
        if (isIdentifier(func, 'createOption')) {
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
      functionCall(call, _firstArg, secondArg, domFragment) {
        if (isIdentifierChain(call.callee, ['UI', 'SettingsUI', 'bindCheckbox'])) {
          let setting = secondArg;
          if (setting.type === 'CallExpression' &&
              isMemberExpression(
                  setting.callee,
                  n => n.type === 'CallExpression' &&
                      isIdentifierChain(n.callee, ['Common', 'Settings', 'Settings', 'instance']),
                  n => isIdentifier(n, 'moduleSetting'))) {
            setting = setting.arguments[0];
          }
          domFragment.directives.push({
            name: 'bindToSetting',
            arguments: [setting],
          });
          return true;
        }
        if (isIdentifierChain(call.callee, ['UI', 'UIUtils', 'createTextChild'])) {
          domFragment.textContent = secondArg;
          return true;
        }
        if (isIdentifierChain(call.callee, ['UI', 'Tooltip', 'Tooltip', 'install'])) {
          domFragment.attributes.push({
            key: 'title',
            value: secondArg,
          });
          return true;
        }
        return false;
      },
    };
  }
};
