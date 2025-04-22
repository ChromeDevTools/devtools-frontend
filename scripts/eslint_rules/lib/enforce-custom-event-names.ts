// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define specific node types for clarity
type ClassDeclaration = TSESTree.ClassDeclaration;
type MethodDefinition = TSESTree.MethodDefinition;
type ExpressionStatement = TSESTree.ExpressionStatement;
type PropertyDefinition = TSESTree.PropertyDefinition;

/**
 * Match all lowercase letters from the start to the end.
 */
const VALID_EVENT_NAME_REGEX = /^([a-z]+)$/;

export default createRule({
  name: 'enforce-custom-event-names',
  meta: {
    type: 'problem',
    docs: {
      description: 'check for event naming',
      category: 'Possible Errors',
    },
    messages: {
      invalidEventName: 'Custom events must be named in all lower case with no punctuation.',
      invalidEventNameReference: 'When referencing a custom event name, it must be accessed as ClassName.eventName.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    let foundLocalEventClassDeclaration = false;
    const classDeclarationsToLint: ClassDeclaration[] = [];

    function lintClassNode(node: ClassDeclaration) {
      const constructor = node.body.body.find((bodyNode): bodyNode is MethodDefinition => {
        return bodyNode.type === 'MethodDefinition' && bodyNode.kind === 'constructor';
      });

      if (!constructor?.value.body) {
        return;
      }

      // Find the super() call within the constructor
      const superCallExpressionStatement =
          constructor.value.body.body.find((bodyNode): bodyNode is ExpressionStatement => {
            return bodyNode.type === 'ExpressionStatement' && bodyNode.expression.type === 'CallExpression' &&
                bodyNode.expression.callee?.type === 'Super';
          });

      if (!superCallExpressionStatement || superCallExpressionStatement.expression.type !== 'CallExpression') {
        // Should not happen if the type guard worked, but good for safety
        return;
      }
      const superCall = superCallExpressionStatement.expression;

      const firstArgToSuper = superCall.arguments[0];
      if (!firstArgToSuper) {
        // This is invalid, but TypeScript will catch this for us so no need to
        // error in ESLint land as well.
        return;
      }

      // Case 1: super('eventname')
      if (firstArgToSuper.type === 'Literal') {
        // Ensure it's a string literal before checking value
        if (typeof firstArgToSuper.value === 'string') {
          const firstArgLiteralValue = firstArgToSuper.value;
          if (!firstArgLiteralValue.match(VALID_EVENT_NAME_REGEX)) {
            // Report on the literal value itself for better location
            context.report({node: firstArgToSuper, messageId: 'invalidEventName'});
          }
        } else {
          context.report({node: firstArgToSuper, messageId: 'invalidEventName'});
        }
        return;
      }

      // Case 2: super(SomeClass.eventName)
      if (firstArgToSuper.type === 'MemberExpression') {
        // Ensure the class has a name to compare against
        const eventClassName = node.id?.name;
        if (!eventClassName) {
          // Cannot validate anonymous classes this way
          return;
        }

        // Check if the member expression structure is correct (Identifier.Identifier)
        if (firstArgToSuper.object.type !== 'Identifier' || firstArgToSuper.property.type !== 'Identifier') {
          context.report({node: firstArgToSuper, messageId: 'invalidEventNameReference'});
          return;
        }

        const objectName: string = firstArgToSuper.object.name;
        const propertyName: string = firstArgToSuper.property.name;

        // Check if it matches ClassName.eventName
        if (objectName !== eventClassName || propertyName !== 'eventName') {
          context.report({node: firstArgToSuper, messageId: 'invalidEventNameReference'});
          return;
        }

        // If the reference is right (ClassName.eventName), find the static property definition
        const eventNameProperty = node.body.body.find((classBodyPart): classBodyPart is PropertyDefinition => {
          return classBodyPart.type === 'PropertyDefinition' && classBodyPart.static === true &&  // Ensure it's static
              classBodyPart.key?.type === 'Identifier' && classBodyPart.key.name === 'eventName';
        });

        // This rule depends on the static-custom-event-names rule to enforce existence/static/readonly.
        // If it exists, check its value.
        if (eventNameProperty) {
          // We only allow static eventName = 'literalvalue';
          if (!eventNameProperty.value || eventNameProperty.value.type !== 'Literal' ||
              typeof eventNameProperty.value.value !== 'string') {
            // Report on the property value if it's not a string literal
            context.report(
                {node: eventNameProperty.value ?? eventNameProperty, messageId: 'invalidEventNameReference'});
            return;
          }

          // Grab the value of static eventName and confirm it follows the required conventions.
          const valueOfEventName = eventNameProperty.value.value;
          if (!valueOfEventName.match(VALID_EVENT_NAME_REGEX)) {
            // Report on the property value literal
            context.report({node: eventNameProperty.value, messageId: 'invalidEventName'});
          }
        }

        return;
      }

      // Case 3: super(someOtherVariable) or invalid structure
      // This means it's neither a Literal nor the specific MemberExpression ClassName.eventName
      context.report({node: firstArgToSuper, messageId: 'invalidEventNameReference'});
    }

    return {
      ClassDeclaration(node) {
        // If we find a local class defined called Event, we do not apply this
        // check, as we have some instances where a local Event class is used
        // which is not the builtin Event class that represents DOM emitted
        // events.
        if (node.id?.name === 'Event') {
          foundLocalEventClassDeclaration = true;
          return;
        }

        // Check if the class extends the global 'Event'
        if (!node.superClass || node.superClass.type !== 'Identifier' || node.superClass.name !== 'Event') {
          return;
        }

        if (!node.superClass || node.superClass.type !== 'Identifier' || node.superClass.name !== 'Event') {
          return;
        }

        classDeclarationsToLint.push(node);
      },
      'Program:exit'(): void {
        if (foundLocalEventClassDeclaration) {
          return;
        }

        classDeclarationsToLint.forEach((node: ClassDeclaration) => {
          lintClassNode(node);
        });
      },
    };
  },
});
