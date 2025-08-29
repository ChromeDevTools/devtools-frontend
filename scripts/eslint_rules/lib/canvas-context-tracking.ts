// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type Node = TSESTree.Node;
type MemberExpression = TSESTree.MemberExpression;
type BlockStatement = TSESTree.BlockStatement;
type ForStatement = TSESTree.ForStatement;
type ForInStatement = TSESTree.ForInStatement;
type ForOfStatement = TSESTree.ForOfStatement;
type SwitchStatement = TSESTree.SwitchStatement;
type CatchClause = TSESTree.CatchClause;
type StaticBlock = TSESTree.StaticBlock;

type CanvasCall = 'save'|'restore';

export default createRule({
  name: 'canvas-context-tracking',
  meta: {
    type: 'problem',
    docs: {
      description: 'Track context.save() and context.restores() across scopes',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      saveNotRestored: 'Found a block that has more context.save() calls than context.restore() calls',
      uselessRestore: 'Found a context.restore() call with no context.save() prior to it',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    // To track canvas calls across scopes we keep a stack which we push nodes on with every new scope that we find.
    // When we then leave a scope, we can check all the calls in that scope and see if they align or not.
    let stack: Node[] = [];

    // The key is a node's range as a string. The value is a stack of
    // context.save calls. When we see a restore, we pop the stack. Therefore,
    // if we get to the end of a scope and the stack is not empty, it means the
    // user has not balanced their calls correctly.
    const scopeToCanvasCalls = new Map<string, CanvasCall[]>();

    function nodeToKeyForMap(node: Node): string {
      return JSON.stringify(node.range);
    }

    function enterScope(node: Node): void {
      stack.push(node);
    }

    /**
     * Pops the last block scope and checks it for a mismatch of save and restore calls.
     */
    function exitScope(): void {
      const lastScope = stack.pop();
      if (!lastScope) {
        return;
      }

      const stackForCurrentScope = scopeToCanvasCalls.get(
          nodeToKeyForMap(lastScope),
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
     * @param methodName
     **/
    function trackContextCall(methodName: CanvasCall): void {
      const currentScopeNode = stack.at(-1);
      if (!currentScopeNode) {
        return;
      }
      const currentScopeKey = nodeToKeyForMap(currentScopeNode);
      const stackForCurrentScope = scopeToCanvasCalls.get(currentScopeKey) || [];

      if (methodName === 'save') {
        stackForCurrentScope.push('save');
      } else if (methodName === 'restore') {
        // If we get a restore() call but the stack is empty, this means that
        // we have nothing to restore as we did not save anything in this
        // scope. Either the user has forgotten a save() call, or this
        // restore() has been accidentally left behind after a refactor and
        // should be removed.
        if (stackForCurrentScope.length === 0) {
          context.report({
            messageId: 'uselessRestore',
            // Report on the specific call if possible, otherwise the scope.
            // The original code reported on currentScopeNode.
            node: currentScopeNode,
          });
        } else {
          // Pop the stack, so that the last save() is accounted for.
          stackForCurrentScope.pop();
        }
      }

      scopeToCanvasCalls.set(
          currentScopeKey,
          stackForCurrentScope,
      );
    }

    return {
      Program(node) {
        stack = [node];
        // Initialize map for the program scope
        scopeToCanvasCalls.set(nodeToKeyForMap(node), []);
      },
      MemberExpression(node: MemberExpression) {
        const methodCallsToTrack = ['save', 'restore'];
        if (node.object.type === 'Identifier' && node.object?.name === 'context' &&
            node.property.type === 'Identifier' &&
            // Use type assertion because .includes doesn't narrow the type
            methodCallsToTrack.includes(node.property?.name as CanvasCall)) {
          trackContextCall(node.property.name as CanvasCall);
        }
      },
      // All the different types of scope we have to deal with.
      BlockStatement: (node: BlockStatement) => enterScope(node),
      'BlockStatement:exit': exitScope,
      ForStatement: (node: ForStatement) => enterScope(node),
      'ForStatement:exit': exitScope,
      ForInStatement: (node: ForInStatement) => enterScope(node),
      'ForInStatement:exit': exitScope,
      ForOfStatement: (node: ForOfStatement) => enterScope(node),
      'ForOfStatement:exit': exitScope,
      SwitchStatement: (node: SwitchStatement) => enterScope(node),
      'SwitchStatement:exit': exitScope,
      CatchClause: (node: CatchClause) => enterScope(node),
      'CatchClause:exit': exitScope,
      StaticBlock: (node: StaticBlock) => enterScope(node),
      'StaticBlock:exit': exitScope,
    };
  },
});
