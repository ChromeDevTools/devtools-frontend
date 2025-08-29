// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to identify and templatize manually constructed DOM.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {adorner} from './no-imperative-dom-api/adorner.ts';
import {ariaUtils} from './no-imperative-dom-api/aria-utils.ts';
import {getEnclosingExpression, isIdentifier} from './no-imperative-dom-api/ast.ts';
import {button} from './no-imperative-dom-api/button.ts';
import {ClassMember} from './no-imperative-dom-api/class-member.ts';
import {dataGrid} from './no-imperative-dom-api/data-grid.ts';
import {domApiDevtoolsExtensions} from './no-imperative-dom-api/dom-api-devtools-extensions.ts';
import {domApi} from './no-imperative-dom-api/dom-api.ts';
import {DomFragment} from './no-imperative-dom-api/dom-fragment.ts';
import {splitWidget} from './no-imperative-dom-api/split-widget.ts';
import {toolbar} from './no-imperative-dom-api/toolbar.ts';
import {uiFragment} from './no-imperative-dom-api/ui-fragment.ts';
import {uiUtils} from './no-imperative-dom-api/ui-utils.ts';
import {widget} from './no-imperative-dom-api/widget.ts';
import {createRule} from './utils/ruleCreator.ts';
type Identifier = TSESTree.Identifier;
type MemberExpression = TSESTree.MemberExpression;
type CallExpressionArgument = TSESTree.CallExpressionArgument;
type Node = TSESTree.Node;
type Range = TSESTree.Range;

export default createRule({
  name: 'no-imperative-dom-api',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer template literals over imperative DOM API calls',
      category: 'Possible Errors',
    },
    messages: {
      preferTemplateLiterals: 'Prefer template literals over imperative DOM API calls',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    const subrules = [
      adorner.create(context),
      ariaUtils.create(context),
      button.create(context),
      dataGrid.create(context),
      domApi.create(context),
      domApiDevtoolsExtensions.create(context),
      splitWidget.create(context),
      toolbar.create(context),
      uiFragment.create(context),
      uiUtils.create(context),
      widget.create(context),
    ];

    function getEvent(event: Node): string|null {
      for (const rule of subrules) {
        const result = 'getEvent' in rule ? rule.getEvent?.(event) : null;
        if (result) {
          return result;
        }
      }
      if (event.type === 'Literal') {
        return event.value?.toString() ?? null;
      }
      return null;
    }

    function processReference(reference: Node, domFragment: DomFragment): boolean {
      const parent = reference.parent;
      if (!parent) {
        return false;
      }
      const isPropertyAccess =
          parent.type === 'MemberExpression' && parent.object === reference && parent.property.type === 'Identifier';
      const property = isPropertyAccess ? parent.property as Identifier : null;
      const grandParent = parent.parent;
      const isPropertyAssignment =
          isPropertyAccess && grandParent?.type === 'AssignmentExpression' && grandParent.left === parent;
      const propertyValue = isPropertyAssignment ? grandParent.right : null;
      const isMethodCall = isPropertyAccess && grandParent?.type === 'CallExpression' && grandParent.callee === parent;
      if (isPropertyAccess && !isMethodCall && property && isIdentifier(property, 'element')) {
        return processReference(parent, domFragment);
      }
      const grandGrandParent = grandParent?.parent;
      const isPropertyMethodCall = isPropertyAccess && grandParent?.type === 'MemberExpression' &&
          grandParent.object === parent && grandGrandParent?.type === 'CallExpression' &&
          grandGrandParent?.callee === grandParent && grandParent.property.type === 'Identifier';
      const propertyMethodArgument = isPropertyMethodCall ? grandGrandParent.arguments[0] : null;
      const isSubpropertyAssignment = isPropertyAccess && grandParent?.type === 'MemberExpression' &&
          grandParent.object === parent && grandParent.property.type === 'Identifier' &&
          grandGrandParent?.type === 'AssignmentExpression' && grandGrandParent?.left === grandParent;
      const subproperty =
          isSubpropertyAssignment && grandParent?.property?.type === 'Identifier' ? grandParent.property : null;
      const subpropertyValue = isSubpropertyAssignment ? grandGrandParent.right : null;
      const isCallArgument =
          parent.type === 'CallExpression' && parent.arguments.includes(reference as CallExpressionArgument);
      for (const rule of subrules) {
        if (isPropertyAssignment && property && propertyValue) {
          if ('propertyAssignment' in rule && rule.propertyAssignment?.(property, propertyValue, domFragment)) {
            return true;
          }
        } else if (isMethodCall && property) {
          const firstArg = grandParent.arguments[0];
          const secondArg = grandParent.arguments[1];
          if (isIdentifier(property, 'addEventListener')) {
            const event = getEvent(firstArg);
            const value = secondArg;
            if (event && value.type !== 'SpreadElement') {
              domFragment.eventListeners.push({key: event, value});
            }
            return true;
          }
          if ('methodCall' in rule && rule.methodCall?.(property, firstArg, secondArg, domFragment, grandParent)) {
            return true;
          }
        } else if (isPropertyMethodCall && property && propertyMethodArgument) {
          if ('propertyMethodCall' in rule &&
              rule.propertyMethodCall?.(property, grandParent.property, propertyMethodArgument, domFragment)) {
            return true;
          }
        } else if (isSubpropertyAssignment && property && subproperty && subpropertyValue) {
          if ('subpropertyAssignment' in rule &&
              rule.subpropertyAssignment?.(property, subproperty, subpropertyValue, domFragment)) {
            return true;
          }
        } else if (isCallArgument) {
          const firstArg = parent.arguments[0];
          const secondArg = parent.arguments[1];
          if ('functionCall' in rule && rule.functionCall?.(parent, firstArg, secondArg, domFragment)) {
            return true;
          }
        }
      }
      return false;
    }

    function getRangesToRemove(domFragment: DomFragment, keepInitializer = false): Range[] {
      const ranges: Range[] = [];
      const initializerRange = domFragment.initializer ? getEnclosingExpression(domFragment.initializer)?.range : null;

      if (initializerRange && domFragment.references.every(r => r.processed) && !keepInitializer) {
        ranges.push(initializerRange);
      }

      for (const reference of domFragment.references) {
        if (!reference.processed) {
          continue;
        }
        const range = getEnclosingExpression(reference.node)?.range;
        if (!range) {
          continue;
        }
        ranges.push(range);
      }
      for (const child of domFragment.children) {
        ranges.push(...getRangesToRemove(child));
      }
      for (const range of ranges) {
        while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
          range[0]--;
        }
      }
      if (keepInitializer && initializerRange) {
        for (const range of ranges) {
          if (range[0] < initializerRange[1] && range[1] > initializerRange[0]) {
            range[0] = initializerRange[1];
          }
          if (range[1] > initializerRange[0] && range[0] < initializerRange[1]) {
            range[1] = initializerRange[0];
          }
        }
      }
      ranges.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < ranges.length; i++) {
        if (ranges[i][0] < ranges[i - 1][1]) {
          ranges[i] = [ranges[i - 1][1], Math.max(ranges[i][1], ranges[i - 1][1])];
        }
      }

      return ranges.filter(r => r[0] < r[1]);
    }

    function maybeReportDomFragment(domFragment: DomFragment): void {
      if ((!domFragment.initializer && !domFragment.replacer) || domFragment.parent || !domFragment.tagName ||
          domFragment.references.every(r => !r.processed)) {
        return;
      }
      context.report({
        node: domFragment.initializer ?? domFragment.references[0].node as Node,
        messageId: 'preferTemplateLiterals',
        fix(fixer) {
          const template = 'html`' + domFragment.toTemplateLiteral(sourceCode).join('') + '`';

          if (domFragment.replacer) {
            const result = [
              domFragment.replacer(fixer, template),
              ...getRangesToRemove(domFragment).map(range => fixer.removeRange(range)),
            ];
            return result;
          }
          const result = [
            fixer.replaceText(domFragment.initializer as Node, template),
            ...getRangesToRemove(domFragment, true).map(range => fixer.removeRange(range)),
          ];
          return result;
        }
      });
    }

    return {
      MemberExpression(node: MemberExpression) {
        if (node.object.type === 'ThisExpression') {
          ClassMember.getOrCreate(node, sourceCode);
        }
        for (const rule of subrules) {
          if ('MemberExpression' in rule) {
            rule.MemberExpression?.(node);
          }
        }
      },
      NewExpression(node) {
        for (const rule of subrules) {
          if ('NewExpression' in rule) {
            rule.NewExpression?.(node);
          }
        }
      },
      CallExpression(node) {
        for (const rule of subrules) {
          if ('CallExpression' in rule) {
            rule.CallExpression?.(node);
          }
        }
      },
      'Program:exit'() {
        let processedSome = false;
        do {
          processedSome = false;
          for (const domFragment of DomFragment.values()) {
            if (!domFragment.tagName) {
              continue;
            }
            for (const reference of domFragment.references) {
              if (reference.processed) {
                continue;
              }
              if (processReference(reference.node, domFragment)) {
                reference.processed = true;
                processedSome = true;
              }
            }
          }
        } while (processedSome);

        for (const domFragment of DomFragment.values()) {
          maybeReportDomFragment(domFragment);
        }
        DomFragment.clear();
      }
    };
  }
});
