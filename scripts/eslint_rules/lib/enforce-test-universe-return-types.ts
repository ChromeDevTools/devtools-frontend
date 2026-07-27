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
  'AiAssistance.AiHistoryStorage.AiHistoryStorage',
  'AiAssistance.BuiltInAi.BuiltInAi',
  'AutofillManager.AutofillManager.AutofillManager',
  'Badges.UserBadges',
  'Common.Console.Console',
  'Common.Settings.Settings',
  'CrUXManager.CrUXManager',
  'Host.AidaClient.HostConfigTracker',
  'Host.GdpClient.GdpClient',
  'Emulation.DeviceModeModel.DeviceModeModel',
  'Emulation.EmulatedDevices.EmulatedDevicesList',
  'Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding',
  'Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding',
  'Bindings.NetworkProject.NetworkProjectManager',
  'Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager',
  'Bindings.ResourceMapping.ResourceMapping',
  'Breakpoints.BreakpointManager.BreakpointManager',
  'IssuesManager.IssuesManager.IssuesManager',
  'JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl',
  'Logs.LogManager.LogManager',
  'LiveMetrics.LiveMetrics',
  'Logs.NetworkLog.NetworkLog',
  'Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager',
  'Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding',
  'Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding',
  'Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager',
  'Persistence.NetworkPersistenceManager.NetworkPersistenceManager',
  'Persistence.Persistence.PersistenceImpl',
  'ProjectSettings.ProjectSettingsModel.ProjectSettingsModel',
  'SDK.CPUThrottlingManager.CPUThrottlingManager',
  'SDK.DOMDebuggerModel.DOMDebuggerManager',
  'SDK.DOMModel.DOMModelUndoStack',
  'SDK.EventBreakpointsModel.EventBreakpointsManager',
  'SDK.FrameManager.FrameManager',
  'SDK.IsolateManager.IsolateManager',
  'SDK.NetworkManager.MultitargetNetworkManager',
  'SDK.PageResourceLoader.PageResourceLoader',
  'SDK.Target.Target',
  'SDK.TargetManager.TargetManager',
  'Workspace.FileManager.FileManager',
  'Workspace.IgnoreListManager.IgnoreListManager',
  'Workspace.Workspace.WorkspaceImpl',
  'WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl',
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
