// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define types based on TSESTree
type Node = TSESTree.Node;
type ClassDeclaration = TSESTree.ClassDeclaration;
type PropertyDefinition = TSESTree.PropertyDefinition;

type MessageIds = 'nonRenderBindFound';

export default createRule<[], MessageIds>({
  name: 'no-bound-component-methods',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that no methods that are used as Lit events are bound.',
      category: 'Possible Errors',
    },
    schema: [],
    messages: {
      nonRenderBindFound:
          'Found bound method name {{ methodName }} on {{ componentName }} that was not `render`. Lit-Html binds all event handlers for you automatically so this is not required.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    function nodeIsHTMLElementClassDeclaration(node: Node): node is ClassDeclaration {
      return node.type === 'ClassDeclaration' && node.superClass?.type === 'Identifier' &&
          node.superClass.name === 'HTMLElement';
    }

    const classesToCheck = new Set<ClassDeclaration>();

    // Store any method names that were passed to addEventListener.
    // With the following code:
    // window.addEventListener('click', this.boundOnClick)
    // we would add `boundOnClick` to this set.
    const addEventListenerCallPropertyNames = new Set<string>();

    // Type parameters for the helper function
    function checkPropertyDeclarationForBinding(className: string, node: PropertyDefinition): void {
      if (!node.value || node.value.type !== 'CallExpression') {
        return;
      }
      if (node.value.callee.type !== 'MemberExpression') {
        return;
      }
      // Ensure property is an Identifier before accessing name
      if (node.value.callee.property.type !== 'Identifier' || node.value.callee.property.name !== 'bind') {
        return;
      }
      // At this point we know it's a property of the form:
      //  someBoundThing = this.thing.bind(X)
      // and now we want to check that the argument passed to bind is `this`.
      // If the argument to bind is not `this`, we leave it be and move on.
      if (node.value.arguments[0]?.type !== 'ThisExpression') {
        return;
      }

      // At this point it's definitely of the form:
      //  someBoundThing = this.thing.bind(this)
      // But we know that `render` may be bound for the scheduler, so if it's render we can move on
      if (node.value.callee.object.type === 'MemberExpression' &&
          (node.value.callee.object.property.type === 'Identifier' ||
           node.value.callee.object.property.type === 'PrivateIdentifier') &&
          node.value.callee.object.property.name === 'render') {
        return;
      }

      // Now it's an error UNLESS we found a call to
      //  addEventListener(x, this.#boundFoo),
      // in which case it's allowed.

      // Get the property name for the bound method
      // #boundFoo = this.foo.bind(this);
      // node.key.name === 'boundFoo';
      if (node.key.type !== 'PrivateIdentifier' && node.key.type !== 'Identifier') {
        return;
      }

      const boundPropertyName = node.key.name;
      if (addEventListenerCallPropertyNames.has(boundPropertyName)) {
        return;
      }
      const methodName = node.value.callee.object.type === 'MemberExpression' &&
              node.value.callee.object.property.type === 'Identifier' ?
          node.value.callee.object.property.name :
          'unknown';

      context.report({
        node,
        messageId: 'nonRenderBindFound',
        data: {
          componentName: className,
          methodName,
        }
      });
    }

    function checkClassForBoundMethods(classDeclarationNode: ClassDeclaration): void {
      if (!classDeclarationNode.id) {
        return;
      }
      const className = classDeclarationNode.id.name;
      const classPropertyDeclarations = classDeclarationNode.body.body.filter((node): node is PropertyDefinition => {
        return node.type === 'PropertyDefinition';
      });

      for (const decl of classPropertyDeclarations) {
        checkPropertyDeclarationForBinding(className, decl);
      }
    }

    return {
      ClassDeclaration(classDeclarationNode) {
        if (!nodeIsHTMLElementClassDeclaration(classDeclarationNode)) {
          return;
        }

        classesToCheck.add(classDeclarationNode);
      },

      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') {
          return;
        }

        if ((node.callee.property.type !== 'Identifier' && node.callee.property.type !== 'PrivateIdentifier') ||
            node.callee.property.name !== 'addEventListener') {
          return;
        }

        const methodArg = node.arguments?.[1];
        // Confirm that the argument is this.X, otherwise skip it
        if (!methodArg || methodArg.type !== 'MemberExpression') {
          return;
        }

        // Get the property from the addEventListener call
        // window.addEventListener('click', this.#boundFoo)
        // This will be the node representing `#boundFoo`
        // and its `.name` property will be `boundFoo`
        const propertyArg = methodArg.property;
        // Ensure property type before accessing name
        if (propertyArg.type === 'Identifier' || propertyArg.type === 'PrivateIdentifier') {
          addEventListenerCallPropertyNames.add(propertyArg.name);
        }
      },
      'Program:exit'() {
        for (const classNode of classesToCheck) {
          checkClassForBoundMethods(classNode);
        }
      }
    };
  }
});
