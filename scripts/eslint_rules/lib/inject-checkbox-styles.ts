// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESTree} from '@typescript-eslint/utils';
import path from 'path';

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

type AssignmentExpression = TSESTree.AssignmentExpression;
type TemplateElement = TSESTree.TemplateElement;
type Node = TSESTree.Node;

// Define MessageIds used in the rule
type MessageIds =|'missingCheckboxStylesImport'|'missingCheckboxStylesAdoption';

const FRONT_END_DIRECTORY = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'front_end',
);

// NOTE: the actual file is input.ts, but for the sake of importing we want
// input.js as that's what the import statement would reference.
const COMMON_INPUT_STYLES = path.join(FRONT_END_DIRECTORY, 'ui', 'components', 'input', 'input.js');

export default createRule<[], MessageIds>({
  name: 'inject-checkbox-styles',
  meta: {
    type: 'problem',

    docs: {
      description: 'Ensure common checkbox styles are imported in Lit components',
      category: 'Possible Errors',
    },
    messages: {
      // Define messages corresponding to MessageIds
      missingCheckboxStylesImport:
          'When rendering a checkbox, ensure the common checkbox styles are imported from components/input/input.ts.',
      missingCheckboxStylesAdoption:
          'When rendering a checkbox, ensure the common checkbox styles are adopted into the component shadow root or included in the template.',
    },
    schema: []
  },
  defaultOptions: [],
  create: function(context) {
    const filename = context.filename;
    let foundInputStylesImport = false;
    let inputStylesImportedName: string|null = null;
    // Type the node explicitly
    let adoptedStyleSheetsCallNode: AssignmentExpression|null = null;
    // Use a more specific type for the set elements if possible, otherwise Node or TemplateElement
    const litCheckboxElements = new Set<TemplateElement>();
    let hasCheckboxStylesInTemplate = false;
    return {
      TaggedTemplateExpression(node) {
        // Assuming isLitHtmlTemplateCall is typed appropriately in utils.ts
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        const litNodesContainingCheckbox = node.quasi.quasis.filter(element => {
          // element is TemplateElement
          return element.value.raw.includes('type="checkbox"');
        });
        for (const quasiNode of litNodesContainingCheckbox) {
          // We store the node so we can use it as the basis for the ESLint error later.
          litCheckboxElements.add(quasiNode);
        }
        if (node.quasi.expressions.some(isCheckboxStylesReference)) {
          hasCheckboxStylesInTemplate = true;
        }
      },

      ImportDeclaration(node) {
        if (foundInputStylesImport) {
          return;
        }

        // Ensure node.source.value is a string before resolving
        if (typeof node.source.value !== 'string') {
          return;
        }

        // Get the absolute path of the current file's directory, so we can
        // compare it to COMMON_INPUT_STYLES and see if the file does import the common styles.
        const absoluteDirectory = path.dirname(path.resolve(filename));
        // Use try-catch for path resolution as it might fail for invalid paths
        try {
          const fullImportPath = path.resolve(absoluteDirectory, node.source.value);
          foundInputStylesImport = fullImportPath === COMMON_INPUT_STYLES;
          if (foundInputStylesImport) {
            // Ensure specifiers exist and the first one has a local name
            if (node.specifiers && node.specifiers.length > 0 && node.specifiers[0].local) {
              inputStylesImportedName = node.specifiers[0].local.name;
            }
          }
        } catch (e) {
          // Ignore path resolution errors
          console.error(`Error resolving import path: ${node.source.value} in ${filename}`, e);
        }
      },

      AssignmentExpression(node: AssignmentExpression) {
        if (node.left.type === 'MemberExpression' && node.left.property.type === 'Identifier' &&
            node.left.property.name === 'adoptedStyleSheets') {
          adoptedStyleSheetsCallNode = node;
        }
      },

      'Program:exit'() {
        if (litCheckboxElements.size === 0) {
          // No checkboxes to check, so we are done.
          return;
        }
        if (!foundInputStylesImport) {
          for (const checkbox of litCheckboxElements) {
            context.report({
              node: checkbox,  // checkbox is TemplateElement
              messageId: 'missingCheckboxStylesImport',
            });
          }
          return;
        }

        if (hasCheckboxStylesInTemplate) {
          return;
        }

        if (!adoptedStyleSheetsCallNode) {
          for (const checkbox of litCheckboxElements) {
            context.report({
              node: checkbox,  // checkbox is TemplateElement
              messageId: 'missingCheckboxStylesAdoption',
            });
          }
          return;
        }

        // Ensure the right side is an ArrayExpression before accessing elements
        if (adoptedStyleSheetsCallNode.right.type !== 'ArrayExpression') {
          // Handle cases where adoptedStyleSheets is assigned something other than an array
          // This might indicate an error or an unexpected pattern.
          // Depending on requirements, you might report an error or just return.
          return;
        }

        const inputCheckboxStylesAdoptionReference =
            adoptedStyleSheetsCallNode.right.elements.find(isCheckboxStylesReference);

        if (!inputCheckboxStylesAdoptionReference) {
          context.report({
            node: adoptedStyleSheetsCallNode,  // Report on the assignment expression node
            messageId: 'missingCheckboxStylesAdoption',
          });
        }
      }
    };

    function isCheckboxStylesReference(elem: Node|null): boolean {
      // Ensure elem is not null and is a MemberExpression before accessing properties
      if (!elem || elem.type !== 'MemberExpression') {
        return false;
      }

      // Ensure object and property are Identifiers before accessing name
      if (elem.object.type !== 'Identifier' || elem.property.type !== 'Identifier') {
        return false;
      }

      // Check that if we imported the styles as `Input`, that the reference here matches.
      // Use non-null assertion for inputStylesImportedName as it's checked by foundInputStylesImport logic
      if (elem.object.name !== inputStylesImportedName) {
        return false;
      }

      if (elem.property.name !== 'checkboxStyles') {
        return false;
      }

      return true;
    }
  }
});
