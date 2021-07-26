// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

function lookForCSSFileProperty(node) {
  for (let i = 0; i < node.length; i++) {
    const propertyNode = node[i];
    if (propertyNode.key.name === 'cssFile') {
      return propertyNode;
    }
  }
  return null;
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Checks wasShown() method definitions call super.wasShown();',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      CallExpression(node) {
        if (node.type === 'CallExpression' &&
            (node.callee.name === 'createShadowRootWithCoreStyles' ||
             node.callee.property.name === 'createShadowRootWithCoreStyles')) {
          try {
            /* Construct 'import componentStyles form './componentStyles.css.js'' statement */
            const options = node.arguments[1];
            const propertyNode = lookForCSSFileProperty(options.properties);

            if (propertyNode && propertyNode.value.type === 'Literal') {
              const filenameWithExtension = propertyNode.value.value;
              const filename = path.basename(filenameWithExtension, '.css');
              const newFileName = filename + 'Styles';
              const importStatement = `import ${newFileName} from \'./${filename + '.css.js'}\';\n`;
              const programNode = context.getAncestors()[0];

              context.report({
                node,
                message: 'Import CSS file instead of passing a string into createShadowRootWithStyles',
                fix(fixer) {
                  return [
                    fixer.insertTextBefore(programNode, importStatement),
                    fixer.replaceText(propertyNode.value, newFileName)
                  ];
                }
              });
            }

          } catch (error) {
            context.report({
              node,
              message: `Please manually migrate this file. Got error: ${error.message}`,
            });
          }
        }
      }
    };
  }
};
