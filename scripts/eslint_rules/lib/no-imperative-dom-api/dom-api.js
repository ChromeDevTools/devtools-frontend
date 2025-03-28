// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Library to identify and templatize manually DOM API calls.
 */
'use strict';

const {isIdentifier} = require('./ast.js');
const {DomFragment} = require('./dom-fragment.js');

/** @typedef {import('eslint').Rule.Node} Node */

module.exports = {
  create : function(context) {
    const sourceCode = context.getSourceCode();
    return {
      /**
       * @param {Node} property
       * @param {Node} propertyValue
       * @param {DomFragment} domFragment
       */
      propertyAssignment(property, propertyValue, domFragment) {
        if (isIdentifier(property, 'className')) {
          domFragment.classList.push(propertyValue);
          return true;
        }
        if (isIdentifier(property, ['textContent', 'innerHTML'])) {
          domFragment.textContent = propertyValue;
          return true;
        }
        return false;
      },
      /**
       * @param {Node} property
       * @param {Node} method
       * @param {Node} firstArg
       * @param {DomFragment} domFragment
       */
      propertyMethodCall(property, method, firstArg, domFragment) {
        if (isIdentifier(property, 'classList') && isIdentifier(method, 'add')) {
          domFragment.classList.push(firstArg);
          return true;
        }
        return false;
      },
      /**
       * @param {Node} property
       * @param {Node} subproperty
       * @param {Node} subpropertyValue
       * @param {DomFragment} domFragment
       */
      subpropertyAssignment(property, subproperty, subpropertyValue, domFragment) {
        if (isIdentifier(property, 'style') && subproperty.type === 'Identifier') {
          const property = subproperty.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (subpropertyValue.type !== 'SpreadElement') {
            domFragment.style.push({
              key: property,
              value: subpropertyValue,
            });
            return true;
          }
        }
        return false;
      },
      /**
       * @param {Node} property
       * @param {Node} firstArg
       * @param {Node} secondArg
       * @param {DomFragment} domFragment
       * @param {Node} call
       */
      methodCall(property, firstArg, secondArg, domFragment, call) {
        if (isIdentifier(property, 'setAttribute')) {
          const attribute = firstArg;
          const value = secondArg;
          if (attribute.type === 'Literal' && attribute.value && value.type !== 'SpreadElement') {
            domFragment.attributes.push({
              key: attribute.value.toString(),
              value,
            });
            return true;
          }
        }
        if (isIdentifier(property, 'appendChild')) {
          domFragment.appendChild(firstArg, sourceCode);
          return true;
        }
        return false;
      },
      MemberExpression(node) {
        if (isIdentifier(node.object, 'document') && isIdentifier(node.property, 'createElement')
            && node.parent.type === 'CallExpression' && node.parent.callee === node) {
          const domFragment = DomFragment.getOrCreate(node.parent, sourceCode);
          if (node.parent.arguments.length >= 1 && node.parent.arguments[0].type === 'Literal') {
            domFragment.tagName = node.parent.arguments[0].value;
          }
        }
      },
    };
  }
};
