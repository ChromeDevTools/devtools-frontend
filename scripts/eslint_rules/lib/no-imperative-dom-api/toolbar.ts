// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed Toolbars.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Node = TSESTree.Node;

export const toolbar: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      getEvent(event) {
        switch (sourceCode.getText(event)) {
          case 'UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED':
            return 'change';
          case 'UI.Toolbar.ToolbarInput.Event.ENTER_PRESSED':
            return 'submit';
          case 'UI.Toolbar.ToolbarButton.Events.CLICK':
            return 'click';
          default:
            return null;
        }
      },
      methodCall(property, firstArg, _secondArg, domFragment) {
        if (isIdentifier(property, 'appendToolbarItem')) {
          domFragment.appendChild(firstArg, sourceCode);
          return true;
        }
        return false;
      },
      NewExpression(node) {
        const toolbarItem =
            isMemberExpression(node.callee, n => isIdentifierChain(n, ['UI', 'Toolbar']), n => n.type === 'Identifier');
        if (!toolbarItem) {
          return;
        }
        if (isIdentifier(toolbarItem, ['ToolbarFilter', 'ToolbarInput'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-toolbar-input';
          const type = isIdentifier(toolbarItem, 'ToolbarFilter') ? 'filter' : 'text';
          domFragment.attributes.push({
            key: 'type',
            value: type,
          });
          const args = [...node.arguments];
          const placeholder = args.shift();
          if (placeholder && !isIdentifier(placeholder, 'undefined')) {
            domFragment.attributes.push({
              key: 'placeholder',
              value: placeholder,
            });
          }
          if (type === 'text') {
            const accesiblePlaceholder = args.shift();
            if (accesiblePlaceholder && !isIdentifier(accesiblePlaceholder, 'undefined')) {
              domFragment.attributes.push({
                key: 'aria-label',
                value: accesiblePlaceholder,
              });
            }
          }
          const flexGrow = args.shift();
          if (flexGrow && !isIdentifier(flexGrow, 'undefined')) {
            domFragment.style.push({
              key: 'flex-grow',
              value: flexGrow,
            });
          }
          const flexShrink = args.shift();
          if (flexShrink && !isIdentifier(flexShrink, 'undefined')) {
            domFragment.style.push({
              key: 'flex-shrink',
              value: flexShrink,
            });
          }
          const title = args.shift();
          if (title && !isIdentifier(title, 'undefined')) {
            domFragment.attributes.push({
              key: 'title',
              value: title,
            });
          }
          const completions = args.shift();
          if (completions && !isIdentifier(completions, 'undefined')) {
            domFragment.attributes.push({
              key: 'list',
              value: 'completions',
            });
            const dataList = domFragment.appendChild(completions, sourceCode);
            dataList.tagName = 'datalist';
            dataList.attributes.push({
              key: 'id',
              value: 'completions',
            });
            dataList.textContent = completions;
          }
          args.shift();  // dynamicCompletions is not supported
          const jslogContext = args.shift();
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.attributes.push({
              key: 'id',
              value: jslogContext,
            });
          }
        }
        if (isIdentifier(toolbarItem, 'ToolbarButton')) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-button';
          const title = node.arguments[0];
          domFragment.bindings.push({
            key: 'variant',
            value: '${Buttons.Button.Variant.TOOLBAR}',
          });
          if (title && !isIdentifier(title, 'undefined')) {
            domFragment.attributes.push({
              key: 'title',
              value: title,
            });
          }
          const glyph = node.arguments[1];
          if (glyph && !isIdentifier(glyph, 'undefined')) {
            domFragment.bindings.push({
              key: 'iconName',
              value: glyph,
            });
          }
          const text = node.arguments[2];
          if (text && !isIdentifier(text, 'undefined')) {
            domFragment.textContent = text;
          }
          const jslogContext = node.arguments[3];
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.bindings.push({
              key: 'jslogContext',
              value: jslogContext,
            });
          }
        }
        if (isIdentifier(toolbarItem, ['ToolbarCheckbox', 'ToolbarSettingCheckbox'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-checkbox';
          const title = node.arguments[0];
          if (title && !isIdentifier(title, 'undefined')) {
            let text: Node|string = title;
            if (isIdentifier(toolbarItem, 'ToolbarSettingCheckbox')) {
              domFragment.directives.push({
                name: 'bindToSetting',
                arguments: [title],
              });
              const alternateTitle = node.arguments[2];
              if (alternateTitle && !isIdentifier(alternateTitle, 'undefined')) {
                text = alternateTitle;
              } else {
                text = '${' + sourceCode.getText(title) + '.title()}';
              }
            }
            domFragment.textContent = text;
          }
          const tooltip = node.arguments[1];
          if (tooltip && !isIdentifier(tooltip, 'undefined')) {
            domFragment.attributes.push({
              key: 'title',
              value: tooltip,
            });
          }
          if (isIdentifier(toolbarItem, 'ToolbarCheckbox')) {
            const listener = node.arguments[2];
            if (listener && !isIdentifier(listener, 'undefined')) {
              domFragment.eventListeners.push({
                key: 'click',
                value: listener,
              });
            }
            const jslogContext = node.arguments[3];
            if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
              domFragment.bindings.push({
                key: 'jslogContext',
                value: jslogContext,
              });
            }
          }
        }
      }
    };
  }
};
