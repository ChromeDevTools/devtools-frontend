// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

function goToClassDeclaration(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'ClassDeclaration') {
    return node;
  }

  return goToClassDeclaration(node.parent);
}

function isMemberExpressionOnThis(memberExpression) {
  if (!memberExpression) {
    return false;
  }

  if (memberExpression.object.type === 'ThisExpression') {
    // Take into `a.this.bind()` case into account
    // `this` must be the last object in the `MemberExpression` chain
    return !memberExpression.object.object;
  }

  return isMemberExpressionOnThis(memberExpression.object);
}

// Whether the right hand side of property definition is `this.xxx.yyy.bind(this);`
function isPropertyDefinitionViaBindCallToThis(propertyDefinition) {
  if (propertyDefinition.value.type !== 'CallExpression' ||
      propertyDefinition.value.callee.type !== 'MemberExpression') {
    return false;
  }

  const isCalleeObjectThis = isMemberExpressionOnThis(propertyDefinition.value.callee);
  // Whether the CallExpression is on a property of `this` (this.xxx.yyy.bind)
  if (!isCalleeObjectThis) {
    return false;
  }

  const isItBindCall = propertyDefinition.value.callee.property.name === 'bind';
  // Whether the CallExpression is a `bind` call on a property of `this`
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
function isPropertyDefinitionViaArrowFunction(propertyDefinition) {
  return propertyDefinition.value.type === 'ArrowFunctionExpression';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce render method to be bound while calling scheduleRender',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      CallExpression(node) {
        // Calls in the form of `ScheduledRender.scheduleRender`
        const isScheduleRenderCall = node.callee.type === 'MemberExpression' &&
            node.callee.object?.property?.name === 'ScheduledRender' && node.callee.property?.name === 'scheduleRender';
        if (!isScheduleRenderCall) {
          return;
        }

        const callbackArgument = node.arguments[1];
        // Whether the second argument points to a property of `this`
        // like `ScheduledRender.scheduleRender(<any>, this.<any>)
        if (callbackArgument.type !== 'MemberExpression' || callbackArgument.object.type !== 'ThisExpression') {
          return;
        }

        const containingClassForTheCall = goToClassDeclaration(node);
        // Only care about the calls in custom components
        if (!containingClassForTheCall.superClass || containingClassForTheCall.superClass.name !== 'HTMLElement') {
          return;
        }

        const calledMethod = callbackArgument.property;
        // Check whether the called method is bound (it should be 'PropertyDefinition')
        const propertyDefinition = containingClassForTheCall.body.body.find(
            bodyNode => bodyNode.type === 'PropertyDefinition' && bodyNode.key.name === calledMethod.name);
        if (!propertyDefinition ||
            (!isPropertyDefinitionViaArrowFunction(propertyDefinition) &&
             !isPropertyDefinitionViaBindCallToThis(propertyDefinition))) {
          context.report({node, message: 'Bind `render` method of `scheduleRender` to `this` in components'});
        }
      }
    };
  }
};
