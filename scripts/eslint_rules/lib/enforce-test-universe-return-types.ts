// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

/**
 * Only classes/types are allowed that don't access any global state (modulo experiments/host config :cry:).
 *
 * In particular, any listed types must take it's dependencies via constructor. No `.instance()` call must
 * happen when any of these types is used.
 */
const ALLOWED_RETURN_TYPES = new Set([
  'Common.Console.Console',
  'Common.Settings.Settings',
  'Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding',
  'Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding',
  'Bindings.ResourceMapping.ResourceMapping',
  'SDK.FrameManager.FrameManager',
  'SDK.NetworkManager.MultitargetNetworkManager',
  'SDK.PageResourceLoader.PageResourceLoader',
  'SDK.Target.Target',
  'SDK.TargetManager.TargetManager',
  'Workspace.IgnoreListManager.IgnoreListManager',
  'Workspace.Workspace.WorkspaceImpl',
]);

export default createRule({
  name: 'enforce-test-universe-return-types',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure TestUniverse methods and getters only return allow-listed types',
      category: 'Possible Errors',
    },
    messages: {
      disallowedReturnType: 'Return type {{ type }} is not allow-listed for TestUniverse.',
      noReturnType: 'Method {{ method }} requires return type in TestUniverse.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function checkReturnType(node: TSESTree.MethodDefinition) {
      if (node.kind === 'constructor') {
        return;
      }

      const returnTypeNode = node.value.returnType;
      if (!returnTypeNode) {
        context.report({
          node: node.value,
          messageId: 'noReturnType',
          data: {
            method: node.key.type === 'Identifier' || node.key.type === 'PrivateIdentifier' ? node.key.name :
                                                                                              '<unknown>',
          },
        });
        return;
      }

      const sourceCode = context.sourceCode;
      const returnTypeText = sourceCode.getText(returnTypeNode.typeAnnotation).trim();

      if (!ALLOWED_RETURN_TYPES.has(returnTypeText)) {
        context.report({
          node: returnTypeNode,
          messageId: 'disallowedReturnType',
          data: {
            type: returnTypeText,
          },
        });
      }
    }

    return {
      'ClassDeclaration[id.name="TestUniverse"] MethodDefinition'(node: TSESTree.MethodDefinition) {
        checkReturnType(node);
      },
    };
  },
});
