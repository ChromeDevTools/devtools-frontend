// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to ban private keyword in components
 * @author Tim van der Lippe
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of private keyword',
      category: 'Possible Errors',
    },

    fixable: 'code',
    schema: [],  // no options
    messages:
        {do_not_use_private: 'Use private class notation (start the name with a `#`) rather than the private keyword'},
  },
  create: function(context) {
    return {
      ['MethodDefinition, PropertyDefinition'](node) {
        if (node.accessibility === 'private' && node.kind !== 'constructor') {
          context.report({
            node: node.key,
            messageId: 'do_not_use_private',
          });
        }
      }
    };
  }
};
