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

const {isIdentifier, isMemberExpression, getEnclosingExpression} = require('./no-imperative-dom-api/ast.js');
const {DomFragment} = require('./no-imperative-dom-api/dom-fragment.js');

/** @typedef {import('eslint').Rule.Node} Node */
/** @typedef {import('eslint').AST.SourceLocation} SourceLocation */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').Scope.Reference} Reference*/

module.exports = {
  meta : {
    type : 'problem',
    docs : {
      description : 'Prefer template literals over imperative DOM API calls',
      category : 'Possible Errors',
    },
    messages: {
      preferTemplateLiterals: 'Prefer template literals over imperative DOM API calls',
    },
    fixable : 'code',
    schema : []  // no options
  },
  create : function(context) {
    const sourceCode = context.getSourceCode();

    /**
     * @param {Node} event
     * @return {string|null}
     */
    function getEvent(event) {
      switch (sourceCode.getText(event)) {
        case 'UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED':
          return 'change';
        case 'UI.Toolbar.ToolbarInput.Event.ENTER_PRESSED':
          return 'submit';
        default:
          if (event.type === 'Literal') {
            return event.value.toString();
          }
          return null;
      }
    }

    /**
     *  @param {Node} reference
     *  @param {DomFragment} domFragment
     */
    function processReference(reference, domFragment) {
      const parent = reference.parent;
      const isAccessed = parent.type === 'MemberExpression' && parent.object === reference;
      const property = isAccessed ? /** @type {Node} */ (parent.property) : null;
      const grandParent = parent.parent;
      const isPropertyAssignment =
          isAccessed && grandParent.type === 'AssignmentExpression' && grandParent.left === parent;
      const propertyValue = isPropertyAssignment ? /** @type {Node} */(grandParent.right) : null;
      const isMethodCall = isAccessed && grandParent.type === 'CallExpression' && grandParent.callee === parent;
      const firstArg = isMethodCall ?  /** @type {Node} */(grandParent.arguments[0]) : null;
      const secondArg = isMethodCall ? /** @type {Node} */(grandParent.arguments[1]) : null;
      const grandGrandParent = grandParent.parent;
      const isPropertyMethodCall = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandGrandParent.type === 'CallExpression' &&
          grandGrandParent.callee === grandParent;
      const propertyMethodArgument = isPropertyMethodCall ? /** @type {Node} */ (grandGrandParent.arguments[0]) : null;
      const isSubpropertyAssignment = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandParent.property.type === 'Identifier' &&
          grandGrandParent.type === 'AssignmentExpression' && grandGrandParent.left === grandParent;
      const subproperty =
          isSubpropertyAssignment && grandParent.property.type === 'Identifier' ? grandParent.property : null;
      const subpropertyValue = isSubpropertyAssignment ? /** @type {Node} */ (grandGrandParent.right) : null;
      if (isPropertyAssignment && isIdentifier(property, 'className')) {
        domFragment.classList.push(propertyValue);
      } else if (isPropertyAssignment && isIdentifier(property, ['textContent', 'innerHTML'])) {
        domFragment.textContent = propertyValue;
      } else if (
          isPropertyAssignment && domFragment.tagName === 'devtools-adorner' && isIdentifier(property, 'data') &&
          propertyValue.type === 'ObjectExpression') {
        for (const property of propertyValue.properties) {
          if (property.type !== 'Property') {
            continue;
          }
          const key = /** @type {Node} */ (property.key);
          if (isIdentifier(key, 'name')) {
            domFragment.attributes.push({
              key: 'aria-label',
              value: /** @type {Node} */ (property.value),
            });
          }
          if (isIdentifier(key, 'jslogContext')) {
            domFragment.attributes.push(
                {key: 'jslog', value: '${VisualLogging.adorner(' + sourceCode.getText(property.value) + ')}'});
          }
          if (isIdentifier(key, 'content')) {
            const childFragment = DomFragment.getOrCreate(/** @type {Node} */ (property.value), sourceCode);
            childFragment.parent = domFragment;
            domFragment.children.push(childFragment);
          }
        }
      } else if (isMethodCall && isIdentifier(property, 'setAttribute')) {
        const attribute = firstArg;
        const value = secondArg;
        if (attribute.type === 'Literal' && value.type !== 'SpreadElement') {
          domFragment.attributes.push({key: attribute.value.toString(), value});
        }
      } else if (isMethodCall && isIdentifier(property, 'addEventListener')) {
        const event = getEvent(firstArg);
        const value = secondArg;
        if (event && value.type !== 'SpreadElement') {
          domFragment.eventListeners.push({key: event, value});
        }
      } else if (isMethodCall && isIdentifier(property, 'appendToolbarItem')) {
        const childFragment = DomFragment.getOrCreate(firstArg, sourceCode);
        childFragment.parent = domFragment;
        domFragment.children.push(childFragment);
      } else if (
          isPropertyMethodCall && isIdentifier(property, 'classList') &&
          isIdentifier(/** @type {Node} */ (grandParent.property), 'add')) {
        domFragment.classList.push(propertyMethodArgument);
      } else if (isSubpropertyAssignment && isIdentifier(property, 'style')) {
        const property = subproperty.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        if (subpropertyValue.type !== 'SpreadElement') {
          domFragment.style.push({
            key: property,
            value: subpropertyValue,
          });
        }
      } else if (isMethodCall && isIdentifier(property, 'createChild')) {
        if (firstArg?.type === 'Literal') {
          const childFragment = DomFragment.getOrCreate(grandParent, sourceCode);
          childFragment.tagName = String(firstArg.value);
          childFragment.parent = domFragment;
          domFragment.children.push(childFragment);
          if (secondArg) {
            childFragment.classList.push(secondArg);
          }
        }
      } else if (isMethodCall && isIdentifier(property, 'appendChild')) {
        const childFragment = DomFragment.getOrCreate(firstArg, sourceCode);
        childFragment.parent = domFragment;
        domFragment.children.push(childFragment);
      }
    }

    /**
     * @param {DomFragment} domFragment
     */
    function getRangesToRemove(domFragment) {
      /** @type {[number, number][]} */
      const ranges = [];
      for (const reference of domFragment.references) {
        const expression = getEnclosingExpression(reference);
        if (!expression) {
          continue;
        }
        const range = expression.range;
        while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
          range[0]--;
        }
        ranges.push(range);
        for (const child of domFragment.children) {
          ranges.push(...getRangesToRemove(child));
        }
      }
      ranges.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < ranges.length; i++) {
        if (ranges[i][0] < ranges[i - 1][1]) {
          ranges[i] = [ranges[i - 1][1], ranges[i][1]];
        }
      }

      return ranges.filter(r => r[0] < r[1]);
    }

    /**
     * @param {DomFragment} domFragment
     */
    function maybeReportDomFragment(domFragment) {
      if (!domFragment.replacementLocation || domFragment.parent || !domFragment.tagName) {
        return;
      }
      context.report({
        node: domFragment.replacementLocation,
        messageId: 'preferTemplateLiterals',
        fix(fixer) {
          let replacementLocation = /** @type {Node} */(domFragment.replacementLocation);
          if (replacementLocation.parent.type === 'ExportNamedDeclaration') {
            replacementLocation = replacementLocation.parent;
          }
          const template = domFragment.toTemplateLiteral(sourceCode).join('');
          const text = `
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`${template}\`,
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
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          if (isIdentifier(node.property, 'contentElement')) {
            domFragment.tagName = 'div';
          }
        }
        if (isIdentifier(node.object, 'document') && isIdentifier(node.property, 'createElement')
            && node.parent.type === 'CallExpression' && node.parent.callee === node) {
          const domFragment = DomFragment.getOrCreate(node.parent, sourceCode);
          if (node.parent.arguments.length >= 1 && node.parent.arguments[0].type === 'Literal') {
            domFragment.tagName = node.parent.arguments[0].value;
          }
        }
      },
      NewExpression(node) {
        if (isMemberExpression(
                node.callee, n => isMemberExpression(n, n => isIdentifier(n, 'UI'), n => isIdentifier(n, 'Toolbar')),
                n => isIdentifier(n, ['ToolbarFilter', 'ToolbarInput']))) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-toolbar-input';
          const type = isIdentifier(node.callee.property, 'ToolbarFilter') ? 'filter' : 'text';
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
            const dataList = DomFragment.getOrCreate(completions, sourceCode);
            dataList.tagName = 'datalist';
            dataList.attributes.push({
              key: 'id',
              value: 'completions',
            });
            dataList.textContent = completions;
            domFragment.children.push(dataList);
            dataList.parent = domFragment;
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
        if (isMemberExpression(
                node.callee,
                n => isMemberExpression(n, n => isIdentifier(n, 'Adorners'), n => isIdentifier(n, 'Adorner')),
                n => isIdentifier(n, 'Adorner'))) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-adorner';
        }
        if (isMemberExpression(
                node.callee, n => isMemberExpression(n, n => isIdentifier(n, 'UI'), n => isIdentifier(n, 'Toolbar')),
                n => isIdentifier(n, 'ToolbarButton'))) {
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
      },
      'Program:exit'() {
        for (const domFragment of DomFragment.values()) {
          for (const reference of domFragment.references) {
            processReference(reference, domFragment);
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
