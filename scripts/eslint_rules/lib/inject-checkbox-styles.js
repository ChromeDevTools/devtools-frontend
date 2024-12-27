// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');
const path = require('path');

const FRONT_END_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end');

// NOTE: the actual file is input.ts, but for the sake of importing we want
// input.js as that's what the import statement would reference.
const COMMON_INPUT_STYLES = path.join(FRONT_END_DIRECTORY, 'ui', 'components', 'input', 'input.js');

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Ensure common checkbox styles are imported in Lit components',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      missingCheckboxStylesImport:
          'When rendering a checkbox, ensure the common checkbox styles are imported from components/input/input.ts.',
      missingCheckboxStylesAdoption:
          'When rendering a checkbox, ensure the common checkbox styles are adopted into the component shadow root.',
    },
    schema: []  // no options
  },
  create: function(context) {
    let foundInputStylesImport = false;
    let inputStylesImportedName = null;
    let adoptedStyleSheetsCallNode = null;
    const litCheckboxElements = new Set();
    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        const litNodesContainingCheckbox = node.quasi.quasis.filter(element => {
          return element.value.raw.includes('type="checkbox"');
        });
        for (const node of litNodesContainingCheckbox) {
          // We store the node so we can use it as the basis for the ESLint error later.
          litCheckboxElements.add(node);
        }
      },

      ImportDeclaration(node) {
        if (foundInputStylesImport) {
          return;
        }

        // Get the absolute path of the current file's directory, so we can
        // compare it to COMMON_INPUT_STYLES and see if the file does import the common styles.
        const absoluteDirectory = path.dirname(path.resolve(context.getFilename()));
        const fullImportPath = path.resolve(absoluteDirectory, node.source.value);
        foundInputStylesImport = fullImportPath === COMMON_INPUT_STYLES;
        if (foundInputStylesImport) {
          inputStylesImportedName = node.specifiers[0].local.name;
        }
      },

      'AssignmentExpression[left.type="MemberExpression"][left.property.name="adoptedStyleSheets"]'(node) {
        adoptedStyleSheetsCallNode = node;
      },

      'Program:exit'() {
        if (litCheckboxElements.size === 0) {
          // No checkboxes to check, so we are done.
          return;
        }
        if (!foundInputStylesImport) {
          for (const checkbox of litCheckboxElements) {
            context.report({
              node: checkbox,
              messageId: 'missingCheckboxStylesImport',
            });
          }
          return;
        }

        if (!adoptedStyleSheetsCallNode) {
          for (const checkbox of litCheckboxElements) {
            context.report({
              node: checkbox,
              messageId: 'missingCheckboxStylesAdoption',
            });
          }
          return;
        }

        const inputCheckboxStylesAdoptionReference = adoptedStyleSheetsCallNode.right.elements.find(elem => {
          // Ensure we find [Input.checkboxStyles] in the adopted stylesheets.
          if (elem.type !== 'MemberExpression') {
            return false;
          }

          // Check that if we imported the styles as `Input`, that the reference here matches.
          if (elem.object.name !== inputStylesImportedName) {
            return false;
          }

          if (elem.property.name !== 'checkboxStyles') {
            return false;
          }

          return true;
        });

        if (!inputCheckboxStylesAdoptionReference) {
          context.report({
            node: adoptedStyleSheetsCallNode,
            messageId: 'missingCheckboxStylesAdoption',
          });
        }
      }
    };
  }
};
