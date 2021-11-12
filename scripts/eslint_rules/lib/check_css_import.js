// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prevent usage of customElements.define() and use the helper
 * function instead
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check CSS file imports',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ImportDeclaration(node) {
        const importPath = path.normalize(node.source.value);

        if (importPath.endsWith('.css.js') || importPath.endsWith('.css.legacy.js')) {
          const importingFileName = path.resolve(context.getFilename());
          const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);
          const importedCSS = exportingFileName.replace(/(\.legacy)?\.js$/, '');

          if (!fs.existsSync(importedCSS)) {
            context.report({
              node,
              message: `File ${path.basename(importedCSS)} does not exist. Check you are importing the correct file.`
            });
          }
        }
      }
    };
  }
};
