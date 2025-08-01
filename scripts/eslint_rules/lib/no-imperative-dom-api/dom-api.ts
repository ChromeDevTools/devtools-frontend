// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Library to identify and templatize manually DOM API calls.
 */

import {isIdentifier, isLiteral, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const domApi: RuleCreator = {
  create: function(context) {
    const sourceCode = context.sourceCode;
    return {
      propertyAssignment(property, propertyValue, domFragment) {
        if (isIdentifier(property, 'className')) {
          domFragment.classList.push(propertyValue);
          return true;
        }
        if (isIdentifier(property, ['textContent', 'innerHTML', 'innerText'])) {
          domFragment.textContent = propertyValue;
          return true;
        }
        if (isIdentifier(property, [
              'alt', 'draggable', 'height', 'hidden', 'href', 'id', 'name', 'placeholder', 'rel', 'role', 'scope',
              'slot', 'spellcheck', 'src', 'tabIndex', 'title', 'type', 'value', 'width'
            ])) {
          domFragment.attributes.push({key: property.name.toLowerCase(), value: propertyValue});
          return true;
        }
        if (isIdentifier(property, ['checked', 'disabled'])) {
          domFragment.booleanAttributes.push({key: property.name.toLowerCase(), value: propertyValue});
          return true;
        }
        return false;
      },
      propertyMethodCall(property, method, firstArg, domFragment) {
        if (isIdentifier(property, 'classList') && isIdentifier(method, 'add')) {
          domFragment.classList.push(firstArg);
          return true;
        }
        return false;
      },
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
        if (isIdentifier(property, 'dataset') && subproperty.type === 'Identifier') {
          const property = 'data-' + subproperty.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (subpropertyValue.type !== 'SpreadElement') {
            domFragment.attributes.push({
              key: property,
              value: subpropertyValue,
            });
            return true;
          }
        }
        return false;
      },
      methodCall(property, firstArg, secondArg, domFragment, call) {
        if (isIdentifier(property, 'setAttribute')) {
          const attribute = firstArg;
          const value = secondArg;
          if (attribute.type === 'Literal' && value && value.type !== 'SpreadElement' && attribute.value) {
            domFragment.attributes.push({key: attribute.value.toString(), value});
            return true;
          }
        }
        if (isIdentifier(property, 'appendChild')) {
          domFragment.appendChild(firstArg, sourceCode);
          return true;
        }
        if (domFragment.tagName === 'select' && isIdentifier(property, 'add')) {
          if (secondArg) {
            const index = domFragment.children.indexOf(DomFragment.getOrCreate(secondArg, sourceCode));
            domFragment.insertChildAt(secondArg, index, sourceCode);
          } else {
            domFragment.appendChild(firstArg, sourceCode);
          }
          return true;
        }
        if (isIdentifier(property, 'append')) {
          for (const child of call.arguments) {
            domFragment.appendChild(child, sourceCode);
          }
          return true;
        }
        if (isIdentifier(property, 'prepend')) {
          for (const child of call.arguments) {
            domFragment.insertChildAt(child, 0, sourceCode);
          }
          return true;
        }
        if (isIdentifier(property, 'insertBefore') && secondArg) {
          const index = domFragment.children.indexOf(DomFragment.getOrCreate(secondArg, sourceCode));
          if (index !== -1) {
            for (const reference of domFragment.children[index].references) {
              if (reference.node === secondArg) {
                reference.processed = true;
              }
            }
            domFragment.insertChildAt(firstArg, index, sourceCode);
            return true;
          }
        }
        if (isIdentifier(property, 'insertAdjacentElement') && secondArg) {
          if (domFragment.parent) {
            const index = domFragment.parent.children.indexOf(domFragment);
            if (isLiteral(firstArg, 'afterend')) {
              domFragment.parent.insertChildAt(secondArg, index + 1, sourceCode);
              return true;
            }
            if (isLiteral(firstArg, 'beforebegin')) {
              domFragment.parent.insertChildAt(secondArg, index, sourceCode);
              return true;
            }
          }
        }
        return false;
      },

      MemberExpression(node) {
        if (isIdentifier(node.object, 'document') && isIdentifier(node.property, 'createElement') &&
            node.parent.type === 'CallExpression' && node.parent.callee === node) {
          const domFragment = DomFragment.getOrCreate(node.parent, sourceCode);
          if (node.parent.arguments.length >= 1 && node.parent.arguments[0].type === 'Literal') {
            domFragment.tagName = String(node.parent.arguments[0].value);
          }
        }
      },

    };
  }
};
