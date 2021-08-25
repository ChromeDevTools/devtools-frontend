// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Enforce event naming convention',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      missingEventName:
          'Event is missing a static readonly eventName property containing the event name, or the eventName property was not found as the first node in the class body.',
      eventNameNotReadonly: 'The eventName property must be marked as readonly.',
      eventNameNotStatic: 'The eventName property must be a static property.',
      superEventNameWrong: 'The first argument to super() must be EventClass.eventName.',
      noSuperCallFound: 'Could not find a super() call in the constructor.',
      noConstructorFound: 'Could not find a constructor for the custom event.',
    },
    schema: []  // no options
  },
  create: function(context) {
    return {
      ClassDeclaration(node) {
        if (!node.superClass) {
          return;
        }
        if (node.superClass.name !== 'Event') {
          return;
        }

        const bodyMembersOfClass = node.body.body;
        // Look for the static readonly eventName line.
        // We purposefully look at the first body node as it should be defined first
        const firstBodyNode = bodyMembersOfClass[0];
        if (!firstBodyNode || firstBodyNode.key.name !== 'eventName') {
          context.report({node, messageId: 'missingEventName'});
          return;
        }
        if (!firstBodyNode.readonly) {
          context.report({node, messageId: 'eventNameNotReadonly'});
        }
        if (!firstBodyNode.static) {
          context.report({node, messageId: 'eventNameNotStatic'});
          return;
        }

        // Now we know the static readonly eventName is defined, we check for the constructor and the super() call.

        const constructor = node.body.body.find(bodyNode => {
          return bodyNode.type === 'MethodDefinition' && bodyNode.key?.name === 'constructor';
        });
        if (!constructor) {
          context.report({node, messageId: 'noConstructorFound'});
          return;
        }

        const superExpression = constructor.value.body.body.find(bodyNode => {
          const isExpression = bodyNode.type === 'ExpressionStatement';
          if (!isExpression) {
            return false;
          }
          return isExpression && bodyNode.expression.callee?.type === 'Super';
        });
        if (!superExpression) {
          context.report({node, messageId: 'noSuperCallFound'});
          return;
        }
        const firstArgumentToSuper = superExpression.expression.arguments[0];
        if (!firstArgumentToSuper) {
          context.report({node, messageId: 'superEventNameWrong'});
          return;
        }

        const customEventClassName = node.id.name;
        if (firstArgumentToSuper.type !== 'MemberExpression') {
          context.report({node, messageId: 'superEventNameWrong'});
          return;
        }
        if (firstArgumentToSuper.object.name !== customEventClassName ||
            firstArgumentToSuper.property.name !== 'eventName') {
          context.report({node, messageId: 'superEventNameWrong'});
          return;
        }
      }
    };
  }
};
