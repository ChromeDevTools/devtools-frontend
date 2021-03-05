// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const l10nHelper = require('./l10n_helper.js');

const FULLY_LOCKED_PHRASE_REGEX = /^`[^`]*`$/;
const SINGLE_PLACEHOLDER_REGEX = /^\{\w+\}$/;  // Matches the PH regex in `collect-strings.js`.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
          'UIStrings object literals are not allowed to have phrases that are fully locked, or consist only of a single placeholder.',
      category: 'Possible Errors',
    },
    schema: []  // no options
  },
  create: function(context) {
    return {
      VariableDeclarator(variableDeclarator) {
        if (!l10nHelper.isUIStringsVariableDeclarator(context, variableDeclarator)) {
          return;
        }

        for (const property of variableDeclarator.init.properties) {
          if (property.type !== 'Property' || property.value.type !== 'Literal') {
            continue;
          }

          if (FULLY_LOCKED_PHRASE_REGEX.test(property.value.value)) {
            context.report({
              node: property.value,
              message: 'Locking whole phrases is not allowed. Use i18n.i18n.lockedString instead.',
            });
          } else if (SINGLE_PLACEHOLDER_REGEX.test(property.value.value)) {
            context.report({
              node: property.value,
              message: 'Single placeholder-only phrases are not allowed. Use i18n.i18n.lockedString instead.',
            });
          }
        }
      },
    };
  }
};
