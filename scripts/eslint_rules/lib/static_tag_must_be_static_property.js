// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Check for <devtools-* in Lit templates instead of tag names.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      invalidStaticProperty:
          'Found an invalid static tag interpolated value. Static tags should be named "litTagName" and be accessed from the class they are defined on: ${Foo.litTagName}.'
    },
    schema: []  // no options
  },
  create: function(context) {
    function interpolatedStaticTagUsesLitTagName(interpolatedPart) {
      // This means it's not of the form ${Foo.someMember} and is instead ${foo}
      if (interpolatedPart.type !== 'MemberExpression') {
        context.report({node: interpolatedPart, messageId: 'invalidStaticProperty'});
        return;
      }

      // If we're inspecting `Foo.litTagName`, `Foo` === objectName, and
      // `litTagName` === staticPropertyName.
      const objectName = interpolatedPart.object.name;
      const staticPropertyName = interpolatedPart.property.name;

      // Ensure that the object starts with a capital (best we can do to ensure
      // it's a class), and make sure the static property is called
      // `litTagName`.
      if (!/[A-Z]/.test(objectName) || staticPropertyName !== 'litTagName') {
        context.report({node: interpolatedPart, messageId: 'invalidStaticProperty'});
      }
    }

    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        const literalTemplateParts = node.quasi.quasis;
        const templateExpressionParts = node.quasi.expressions;

        /**
         * Look for a template part which ends with `<` (opening tag) or `</`
         * (closing tag), followed by one that starts with `>`. Then check the
         * expression that splits those parts.
         */
        literalTemplateParts.forEach((part, partIndex) => {
          const nextPart = literalTemplateParts[partIndex + 1];
          if (part.value.raw.endsWith('<') && nextPart && nextPart.value.raw.startsWith('>')) {
            // Opening tag
            interpolatedStaticTagUsesLitTagName(templateExpressionParts[partIndex]);
          } else if (part.value.raw.endsWith('</') && nextPart && nextPart.value.raw.startsWith('>')) {
            // Closing tag
            interpolatedStaticTagUsesLitTagName(templateExpressionParts[partIndex]);
          }
        });
      },
    };
  }
};
