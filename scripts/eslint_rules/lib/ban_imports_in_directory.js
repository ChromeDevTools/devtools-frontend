// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');

module.exports = {
  meta : {
    type : 'problem',

    docs : {
      description : 'Ban files in a directory from importing specific modules',
      category : 'Possible Errors',
    },
    fixable : 'code',
    messages : {
      invalidImport : 'It is banned to import this module from this file\'s directory',
    },
    schema : [{
      type : 'object',
      properties : {
        bannedImportPaths : {
          type : 'array',
        },
      },
      additionalProperties : false,
    }]
  },
  create : function(context) {
    const bannedPaths = context.options[0].bannedImportPaths || [];
    const fileNameOfFileBeingChecked = path.resolve(context.getFilename());

    return {
      'ImportDeclaration'(node) {
        const importPath = path.resolve(path.dirname(fileNameOfFileBeingChecked), node.source.value);
        for (const banned of bannedPaths) {
          if (importPath.includes(banned)) {
            context.report({
              node,
              messageId: 'invalidImport'
            });
            break;
          }
        }
      }
    };
  }
};
