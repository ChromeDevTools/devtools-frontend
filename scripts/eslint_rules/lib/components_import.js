// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');

const COMPONENTS_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'components');
// These components do not define custom elements and are
// therefore excluded from this rule.
const EXEMPTED_COMPONENTS = new Set([
  path.join(COMPONENTS_DIRECTORY, 'render_coordinator'),
  path.join(COMPONENTS_DIRECTORY, 'docs'),
  path.join(COMPONENTS_DIRECTORY, 'helpers'),
]);

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description:
          'for any import of ui/components/ checks that there is a corresponding side-effect import in the same file',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const importingFileName = path.resolve(context.getFilename());
    const seenImportDeclarations = new Set();

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // When importing something from within the module,
        // this rule does not apply.
        if (importPath.startsWith('./')) {
          return;
        }

        // This is a side-effect import
        if (node.specifiers.length === 0) {
          // Add it to the list of already seen side effect imports
          seenImportDeclarations.add(importPath);
          return;
        }

        // At this point, the include is side-effect free
        // if we've seen it before with side-effects then
        // we don't have to do anything here.
        if (seenImportDeclarations.has(importPath)) {
          return;
        }

        const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);
        const isUIComponent = exportingFileName.startsWith(COMPONENTS_DIRECTORY);

        if (!isUIComponent) {
          return;
        }

        const importMatchesExemptComponent =
            Array.from(EXEMPTED_COMPONENTS).some(exemptModulePath => exportingFileName.startsWith(exemptModulePath));

        if (importMatchesExemptComponent) {
          return;
        }

        context.report({
          node: node,
          message:
              'Every component should have a corresponding side-effect import in the same file (i.e. import \'../../ui/components/...\')',
          fix(fixer) {
            return fixer.insertTextBefore(node, `import '${importPath}';\n`);
          }
        });
      }
    };
  }
};
