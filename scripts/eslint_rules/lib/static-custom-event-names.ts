// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define specific node types for clarity
type ClassDeclaration = TSESTree.ClassDeclaration;
type MethodDefinition = TSESTree.MethodDefinition;
type ExpressionStatement = TSESTree.ExpressionStatement;
type MemberExpression = TSESTree.MemberExpression;
type Literal = TSESTree.Literal;
type Identifier = TSESTree.Identifier;
type RuleFix = TSESLint.RuleFix;
type RuleFixer = TSESLint.RuleFixer;

// Define message IDs type based on meta.messages

// Define the structure for the return value of findConstructorAndSuperCallAndFirstArgumentToSuper
interface FoundNodes {
  constructor: MethodDefinition|undefined;
  superExpression: ExpressionStatement|undefined;
  firstArgumentToSuper: MemberExpression|Literal|Identifier|undefined;
}

export default createRule({
  name: 'static-custom-event-names',
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
      eventNameNotStatic: 'The eventName property must a static property.',
      superEventNameWrong: 'The first argument to super() must be EventClass.eventName.',
      noSuperCallFound: 'Could not find a super() call in the constructor.',
      noConstructorFound: 'Could not find a constructor for the custom event.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function findConstructorAndSuperCallAndFirstArgumentToSuper(node: ClassDeclaration): FoundNodes {
      const foundNodes: FoundNodes = {
        constructor: undefined,
        superExpression: undefined,
        firstArgumentToSuper: undefined,
      };

      const constructor = node.body.body.find((bodyNode): bodyNode is MethodDefinition => {
        return bodyNode.type === 'MethodDefinition' && bodyNode.kind === 'constructor' &&
            bodyNode.key?.type === 'Identifier' && bodyNode.key?.name === 'constructor';
      });

      if (!constructor?.value.body) {
        return foundNodes;
      }
      foundNodes.constructor = constructor;

      const superExpression = constructor.value.body.body.find((bodyNode): bodyNode is ExpressionStatement => {
        return bodyNode.type === 'ExpressionStatement' && bodyNode.expression.type === 'CallExpression' &&
            bodyNode.expression.callee?.type === 'Super';
      });

      if (!superExpression || superExpression.expression.type !== 'CallExpression') {
        return foundNodes;
      }
      foundNodes.superExpression = superExpression;

      const firstArgumentToSuper = superExpression.expression.arguments[0];
      if (!firstArgumentToSuper ||
          (firstArgumentToSuper.type !== 'MemberExpression' && firstArgumentToSuper.type !== 'Literal' &&
           firstArgumentToSuper.type !== 'Identifier')) {
        // This is invalid or unexpected type, so bail.
        return foundNodes;
      }
      foundNodes.firstArgumentToSuper = firstArgumentToSuper;
      return foundNodes;
    }

    function tryToAutoFixIfWeCan(fixer: RuleFixer, node: ClassDeclaration): RuleFix[] {
      // We can autofix nodes when either:
      // 1. They do not have the static declaration, and there is a super('fooevent') call
      // => in this case, we can define static readonly eventName = 'fooevent' and update the super() call's first argument.
      // 2. There is a staticEventName declared, but the super() call is using the literal. In this case, we can update the super() call's first argument.
      // Note: if we cannot fix, we return an empty array, which signifies to
      // ESLint that there's no fixes we'd like to apply.

      const firstBodyNode = node.body.body[0];
      const nodeIsMissingEventName =
          !(firstBodyNode?.type === 'PropertyDefinition' && firstBodyNode.key?.type === 'Identifier' &&
            firstBodyNode.key?.name === 'eventName');
      const className = node.id?.name;
      if (!className) {
        // Cannot fix anonymous classes or classes without names
        return [];
      }

      const {firstArgumentToSuper} = findConstructorAndSuperCallAndFirstArgumentToSuper(node);
      if (!firstArgumentToSuper || firstArgumentToSuper.type !== 'Literal') {
        // Either it's OK, or it's some value that isn't a string literal, so we should bail.
        return [];
      }
      const eventNameFromSuper = firstArgumentToSuper.value;
      const fixes: RuleFix[] = [];

      if (nodeIsMissingEventName) {
        fixes.push(fixer.insertTextBefore(node.body.body[0], `static readonly eventName = '${eventNameFromSuper}';`));
      }

      fixes.push(fixer.replaceText(firstArgumentToSuper, `${className}.eventName`));
      return fixes;
    }

    function lintClassNode(node: ClassDeclaration) {
      const bodyMembersOfClass = node.body.body;
      // Look for the static readonly eventName line.
      // We purposefully look at the first body node as it should be defined first

      const firstBodyNode = bodyMembersOfClass[0];
      const className = node.id?.name;  // Get class name for later use

      // Check for static readonly eventName property as the first member
      if (!(firstBodyNode?.type === 'PropertyDefinition' && firstBodyNode.key?.type === 'Identifier' &&
            firstBodyNode.key.name === 'eventName')) {
        context.report({
          node,
          messageId: 'missingEventName',
          fix(fixer) {
            return tryToAutoFixIfWeCan(fixer, node);
          },
        });
        return;
      }

      if (!firstBodyNode.readonly) {
        context.report({node: firstBodyNode, messageId: 'eventNameNotReadonly'});
      }

      if (!firstBodyNode.static) {
        context.report({node: firstBodyNode, messageId: 'eventNameNotStatic'});
        return;
      }

      // Now check the constructor and super() call.
      const {constructor, superExpression, firstArgumentToSuper} =
          findConstructorAndSuperCallAndFirstArgumentToSuper(node);

      if (!constructor) {
        context.report({node, messageId: 'noConstructorFound'});
        return;
      }
      if (!superExpression) {
        context.report({node: constructor, messageId: 'noSuperCallFound'});
        return;
      }
      if (!firstArgumentToSuper) {
        context.report({node: superExpression, messageId: 'superEventNameWrong'});
        return;
      }

      // Check if the first argument to super() is ClassName.eventName
      if (firstArgumentToSuper.type !== 'MemberExpression' || firstArgumentToSuper.object.type !== 'Identifier' ||
          firstArgumentToSuper.property.type !== 'Identifier' || firstArgumentToSuper.object.name !== className ||
          firstArgumentToSuper.property.name !== 'eventName') {
        context.report({
          node: firstArgumentToSuper,
          messageId: 'superEventNameWrong',
          fix(fixer) {
            return tryToAutoFixIfWeCan(fixer, node);
          },
        });
      }
    }

    let foundLocalEventClassDeclaration = false;
    const classDeclarationsToLint: ClassDeclaration[] = [];

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

        classDeclarationsToLint.push(node);
      },
      'Program:exit'() {
        if (foundLocalEventClassDeclaration) {
          return;
        }

        for (const node of classDeclarationsToLint) {
          lintClassNode(node);
        }
      },
    };
  },
});
