// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'enforce usage of readonly rather than the ReadonlyArray helper',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      TSTypeReference(node) {
        if (node.typeName.type === 'Identifier' && node.typeName.name === 'ReadonlyArray') {
          context.report({node, message: 'Prefer the readonly keyword over the ReadonlyArray type.'});
        }
      },
    };
  }
};
