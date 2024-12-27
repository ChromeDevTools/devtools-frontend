// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlRenderCall} = require('./utils.js');

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'enforce use of {host: this} when rendering LitHtml',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      missingHostOption:
          'LitHtml.render call does not include {host: this} as the third option. This may cause event handlers to be called with the wrong scope.',
      invalidHostOption: 'The host option must be set to `this` to ensure event listeners are bound correctly.'
    },
    schema: []  // no options
  },
  create: function(context) {
    return {
      CallExpression(node) {
        if (!isLitHtmlRenderCall(node)) {
          return;
        }

        const argumentsToRenderCall = node.arguments;
        if (!argumentsToRenderCall) {
          // Invalid, but TypeScript will catch it.
          // So no need to do anything.
          return;
        }

        const optionsArgument = argumentsToRenderCall[2];
        if (!optionsArgument) {
          context.report({
            node,
            messageId: 'missingHostOption',
            fix(fixer) {
              if (argumentsToRenderCall[1]) {
                return [fixer.insertTextAfter(argumentsToRenderCall[1], ', {host: this}')];
              }
              return [];
            }
          });
          return;
        }
        if (optionsArgument.type !== 'ObjectExpression') {
          // Invalid, but TypeScript will catch it.
          return;
        }

        let hostProperty = null;
        for (const property of optionsArgument.properties) {
          if (property.key.name === 'host') {
            hostProperty = property;
            break;
          }
        }

        if (!hostProperty) {
          context.report({
            node: optionsArgument,
            messageId: 'missingHostOption',
            fix(fixer) {
              const lastProperty = optionsArgument.properties[optionsArgument.properties.length - 1];
              return [
                fixer.insertTextAfter(lastProperty, ', host: this'),
              ];
            }
          });
          return;
        }

        if (hostProperty.value.type !== 'ThisExpression') {
          context.report({node: hostProperty, messageId: 'invalidHostOption'});
          return;
        }
      },
    };
  }
};
