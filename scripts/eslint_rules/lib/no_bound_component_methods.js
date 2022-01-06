// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that no methods that are used as LitHtml events are bound.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
    messages: {
      nonRenderBindFound:
          'Found bound method name {{ methodName }} on {{ componentName }} that was not `render`. Lit-Html binds all event handlers for you automatically so this is not required.',
    },
  },
  create: function(context) {
    function nodeIsHTMLElementClassDeclaration(node) {
      return node.type === 'ClassDeclaration' && node.superClass && node.superClass.name === 'HTMLElement';
    }

    const classesToCheck = new Set();

    // Store any method names that were passed to addEventListener.
    // With the following code:
    // window.addEventListener('click', this.boundOnClick)
    // we would add `boundOnClick` to this set.
    const addEventListenerCallPropertyNames = new Set();

    function checkPropertyDeclarationForBinding(className, node) {
      if (!node.value || node.value.type !== 'CallExpression') {
        return;
      }
      if (node.value.callee.type !== 'MemberExpression') {
        return;
      }
      if (node.value.callee.property.name !== 'bind') {
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
      if (node.value.callee.object.property.name === 'render') {
        return;
      }

      // Now it's an error UNLESS we found a call to
      //  addEventListener(x, this.#boundFoo),
      // in which case it's allowed.

      // Get the property name for the bound method
      // #boundFoo = this.foo.bind(this);
      // node.key.name === 'boundFoo';
      const boundPropertyName = node.key.name;
      if (addEventListenerCallPropertyNames.has(boundPropertyName)) {
        return;
      }

      context.report({
        node: node,
        messageId: 'nonRenderBindFound',
        data: {componentName: className, methodName: node.value.callee.object.property.name}
      });
    }

    function checkClassForBoundMethods(classDeclarationNode) {
      const classPropertyDeclarations = classDeclarationNode.body.body.filter(node => {
        return node.type === 'PropertyDefinition';
      });
      for (const decl of classPropertyDeclarations) {
        checkPropertyDeclarationForBinding(classDeclarationNode.id.name, decl);
      }
    }

    return {
      ClassDeclaration(classDeclarationNode) {
        if (!nodeIsHTMLElementClassDeclaration(classDeclarationNode)) {
          return;
        }

        classesToCheck.add(classDeclarationNode);
      },
      'CallExpression[callee.type=\'MemberExpression\'][callee.property.name=\'addEventListener\']'(
          callExpressionNode) {
        const methodArg = callExpressionNode.arguments[1];
        // Confirm that the argument is this.X, otherwise skip it
        if (methodArg.type !== 'MemberExpression') {
          return;
        }

        // Get the property from the addEventListener call
        // window.addEventListener('click', this.#boundFoo)
        // This will be the node representing `#boundFoo`
        // and its `.name` property will be `boundFoo`
        const propertyArg = methodArg.property;
        addEventListenerCallPropertyNames.add(propertyArg.name);
      },
      'Program:exit'() {
        for (const classNode of classesToCheck) {
          checkClassForBoundMethods(classNode);
        }
      }
    };
  }
};
