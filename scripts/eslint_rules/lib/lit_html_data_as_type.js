// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');

function findIndexOfDataSetterUsageForNode(taggedTemplateExpression) {
  const dataSetterText = '.data=';
  const templateParts = taggedTemplateExpression.quasi.quasis;

  /**
   * This is a bit confusing, and I recommend diving into an example on AST
   * Explorer:
   * https://astexplorer.net/#/gist/62cbc8d019845173b0dfc14214f5a5c4/ce8da61683b587cbccb305fea605b6fad9bc7f89
   * But the summary is that the templateParts are an array of all the static
   * parts of a template. So if we have an input of:
   * <foo .data=${something}></foo>
   * then there are two template parts:
   * 1) represents the string "<foo .data="
   * 2) represets the string "></foo>"
   *
   * All we need to do is find the part that ends with .data= and return its
   * index, because alongside the template parts is another array of expressions
   * representing all the dynamic parts of the template.
   */
  const indices = [];
  for (const [index, part] of templateParts.entries()) {
    if (part.value.cooked.endsWith(dataSetterText)) {
      indices.push(index);
    }
  }
  return indices;
}

function dataSetterUsesTypeCast(taggedTemplateExpression, indexOfDataSetter) {
  const expression = taggedTemplateExpression.quasi.expressions[indexOfDataSetter];
  return (expression.type === 'TSAsExpression');
}

function dataSetterAsUsesInterface(taggedTemplateExpression, indexOfDataSetter) {
  const expression = taggedTemplateExpression.quasi.expressions[indexOfDataSetter];
  return (expression.typeAnnotation.type === 'TSTypeReference');
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check for .data typecasts',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        const isLitHtmlCall = isLitHtmlTemplateCall(node);
        if (!isLitHtmlCall) {
          return;
        }

        for (const indexOfDataSetterCall of findIndexOfDataSetterUsageForNode(node)) {
          const dataUsageHasTypeCast = dataSetterUsesTypeCast(node, indexOfDataSetterCall);
          if (!dataUsageHasTypeCast) {
            context.report({node, message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'});
            continue;
          }

          if (!dataSetterAsUsesInterface(node, indexOfDataSetterCall)) {
            context.report({
              node,
              message:
                  'LitHtml .data=${} calls must be typecast to a type reference (e.g. `as FooInterface`), not a literal.'
            });
          }
        }
      },
    };
  }
};
