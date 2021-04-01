// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

function lookForParentWrite(node) {
  if (!node.parent || node.type === 'ClassBody') {
    /**
    * If there is no parent node, we didn't find the coordinator.write so return
    * false.
    *
    * As a small optimisation we also bail if we find ClassBody, which means
    * we've got to the entire class body that the LitHtml.render call is in, and
    * not found a write. We wouldn't wrap an entire class def in
    * coordinator.write, so we can safely return false at this point. */
    return false;
  }

  if (node.type === 'CallExpression') {
    if (node.callee?.object?.name === 'coordinator' && node.callee?.property?.name === 'write') {
      return true;
    }
  }

  return lookForParentWrite(node.parent);
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure that LitHtml.render calls are wrapped in the coordinator.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ['CallExpression > MemberExpression[object.name=\'LitHtml\'][property.name=\'render\']'](node) {
        /**
         * This expression matches LitHtml.render calls. We now walk up the AST, checking its parents until we either:
         * 1. Find a coordinator.write call, in which case we are happy.
         * 2. Make it to the root node, in which case we error.
        */
        const foundCoordinatorWriteCall = lookForParentWrite(node);
        if (!foundCoordinatorWriteCall) {
          context.report({
            node,
            message:
                'LitHtml.render calls must be wrapped in a coordinator.write callback, where coordinator is an instance of RenderCoordinator (front_end/render_coordinator).'
          });
        }
      }
    };
  }
};
