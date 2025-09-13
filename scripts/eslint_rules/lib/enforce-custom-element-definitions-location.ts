// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import path from 'node:path';

import {createRule} from './utils/ruleCreator.ts';

export default createRule<[{rootFrontendDirectory: string}], 'definitionInWrongFolder'>({
  name: 'enforce-custom-element-definitions-location',
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure that custom element definitions are in the correct folders.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      definitionInWrongFolder: 'A custom element definition was found in a folder that ' +
          'should not contain element definitions. If you want to define a custom element, ' +
          'either place it in `ui/components/` or in a `components` sub-folder of a panel. ' +
          'E.g. `panels/elements/components/`.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          rootFrontendDirectory: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{rootFrontendDirectory: ''}],
  create: function(context) {
    const filename = context.filename;
    const classDefiningFileName = path.resolve(filename);

    let frontEndDirectory = '';
    if (context.options[0]?.rootFrontendDirectory) {
      frontEndDirectory = context.options[0].rootFrontendDirectory;
    }
    if (!frontEndDirectory) {
      throw new Error(
          'rootFrontEndDirectory must be provided to custom_elements_definitions_location.',
      );
    }

    const PANELS_DIRECTORY = path.join(frontEndDirectory, 'panels');

    const ALLOWED_CUSTOM_ELEMENT_LOCATIONS = new Set([
      path.join(frontEndDirectory, 'ui', 'components'),

      // These should be moved to `ui/components` at some point
      path.join(frontEndDirectory, 'ui', 'legacy'),
      // path.join(frontEndDirectory, 'ui', 'legacy', 'components', 'inline_editor'),
      // path.join(frontEndDirectory, 'ui', 'legacy', 'components', 'perf_ui', 'PieChart.ts'),
      // path.join(frontEndDirectory, 'ui', 'legacy', 'XElement.ts'),
    ]);

    return {
      ClassDeclaration(node) {
        if (node.superClass?.type !== 'Identifier' || node.superClass?.name !== 'HTMLElement') {
          return;
        }

        for (const allowedLocation of ALLOWED_CUSTOM_ELEMENT_LOCATIONS) {
          if (classDefiningFileName.startsWith(allowedLocation)) {
            return;
          }
        }

        if (classDefiningFileName.startsWith(PANELS_DIRECTORY)) {
          const filePathWithPanelName = classDefiningFileName.substring(
              PANELS_DIRECTORY.length + 1,
          );
          const filePathWithoutPanelName = filePathWithPanelName.substring(
              filePathWithPanelName.indexOf(path.sep) + 1,
          );

          if (filePathWithoutPanelName.includes(`components${path.sep}`)) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'definitionInWrongFolder',
        });
      },
    };
  },
});
