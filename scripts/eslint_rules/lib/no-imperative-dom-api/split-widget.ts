// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed SplitWidget.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Node = TSESTree.Node;

export const splitWidget: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;

    function setVertical(domFragment: DomFragment, vertical: Node) {
      if (vertical.type === 'Literal' && vertical.value === true) {
        domFragment.attributes.push({key: 'direction', value: 'column'});
      } else if (vertical.type === 'Literal' && vertical.value === false) {
        domFragment.attributes.push({key: 'direction', value: 'row'});
      } else if (!isIdentifier(vertical, 'undefined')) {
        domFragment.attributes.push(
            {key: 'direction', value: `\${${sourceCode.getText(vertical)} ? 'column' : 'row'}`});
      }
    }
    function setSecondIsSidebar(domFragment: DomFragment, secondIsSidebar: Node) {
      if (secondIsSidebar.type === 'Literal' && secondIsSidebar.value === true) {
        domFragment.attributes.push({key: 'sidebar-position', value: 'second'});
      } else if (secondIsSidebar.type === 'Literal' && secondIsSidebar.value === false) {
        domFragment.attributes.push({key: 'sidebar-position', value: 'first'});
      } else if (!isIdentifier(secondIsSidebar, 'undefined')) {
        domFragment.attributes.push(
            {key: 'sidebar-position', value: `\$${sourceCode.getText(secondIsSidebar)} ? 'second' : 'first'}`});
      }
    }
    function setChildWidget(domFragment: DomFragment, child: Node, slot: string) {
      const childFragment = domFragment.appendChild(child, sourceCode);
      if (!childFragment.tagName) {
        childFragment.tagName = 'devtools-widget';
        if (child.type !== 'NewExpression') {
          if (childFragment.initializer?.parent?.type === 'AssignmentExpression') {
            child = childFragment.initializer.parent.right;
          } else if (childFragment.initializer?.parent?.type === 'VariableDeclarator') {
            child = childFragment.initializer.parent.init as Node;
          }
        }
        if (child.type === 'NewExpression') {
          childFragment.widgetClass = child.callee;
        }
      }
      childFragment.attributes.push({key: 'slot', value: slot});
    }

    return {
      methodCall(property, firstArg, _secondArg, domFragment) {
        if (domFragment.tagName !== 'devtools-split-view') {
          return false;
        }
        if (isIdentifier(property, 'setVertical')) {
          setVertical(domFragment, firstArg);
          return true;
        }
        if (isIdentifier(property, 'setSecondIsSidebar')) {
          setSecondIsSidebar(domFragment, firstArg);
          return true;
        }
        if (isIdentifier(property, 'setMainWidget')) {
          setChildWidget(domFragment, firstArg, 'main');
          return true;
        }
        if (isIdentifier(property, 'setSidebarWidget')) {
          setChildWidget(domFragment, firstArg, 'sidebar');
          return true;
        }
        if (isIdentifier(property, 'hideSidebar')) {
          domFragment.attributes.push({key: 'sidebar-visibility', value: 'hidden'});
          return true;
        }
        if (isIdentifier(property, 'showBoth')) {
          domFragment.attributes.push({key: 'sidebar-visibility', value: 'visible'});
          return true;
        }
        return false;
      },
      getEvent(event) {
        switch (sourceCode.getText(event)) {
          case 'UI.SplitWidget.Events.SHOW_MODE_CHANGED':
            return 'change';
          default:
            return null;
        }
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'SplitWidget', 'SplitWidget'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-split-view';
          const vertical = node.arguments[0];
          if (vertical) {
            setVertical(domFragment, vertical);
          }
          const secondIsSidebar = node.arguments[1];
          if (secondIsSidebar) {
            setSecondIsSidebar(domFragment, secondIsSidebar);
          }

          const settingName = node.arguments[2];
          if (settingName && !isIdentifier(settingName, 'undefined')) {
            domFragment.attributes.push({key: 'name', value: settingName});
          }
          const defaultSidebarWidth = node.arguments[3];
          if (defaultSidebarWidth && !isIdentifier(defaultSidebarWidth, 'undefined')) {
            domFragment.attributes.push({key: 'sidebar-initial-size', value: defaultSidebarWidth});
          }
          const defaultSidebarHeight = node.arguments[4];
          if (defaultSidebarHeight && !isIdentifier(defaultSidebarHeight, 'undefined')) {
            domFragment.attributes.push({key: 'sidebar-initial-size', value: defaultSidebarHeight});
          }
        }
      },
    };
  }
};
