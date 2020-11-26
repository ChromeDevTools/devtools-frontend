// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check data setters have an explicit type reference for their parameter',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ClassDeclaration(node) {
        // Only enforce this rule for custom elements
        if (!node.superClass || node.superClass.name !== 'HTMLElement') {
          return;
        }

        const dataSetterDefinition = node.body.body.find(methodDefinition => {
          return methodDefinition.kind === 'set' && methodDefinition.key.name === 'data';
        });

        if (!dataSetterDefinition) {
          return;
        }

        const dataSetterParam = dataSetterDefinition.value.params[0];
        if (!dataSetterParam) {
          context.report(
              {node: dataSetterDefinition, message: 'A data setter must take a parameter that is explicitly typed.'});
          return;
        }

        if (!dataSetterParam.typeAnnotation) {
          context.report({
            node: dataSetterDefinition,
            message: 'The type of a parameter in a data setter must be explicitly defined.'
          });
          return;
        }

        if (dataSetterParam.typeAnnotation.typeAnnotation.type !== 'TSTypeReference') {
          context.report({
            node: dataSetterDefinition,
            message: 'A data setter parameter\'s type must be a type reference, not a literal type defined inline.'
          });
        }
      }
    };
  }
};
