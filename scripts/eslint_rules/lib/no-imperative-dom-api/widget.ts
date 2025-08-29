// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Library to identify and templatize manually construction of widgets.
 */
import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression, type RuleCreator} from './ast.ts';
import {ClassMember} from './class-member.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;
type MemberExpression = TSESTree.MemberExpression;

export const widget: RuleCreator = {
  create: function(context) {
    const sourceCode = context.sourceCode;

    return {
      methodCall(property, firstArg, secondArg, domFragment) {
        if (domFragment.tagName !== 'devtools-widget') {
          return false;
        }
        if (isIdentifier(property, 'setMinimumSize')) {
          domFragment.bindings.push({
            key: 'minimumSize',
            value: `{width: ${sourceCode.getText(firstArg)}, height: ${sourceCode.getText(secondArg)}}`
          });
          return true;
        }
        return false;
      },
      propertyAssignment(property, value, domFragment) {
        if (domFragment.tagName !== 'devtools-widget') {
          return false;
        }
        if (domFragment.widgetClass &&
            isIdentifierChain(domFragment.widgetClass, ['UI', 'EmptyWidget', 'EmptyWidget']) &&
            isIdentifier(property, ['header', 'text', 'link'])) {
          domFragment.bindings.push({key: (property as Identifier).name, value});
          return true;
        }
        return false;
      },
      functionCall(call, _firstArg, _secondArg, domFragment) {
        if (isMemberExpression(call.callee, _ => true, n => isIdentifier(n, 'show'))) {
          let widget = (call.callee as MemberExpression).object;
          if (widget.type === 'CallExpression' &&
              isMemberExpression(widget.callee, _ => true, n => isIdentifier(n, 'asWidget'))) {
            widget = (widget.callee as MemberExpression).object;
          }
          domFragment.appendChild(widget, sourceCode);
          return true;
        }
        return false;
      },
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression' && isIdentifier(node.property, ['element', 'contentElement'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'div';
          let replacementLocation = ClassMember.getOrCreate(node, sourceCode)?.classDeclaration;
          if (replacementLocation?.parent?.type === 'ExportNamedDeclaration') {
            replacementLocation = replacementLocation.parent;
          }
          if (replacementLocation) {
            domFragment.replacer = (fixer, template) => {
              const output = template.includes('output') ? 'output' : '_output';
              const text = `
export const DEFAULT_VIEW = (input, ${output}, target) => {
  render(${template},
    target, {host: input});
};

`;
              return fixer.insertTextBefore(replacementLocation, text);
            };
          }
        }
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'EmptyWidget', 'EmptyWidget'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-widget';
          domFragment.widgetClass = node.callee;
          const header = node.arguments[0];
          const text = node.arguments[1];
          domFragment.bindings.push({key: 'header', value: header});
          domFragment.bindings.push({key: 'text', value: text});
          return true;
        }
        return false;
      },
    };
  }
};
