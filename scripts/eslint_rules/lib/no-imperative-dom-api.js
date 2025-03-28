// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Rule to identify and templatize manually constructed DOM.
 *
 * To check types, run
 * $ npx tsc --noEmit --allowJS --checkJS --downlevelIteration scripts/eslint_rules/lib/no-imperative-dom-api.js
 */
'use strict';

const adorner = require('./no-imperative-dom-api/adorner.js');
const {isIdentifier, getEnclosingExpression} = require('./no-imperative-dom-api/ast.js');
const {ClassMember} = require('./no-imperative-dom-api/class-member.js');
const domApiDevtoolsExtensions = require('./no-imperative-dom-api/dom-api-devtools-extensions.js');
const domApi = require('./no-imperative-dom-api/dom-api.js');
const {DomFragment} = require('./no-imperative-dom-api/dom-fragment.js');
const toolbar = require('./no-imperative-dom-api/toolbar.js');
const widget = require('./no-imperative-dom-api/widget.js');

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').Rule.Node} EsLintNode */
/** @typedef {import('eslint').AST.SourceLocation} SourceLocation */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').Scope.Reference} Reference*/

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer template literals over imperative DOM API calls',
      category: 'Possible Errors',
    },
    messages: {
      preferTemplateLiterals:
        'Prefer template literals over imperative DOM API calls',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create : function(context) {
    const sourceCode = context.getSourceCode();

    const subrules = [
      adorner.create(context),
      domApi.create(context),
      domApiDevtoolsExtensions.create(context),
      toolbar.create(context),
      widget.create(context),
    ];

    /**
     * @param {Node} event
     * @return {string|null}
     */
    function getEvent(event) {
      for (const rule of subrules) {
        const result = rule.getEvent?.(event);
        if (result) {
          return result;
        }
      }
      if (event.type === 'Literal') {
        return event.value?.toString() ?? null;
      }
      return null;
    }

    /**
     * @param {EsLintNode} reference
     * @param {DomFragment} domFragment
     * @return {boolean}
     */
    function processReference(reference, domFragment) {
      const parent = reference.parent;
      const isAccessed = parent.type === 'MemberExpression' && parent.object === reference;
      const property = isAccessed ? parent.property : null;
      const grandParent = parent.parent;
      const isPropertyAssignment =
          isAccessed && grandParent.type === 'AssignmentExpression' && grandParent.left === parent;
      const propertyValue = isPropertyAssignment ? grandParent.right : null;
      const isMethodCall = isAccessed && grandParent.type === 'CallExpression' && grandParent.callee === parent;
      const firstArg = isMethodCall ? grandParent.arguments[0] : null;
      const secondArg = isMethodCall ? grandParent.arguments[1] : null;
      const grandGrandParent = grandParent.parent;
      const isPropertyMethodCall = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandGrandParent.type === 'CallExpression' &&
          grandGrandParent.callee === grandParent;
      const propertyMethodArgument = isPropertyMethodCall ? grandGrandParent.arguments[0] : null;
      const isSubpropertyAssignment = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandParent.property.type === 'Identifier' &&
          grandGrandParent.type === 'AssignmentExpression' && grandGrandParent.left === grandParent;
      const subproperty =
          isSubpropertyAssignment && grandParent.property.type === 'Identifier' ? grandParent.property : null;
      const subpropertyValue = isSubpropertyAssignment ? grandGrandParent.right : null;
      for (const rule of subrules) {
        if (isPropertyAssignment) {
          if (rule.propertyAssignment?.(property, propertyValue, domFragment)) {
            return true;
          }
        } else if (isMethodCall) {
          if (isIdentifier(property, 'addEventListener')) {
            const event = getEvent(firstArg);
            const value = secondArg;
            if (event && value.type !== 'SpreadElement') {
              domFragment.eventListeners.push({key: event, value});
            }
            return true;
          }
          if (rule.methodCall?.(property, firstArg, secondArg, domFragment, grandParent)) {
            return true;
          }
        } else if (isPropertyMethodCall) {
          if (rule.propertyMethodCall?.(property, grandParent.property, propertyMethodArgument, domFragment)) {
            return true;
          }
        } else if (isSubpropertyAssignment) {
          if (rule.subpropertyAssignment?.(property, subproperty, subpropertyValue, domFragment)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * @param {DomFragment} domFragment
     */
    function getRangesToRemove(domFragment) {
      /** @type {[number, number][]} */
      const ranges = [];
      for (const reference of domFragment.references) {
        if (!reference.processed) {
          continue;
        }
        const expression = getEnclosingExpression(reference.node);
        if (!expression) {
          continue;
        }
        const range = expression.range;
        ranges.push(range);
        for (const child of domFragment.children) {
          ranges.push(...getRangesToRemove(child));
        }
      }

      if (domFragment.initializer && domFragment.references.every(r => r.processed)) {
        ranges.push(getEnclosingExpression(domFragment.initializer).range);
      }
      for (const range of ranges) {
        while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
          range[0]--;
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

    /**
     * @param {DomFragment} domFragment
     */
    function maybeReportDomFragment(domFragment) {
      if (!domFragment.replacementLocation || domFragment.parent || !domFragment.tagName ||
          domFragment.references.every(r => !r.processed)) {
        return;
      }
      context.report({
        node: domFragment.replacementLocation,
        messageId: 'preferTemplateLiterals',
        fix(fixer) {
          const template = 'html`' + domFragment.toTemplateLiteral(sourceCode).join('') + '`';
          let replacementLocation = domFragment.replacementLocation;

          if (replacementLocation.type === 'VariableDeclarator') {
            domFragment.initializer = null;
            return [
              fixer.replaceText(replacementLocation.init, template),
              ...getRangesToRemove(domFragment).map(range => fixer.removeRange(range)),
            ];
          }

          if (replacementLocation.parent.type === 'ExportNamedDeclaration') {
            replacementLocation = replacementLocation.parent;
          }
          const text = `
export const DEFAULT_VIEW = (input, _output, target) => {
  render(${template},
    target, {host: input});
};

`;
          return [
            fixer.insertTextBefore(replacementLocation, text),
            ...getRangesToRemove(domFragment).map(range => fixer.removeRange(range)),
          ];
        }
      });
    }

    return {
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression') {
          ClassMember.getOrCreate(node, sourceCode);
        }
        for (const rule of subrules) {
          if ('MemberExpression' in rule) {
            rule.MemberExpression(node);
          }
        }
      },
      NewExpression(node) {
        for (const rule of subrules) {
          if ('NewExpression' in rule) {
            rule.NewExpression(node);
          }
        }
      },
      'Program:exit'() {
        for (const domFragment of DomFragment.values()) {
          if (!domFragment.tagName) {
            continue;
          }
          for (const reference of domFragment.references) {
            if (processReference(reference.node, domFragment)) {
              reference.processed = true;
            }
          }
        }

        for (const domFragment of DomFragment.values()) {
          maybeReportDomFragment(domFragment);
        }
        DomFragment.clear();
      }
    };
  }
};
