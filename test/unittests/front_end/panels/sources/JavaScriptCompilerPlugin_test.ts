// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {createContentProviderUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {MockExecutionContext} from '../../helpers/MockExecutionContext.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import type * as TextEditor from '../../../../../front_end/ui/components/text_editor/text_editor.js';

describeWithMockConnection('JavaScriptCompilerPlugin', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let uiSourceCode: Workspace.UISourceCode.UISourceCode;
    let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
    const URL = 'test.js' as Platform.DevToolsPath.UrlString;

    beforeEach(() => {
      target = targetFactory();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });
      ({uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'}));
      uiSourceCode.addRevision('foo');
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, new MockExecutionContext(target));
    });

    afterEach(() => {
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, null);
    });

    it('compiles using main target by default', async () => {
      const plugin = new Sources.JavaScriptCompilerPlugin.JavaScriptCompilerPlugin(uiSourceCode);
      plugin.editorInitialized({state: {doc: ''}} as unknown as TextEditor.TextEditor.TextEditor);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assertNotNullOrUndefined(runtimeModel);
      await new Promise<void>(
          resolve =>
              sinon.stub(runtimeModel, 'compileScript')
                  .callsFake(async (_1: string, _2: string, _3: boolean, _4: Protocol.Runtime.ExecutionContextId) => {
                    resolve();
                    return null;
                  }));
    });

    it('compiles using the target for the script file', async () => {
      const otherTarget = createTarget({parentTarget: target});
      const debuggerModel = otherTarget.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);
      sinon.stub(debuggerWorkspaceBinding, 'scriptFile')
          .withArgs(uiSourceCode, debuggerModel)
          .returns({} as Bindings.ResourceScriptMapping.ResourceScriptFile);
      const plugin = new Sources.JavaScriptCompilerPlugin.JavaScriptCompilerPlugin(uiSourceCode);
      plugin.editorInitialized({state: {doc: ''}} as unknown as TextEditor.TextEditor.TextEditor);
      const runtimeModel = otherTarget.model(SDK.RuntimeModel.RuntimeModel);
      assertNotNullOrUndefined(runtimeModel);
      await new Promise<void>(
          resolve =>
              sinon.stub(runtimeModel, 'compileScript')
                  .callsFake(async (_1: string, _2: string, _3: boolean, _4: Protocol.Runtime.ExecutionContextId) => {
                    resolve();
                    return null;
                  }));
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
