// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const KEBAB_CASE_REGEX = /^([a-z][a-z]*)(-[a-z]+)*$/;

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check for event naming',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ClassDeclaration(node) {
        if (!node.superClass || node.superClass.name !== 'Event') {
          return;
        }
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
        if (firstArgToSuper.type !== 'Literal') {
          context.report({node: superCall, message: 'The super() call for a custom event must be a string literal.'});
          return;
        }
        const firstArgLiteralValue = firstArgToSuper.value;
        if (!firstArgLiteralValue.match(KEBAB_CASE_REGEX)) {
          context.report({node, message: 'Custom events must be named in kebab-case.'});
        }
      },
    };
  }
};
