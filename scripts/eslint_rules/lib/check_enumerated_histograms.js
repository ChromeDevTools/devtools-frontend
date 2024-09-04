// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'check arguments when recording enumerated histograms',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      CallExpression(node) {
        if (node?.callee?.object?.name === 'InspectorFrontendHostInstance' &&
            node.callee.property.name === 'recordEnumeratedHistogram') {
          if (node?.arguments[2]?.property?.name !== 'MAX_VALUE') {
            context.report({
              node,
              message:
                  'When calling \'recordEnumeratedHistogram\' the third argument should be of the form \'SomeEnum.MAX_VALUE\'.'
            });
          }
        }
      }
    };
  }
};
