// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Prefer private properties over regular class properties with
 * `private` modifier.
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Prefer private properties over regular properties with `private` modifier',
      category: 'Possible Errors',
    },

    schema: [],  // no options
    messages: {do_not_use_private: 'Use private properties (starting with `#`) rather than the `private` modifier.'},
  },
  create: function(context) {
    function isTypeScriptPrivate(node){
        if (node.accessibility === 'private' && node.kind !== 'constructor') {
          context.report({
            node: node.key,
            messageId: 'do_not_use_private',
          });
        }
    }

    return {
      MethodDefinition(node){
        isTypeScriptPrivate(node);
      },
      PropertyDefinition(node){
        isTypeScriptPrivate(node);
      }
    };
  }
};
