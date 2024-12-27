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
    function findConstructorAndSuperCallAndFirstArgumentToSuper(node) {
      const foundNodes = {
        constructor: undefined,
        superExpression: undefined,
        firstArgumentToSuper: undefined,
      };
      const constructor = node.body.body.find(bodyNode => {
        return bodyNode.type === 'MethodDefinition' && bodyNode.key?.name === 'constructor';
      });
      if (!constructor) {
        return foundNodes;
      }

      foundNodes.constructor = constructor;

      const superExpression = constructor.value.body.body.find(bodyNode => {
        const isExpression = bodyNode.type === 'ExpressionStatement';
        if (!isExpression) {
          return false;
        }
        return isExpression && bodyNode.expression.callee?.type === 'Super';
      });

      if (!superExpression) {
        return foundNodes;
      }

      foundNodes.superExpression = superExpression;

      const firstArgumentToSuper = superExpression.expression.arguments[0];
      if (!firstArgumentToSuper) {
        // This is invalid so bail.
        return foundNodes;
      }
      foundNodes.firstArgumentToSuper = firstArgumentToSuper;
      return foundNodes;
    }

    function tryToAutoFixIfWeCan(fixer, node) {
      // We can autofix nodes when either:
      // 1. They do not have the static declaration, and there is a super('fooevent') call
      // => in this case, we can define static readonly eventName = 'fooevent' and update the super() call's first argument.
      // 2. There is a staticEventName declared, but the super() call is using the literal. In this case, we can update the super() call's first argument.

      // Note: if we cannot fix, we return an empty array, which signifies to
      // ESLint that there's no fixes we'd like to apply.

      const nodeIsMissingEventName = node.body.body[0]?.key?.name !== 'eventName';
      const className = node.id.name;

      const {firstArgumentToSuper} = findConstructorAndSuperCallAndFirstArgumentToSuper(node);
      if (!firstArgumentToSuper || firstArgumentToSuper.type !== 'Literal') {
        // Either it's OK, or it's some value that isn't a string literal, so we should bail.
        return [];
      }
      const eventNameFromSuper = firstArgumentToSuper.value;
      const fixes = [];
      if (nodeIsMissingEventName) {
        fixes.push(fixer.insertTextBefore(node.body.body[0], `static readonly eventName = '${eventNameFromSuper}';`));
      }

      fixes.push(fixer.replaceText(firstArgumentToSuper, `${className}.eventName`));
      return fixes;
    }

    function lintClassNode(node) {
      const bodyMembersOfClass = node.body.body;
      // Look for the static readonly eventName line.
      // We purposefully look at the first body node as it should be defined first
      const firstBodyNode = bodyMembersOfClass[0];
      if (!firstBodyNode || firstBodyNode.key.name !== 'eventName') {
        context.report({
          node,
          messageId: 'missingEventName',
          fix(fixer) {
            return tryToAutoFixIfWeCan(fixer, node);
          }
        });
        return;
      }
      if (!firstBodyNode.readonly) {
        context.report({node, messageId: 'eventNameNotReadonly'});
      }
      if (!firstBodyNode.static) {
        context.report({node, messageId: 'eventNameNotStatic'});
        return;
      }

      // Now we know the static readonly eventName is defined, we check for
      // the constructor and the super() call.
      const {constructor, superExpression, firstArgumentToSuper} =
          findConstructorAndSuperCallAndFirstArgumentToSuper(node);

      if (!constructor) {
        context.report({node, messageId: 'noConstructorFound'});
        return;
      }
      if (!superExpression) {
        context.report({node, messageId: 'noSuperCallFound'});
        return;
      }
      if (!firstArgumentToSuper) {
        context.report({node, messageId: 'superEventNameWrong'});
        return;
      }

      const customEventClassName = node.id.name;
      if (firstArgumentToSuper.type !== 'MemberExpression') {
        context.report({
          node,
          messageId: 'superEventNameWrong',
          fix(fixer) {
            return tryToAutoFixIfWeCan(fixer, node);
          }
        });
        return;
      }
      if (firstArgumentToSuper.object.name !== customEventClassName ||
          firstArgumentToSuper.property.name !== 'eventName') {
        context.report({node, messageId: 'superEventNameWrong'});
        return;
      }
    }

    let foundLocalEventClassDeclaration = false;
    const classDeclarationsToLint = [];

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

        if (!node.superClass) {
          return;
        }
        if (node.superClass.name !== 'Event') {
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
