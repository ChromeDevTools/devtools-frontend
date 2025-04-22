// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'set-data-type-reference',
  meta: {
    type: 'problem',
    docs: {
      description: 'check data setters have an explicit type reference for their parameter',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      dataSetterMustTakeExplicitlyTypedParameter: 'A data setter must take a parameter that is explicitly typed.',
      dataSetterParamTypeMustBeDefined: 'The type of a parameter in a data setter must be explicitly defined.',
      dataSetterParamTypeMustBeTypeReference:
          'A data setter parameter’s type must be a type reference, not a literal type defined inline.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      ClassDeclaration(node) {
        // Only enforce this rule for custom elements
        if (!node.superClass || node.superClass.type !== 'Identifier' || node.superClass.name !== 'HTMLElement') {
          return;
        }

        const dataSetterDefinition = node.body.body.find(methodDefinition => {
          return (
              'kind' in methodDefinition && methodDefinition.kind === 'set' && 'key' in methodDefinition &&
              methodDefinition.key.type === 'Identifier' && methodDefinition.key.name === 'data');
        });

        if (!dataSetterDefinition || dataSetterDefinition.type === 'StaticBlock') {
          return;
        }
        // @ts-expect-error needs proper check of eslint.type
        const dataSetterParam = dataSetterDefinition.value?.params?.[0];
        if (!dataSetterParam) {
          context.report({
            node: dataSetterDefinition,
            messageId: 'dataSetterMustTakeExplicitlyTypedParameter',
          });
          return;
        }

        if (!dataSetterParam.typeAnnotation) {
          context.report({
            node: dataSetterDefinition,
            messageId: 'dataSetterParamTypeMustBeDefined',
          });
          return;
        }

        if (dataSetterParam.typeAnnotation.typeAnnotation.type !== 'TSTypeReference') {
          context.report({
            node: dataSetterDefinition,
            messageId: 'dataSetterParamTypeMustBeTypeReference',
          });
        }
      },
    };
  },
});
