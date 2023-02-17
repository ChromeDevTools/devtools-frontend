// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
/**
 * Match all lowercase letters from the start to the end.
 */
const VALID_EVENT_NAME_REGEX = /^([a-z]+)$/;

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check for event naming',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      'invalidEventName': 'Custom events must be named in all lower case with no punctuation.',
      'invalidEventNameReference': 'When referencing a custom event name, it must be accessed as ClassName.eventName.'
    },
    schema: []  // no options
  },
  create: function(context) {
    let foundLocalEventClassDeclaration = false;
    const classDeclarationsToLint = [];

    function lintClassNode(node) {

        const constructor =
            node.body.body.find(node => node.type === 'MethodDefinition' && node.kind === 'constructor');
        if (!constructor) {
          return;
        }
        const superCall = constructor.value.body.body.find(bodyNode => {
          return bodyNode.type === 'ExpressionStatement' && bodyNode.expression.type === 'CallExpression' &&
              bodyNode.expression.callee.type === 'Super';
        });
        if (!superCall) {
          return;
        }

        const firstArgToSuper = superCall.expression.arguments[0];
        if (!firstArgToSuper) {
          // This is invalid, but TypeScript will catch this for us so no need to
          // error in ESLint land as well.
          return;
        }
        if (firstArgToSuper.type === 'Literal') {
          const firstArgLiteralValue = firstArgToSuper.value;
          if (!firstArgLiteralValue.match(VALID_EVENT_NAME_REGEX)) {
            context.report({node, messageId: 'invalidEventName'});
          }
          return;
        }

        if (firstArgToSuper.type !== 'MemberExpression') {
          // This means it's a variable but not of the form ClassName.eventName, which we do not allow.
          context.report({node, messageId: 'invalidEventNameReference'});
          return;
        }

        // the name of the custom event class we're looking at
        const eventClassName = node.id.name;
        const objectName = firstArgToSuper.object.name;
        const propertyName = firstArgToSuper.property.name;

        if (objectName !== eventClassName || propertyName !== 'eventName') {
          context.report({node, messageId: 'invalidEventNameReference'});
          return;
        }

        // If the reference is right, let's find the value of the static eventName property and make sure it is valid.
        const eventNameProperty = node.body.body.find(classBodyPart => {
          return classBodyPart.type === 'PropertyDefinition' && classBodyPart.key.name === 'eventName';
        });

        // This should always exist because we checked for its existence
        // previously, no error loudly as this is a bug in the lint rule.
        if (!eventNameProperty) {
          throw new Error(`Could not find static eventName property for ${eventClassName}.`);
        }

        // We don't let people use static eventName = SOME_VAR;
        if (eventNameProperty.value.type !== 'Literal') {
          context.report({node, messageId: 'invalidEventNameReference'});
          return;
        }

        // Grab the value of static eventName and confirm it follows the
        // required conventions.
        const valueOfEventName = eventNameProperty.value.value;
        if (!valueOfEventName.match(VALID_EVENT_NAME_REGEX)) {
          context.report({node, messageId: 'invalidEventName'});
        }
    }

    return {
      ClassDeclaration(node) {
        // If we find a local class defined called Event, we do not apply this
        // check, as we have some instances where a local Event class is used
        // which is not the builtin Event class that represents DOM emitted
        // events.
        if (node.id.name === 'Event') {
          foundLocalEventClassDeclaration = true;
          return;
        }

        if (!node.superClass || node.superClass.name !== 'Event') {
          return;
        }

        classDeclarationsToLint.push(node);
      },
      'Program:exit'() {
        if (foundLocalEventClassDeclaration) {
          return;
        }

        classDeclarationsToLint.forEach(node => {
          lintClassNode(node);
        });
      },
    };
  }
};
