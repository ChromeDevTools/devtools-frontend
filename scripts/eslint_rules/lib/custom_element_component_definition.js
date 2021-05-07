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

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of customElements.define',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.object.name === 'customElements' && node.property.name === 'define') {
          context.report({
            node,
            message:
                'do not use customElements.define() to define a component. Use the CustomElements.defineComponent() function in front_end/ui/components/helper instead.'
          });
        }
      }
    };
  }
};
