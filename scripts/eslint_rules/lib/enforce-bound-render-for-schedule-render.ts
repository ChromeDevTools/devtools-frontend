// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './tsUtils.ts';  // Assuming tsUtils.js exists based on File B

type Node = TSESTree.Node;
type ClassDeclaration = TSESTree.ClassDeclaration;
type MemberExpression = TSESTree.MemberExpression;
type PropertyDefinition = TSESTree.PropertyDefinition;
type CallExpression = TSESTree.CallExpression;

function goToClassDeclaration(node: Node|null|undefined): ClassDeclaration|null {
  if (!node) {
    return null;
  }

  if (node.type === 'ClassDeclaration') {
    return node;
  }

  return goToClassDeclaration(node.parent);
}

function isMemberExpressionOnThis(memberExpression: MemberExpression|undefined): boolean {
  if (!memberExpression) {
    return false;
  }

  // Check if the direct object is ThisExpression
  if (memberExpression.object.type === 'ThisExpression') {
    // Ensure 'this' is the base object in the chain (e.g., `this.foo`, not `a.this.foo`)
    // Note: TSESTree types don't directly model nested objects like `a.this`,
    // so this check primarily ensures it's `this.<something>`.
    // The original check `!memberExpression.object.object` seems redundant with TS types
    // as `ThisExpression` doesn't have an `object` property.
    return true;
  }

  // Recursively check if the object is another MemberExpression based on `this`
  if (memberExpression.object.type === 'MemberExpression') {
    return isMemberExpressionOnThis(memberExpression.object);
  }

  return false;
}

// Whether the right hand side of property definition is `this.xxx.yyy.bind(this);`
function isPropertyDefinitionViaBindCallToThis(propertyDefinition: PropertyDefinition): boolean {
  if (!propertyDefinition.value || propertyDefinition.value.type !== 'CallExpression' ||
      propertyDefinition.value.callee.type !== 'MemberExpression') {
    return false;
  }

  const callee = propertyDefinition.value.callee;

  // Whether the CallExpression is on a property of `this` (this.xxx.yyy.bind)
  const isCalleeObjectThis = isMemberExpressionOnThis(callee);
  if (!isCalleeObjectThis) {
    return false;
  }

  // Whether the CallExpression is a `bind` call on a property of `this`
  const isItBindCall = callee.property.type === 'Identifier' && callee.property.name === 'bind';
  if (!isItBindCall) {
    return false;
  }

  const callArgument = propertyDefinition.value.arguments[0];
  // Call argument to `bind` is not `this`
  if (!callArgument || callArgument.type !== 'ThisExpression') {
    return false;
  }

  return true;
}

// Whether the property definition is arrow function like `#render = () => {}`
function isPropertyDefinitionViaArrowFunction(propertyDefinition: PropertyDefinition): boolean {
  return !!propertyDefinition.value && propertyDefinition.value.type === 'ArrowFunctionExpression';
}

/**
 * @type {import('eslint').Rule.RuleModule}
 */
// The JSDoc type comment above is now superseded by the TypeScript types below
// but preserved as requested.
export default createRule({
  name: 'enforce-bound-render-for-schedule-render',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce render method to be bound while calling scheduleRender',
      category: 'Possible Errors',
    },
    fixable: 'code',  // Note: No fixer provided in the original rule
    schema: [],       // no options
    messages: {
      // Added messages object for consistency, though original didn't use it
      renderNotBound: 'Bind `render` method of `scheduleRender` to `this` in components',
    }
  },
  defaultOptions: [],
  create: function(context) {
    return {
      CallExpression(node: CallExpression) {
        // Calls in the form of `ScheduledRender.scheduleRender`
        if (node.callee.type !== 'MemberExpression' ||
            node.callee.object.type !== 'MemberExpression' ||  // e.g., Component.ScheduledRender
            node.callee.object.property.type !== 'Identifier' ||
            node.callee.object.property?.name !== 'ScheduledRender' || node.callee.property.type !== 'Identifier' ||
            node.callee.property.name !== 'scheduleRender') {
          return;
        }

        const callbackArgument = node.arguments[1];
        // Whether the second argument points to a property of `this`
        // like `ScheduledRender.scheduleRender(<any>, this.<any>)
        if (!callbackArgument ||  // Ensure argument exists
            callbackArgument.type !== 'MemberExpression' || callbackArgument.object.type !== 'ThisExpression') {
          return;
        }

        const containingClassForTheCall = goToClassDeclaration(node);
        // Only care about the calls in custom components
        if (!containingClassForTheCall?.superClass ||
            // Check if superClass is an Identifier (most common case)
            (containingClassForTheCall.superClass.type === 'Identifier' &&
             containingClassForTheCall.superClass.name !== 'HTMLElement') ||
            // Add check for MemberExpression superClasses like LitElement.LitElement
            (containingClassForTheCall.superClass.type === 'MemberExpression' &&
             containingClassForTheCall.superClass.property.type === 'Identifier' &&
             containingClassForTheCall.superClass.property.name !== 'HTMLElement')) {
          return;
        }

        const calledMethod = callbackArgument.property;
        if (calledMethod.type !== 'Identifier' && calledMethod.type !== 'PrivateIdentifier') {
          return;
        }

        // Check whether the called method is bound (it should be 'PropertyDefinition')
        const propertyDefinition = containingClassForTheCall.body.body.find(
            (bodyNode): bodyNode is PropertyDefinition =>  // Type predicate for find
            bodyNode.type === 'PropertyDefinition' &&
                // Check key type before accessing name
                (bodyNode.key.type === 'Identifier' || bodyNode.key.type === 'PrivateIdentifier') &&
                bodyNode.key.name === calledMethod.name,
        );

        if (!propertyDefinition ||
            (!isPropertyDefinitionViaArrowFunction(propertyDefinition) &&
             !isPropertyDefinitionViaBindCallToThis(propertyDefinition))) {
          context.report({
            node: callbackArgument,       // Report on the argument itself
            messageId: 'renderNotBound',  // Use messageId
          });
        }
      },
    };
  },
});
