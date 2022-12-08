// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {setupPageResourceLoaderForSourceMap} from '../../helpers/SourceMapHelpers.js';

describeWithMockConnection('CompilerScriptMapping', () => {
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

  const sourceMapContent = JSON.stringify({
    'version': 3,
    'file': '/script.js',
    'mappings': '',
    'sources': [
      '/original-script.js',
    ],
  });

  const getScript = (debuggerModel: SDK.DebuggerModel.DebuggerModel): SDK.Script.Script => {
    const scripts = debuggerModel.scripts();
    assert.lengthOf(scripts, 1);
    const script = scripts[0];
    return script;
  };

  async function waitForUiSourceCode(
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
      sourceURL: Platform.DevToolsPath.UrlString, script: SDK.Script.Script) {
    const compilerScriptMapping = debuggerWorkspaceBinding.getCompilerScriptMappingForTest(script.debuggerModel);
    assertNotNullOrUndefined(compilerScriptMapping);

    let uiSourceCode;
    while (true) {
      uiSourceCode = compilerScriptMapping.uiSourceCodeForURL(sourceURL, script.isContentScript());
      if (uiSourceCode) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    assertNotNullOrUndefined(uiSourceCode);
    assert.strictEqual(uiSourceCode.url(), sourceURL);

    // The uiSourceCode that we got should also point to the script.
    const registeredScripts = compilerScriptMapping.scriptsForUISourceCode(uiSourceCode);
    assert.lengthOf(registeredScripts, 1);
    assert.deepEqual(registeredScripts[0], script);

    return uiSourceCode;
  }

  beforeEach(() => {
    target = createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
    const targetManager = target.targetManager();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: false, resourceMapping, targetManager});
    backend = new MockProtocolBackend();
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: false, debuggerWorkspaceBinding});
  });

  it('creates and returns separate uiSourceCodes for separate targets', async () => {
    setupPageResourceLoaderForSourceMap(sourceMapContent);

    // Create a second target for the same script.
    const workerTarget = createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.ServiceWorker,
      parentTarget: target,
    });

    const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;
    const sourceURL = 'https://script-host/original-script.js' as Platform.DevToolsPath.UrlString;
    const sourceMapUrl = 'https://script-host/script.js.map' as Platform.DevToolsPath.UrlString;

    const scriptInfo = {url: scriptUrl, content: 'console.log(1);'};
    const sourceMapInfo = {url: sourceMapUrl, content: sourceMapContent};

    const mainDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(mainDebuggerModel);

    const workerDebuggerModel = workerTarget.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(workerDebuggerModel);

    // Register the script for both targets.
    await backend.addScript(target, scriptInfo, sourceMapInfo);
    await backend.addScript(workerTarget, scriptInfo, sourceMapInfo);

    const mainScript = getScript(mainDebuggerModel);
    const workerScript = getScript(workerDebuggerModel);

    // Wait until the compiler script mapping has a uiSourceCode for the sourceURL that is listed in the source map.
    const mainUiSourceCode = await waitForUiSourceCode(debuggerWorkspaceBinding, sourceURL, mainScript);
    const workerUiSourceCode = await waitForUiSourceCode(debuggerWorkspaceBinding, sourceURL, workerScript);

    assert.notDeepEqual(mainUiSourceCode, workerUiSourceCode);
  });
});
