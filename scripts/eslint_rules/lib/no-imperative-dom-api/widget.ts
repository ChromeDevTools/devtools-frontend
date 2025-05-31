// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Library to identify and templatize manually construction of widgets.
 */
import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression} from './ast.ts';
import {ClassMember} from './class-member.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;
type Node = TSESTree.Node;
type CallExpression = TSESTree.CallExpression;
type MemberExpression = TSESTree.MemberExpression;
type AssignmentExpression = TSESTree.AssignmentExpression;

export const widget = {
  create: function(context) {
    const sourceCode = context.getSourceCode();
    return {
      methodCall(
          property: Identifier, firstArg: Node, secondArg: Node|undefined, domFragment: DomFragment,
          _call: CallExpression) {
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
      propertyAssignment(
          property: Identifier, value: Node, domFragment: DomFragment, _assignment: AssignmentExpression) {
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
      functionCall(call: CallExpression, _firstArg: Node, _secondArg: Node|undefined, domFragment: DomFragment) {
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
