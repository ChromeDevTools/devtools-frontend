// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Prevent usage of customElements.define() and use the helper
 * function instead
 */

import * as fs from 'fs';
import * as path from 'path';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'check-css-import',
  meta: {
    type: 'problem',
    docs: {
      description: 'check CSS file imports',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      fileDoesNotExist: 'File {{filename}} does not exist. Check you are importing the correct file.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const filename = context.filename;
    return {
      ImportDeclaration(node) {
        const importPath = path.normalize(`${node.source.value}`);

        if (importPath.endsWith('.css.js')) {
          const importingFileName = path.resolve(filename);
          const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);
          const importedCSS = exportingFileName.replace(/\.js$/, '');

          if (!fs.existsSync(importedCSS)) {
            context.report({
              node,
              messageId: 'fileDoesNotExist',
              data: {filename: path.basename(importedCSS)},
            });
          }
        }
      },
    };
  },
});
