// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Track context.save() and context.restores() across scopes',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      saveNotRestored:
        'Found a block that has more context.save() calls than context.restore() calls',
      uselessRestore: 'Found a context.restore() call with no context.save() prior to it',
    },
    schema: [], // no options
  },
  create: function (context) {
    // To track canvas calls across scopes we keep a stack which we push nodes on with every new scope that we find.
    // When we then leave a scope, we can check all the calls in that scope and see if they align or not.
    /** @type {Array<ASTNode>} */
    let stack = [];

    // The key is a node's range as a string. The value is a stack of
    // context.save calls. When we see a restore, we pop the stack. Therefore,
    // if we get to the end of a scope and the stack is not empty, it means the
    // user has not balanced their calls correctly.
    /** @type {Map<string, Array<'save'|'restore'>>} */
    const scopeToCanvasCalls = new Map();

    function nodeToKeyForMap(node) {
      return JSON.stringify(node.range);
    }

    function enterScope(node) {
      stack.push(node);
    }

    /**
     * Pops the last block scope and checks it for a mismatch of save and restore calls.
     */
    function exitScope() {
      const lastScope = stack.pop();
      const stackForCurrentScope = scopeToCanvasCalls.get(
        nodeToKeyForMap(lastScope)
      );

      // We have no issues to report if:
      // 1. No calls to save() or restore().
      // 2. The amount of save() and restore() calls balanced perfectly, leaving the stack empty.
      if (!stackForCurrentScope || stackForCurrentScope.length === 0) {
        return;
      }

      // If we got here it means the stack for the scope has items in, which means that it is unbalanced.
        context.report({
          node: lastScope,
          messageId: 'saveNotRestored',
        });
    }

    /**
     * Updates the counter for the current scope.
     * @param {'save'|'restore'} methodName
     **/
    function trackContextCall(methodName) {
      const currentScopeNode = stack.at(-1);
      const stackForCurrentScope = scopeToCanvasCalls.get(
        nodeToKeyForMap(currentScopeNode)
      ) || [];

      if(methodName === 'save') {
        stackForCurrentScope.push('save');
      } else if(methodName === 'restore') {
        // If we get a restore() call but the stack is empty, this means that
        // we have nothing to restore as we did not save anything in this
        // scope. Either the user has forgotten a save() call, or this
        // restore() has been accidentally left behind after a refactor and
        // shold be removed.
        if(stackForCurrentScope.length === 0) {
          context.report({
            messageId: 'uselessRestore',
            node: currentScopeNode,
          });
        } else {
          // Pop the stack, so that the last save() is accounted for.
        stackForCurrentScope.pop();
        }
      }

      scopeToCanvasCalls.set(
        nodeToKeyForMap(currentScopeNode),
        stackForCurrentScope
      );
    }

    return {
      Program(node) {
        stack = [node];
      },
      MemberExpression(node) {
        const methodCallsToTrack = ['save', 'restore'];
        if (
          node.object?.name === 'context' &&
          methodCallsToTrack.includes(node.property?.name)
        ) {
          trackContextCall(node.property.name);
        }
      },
      // All the different types of scope we have to deal with.
      BlockStatement: enterScope,
      'BlockStatement:exit': exitScope,
      ForStatement: enterScope,
      'ForStatement:exit': exitScope,
      ForInStatement: enterScope,
      'ForInStatement:exit': exitScope,
      ForOfStatement: enterScope,
      'ForOfStatement:exit': exitScope,
      SwitchStatement: enterScope,
      'SwitchStatement:exit': exitScope,
      CatchClause: enterScope,
      'CatchClause:exit': exitScope,
      StaticBlock: enterScope,
      'StaticBlock:exit': exitScope,
    };
  },
};
