// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');

const FRONT_END_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end');
const PANELS_DIRECTORY = path.join(FRONT_END_DIRECTORY, 'panels');

const ALLOWED_CUSTOM_ELEMENT_LOCATIONS = new Set([
  path.join(FRONT_END_DIRECTORY, 'ui', 'components'),

  // These should be moved to `ui/components` at some point
  path.join(FRONT_END_DIRECTORY, 'ui', 'legacy', 'components', 'inline_editor'),
  path.join(FRONT_END_DIRECTORY, 'ui', 'legacy', 'components', 'perf_ui', 'PieChart.ts'),
  path.join(FRONT_END_DIRECTORY, 'ui', 'legacy', 'XElement.ts'),
]);

module.exports = {
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
          'E.g. `panels/elements/components/`.'
    },
    schema: []  // no options
  },
  create: function(context) {
    const classDefiningFileName = path.resolve(context.getFilename());

    return {
      ['ClassDeclaration[superClass.name=\'HTMLElement\']'](node) {
        for (const allowedLocation of ALLOWED_CUSTOM_ELEMENT_LOCATIONS) {
          if (classDefiningFileName.startsWith(allowedLocation)) {
            return;
          }
        }

        if (classDefiningFileName.startsWith(PANELS_DIRECTORY)) {
          const filePathWithPanelName = classDefiningFileName.substring(PANELS_DIRECTORY.length + 1);
          const filePathWithoutPanelName = filePathWithPanelName.substring(filePathWithPanelName.indexOf(path.sep) + 1);

          if (filePathWithoutPanelName.startsWith('components' + path.sep)) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'definitionInWrongFolder',
        });
      }
    };
  }
};
