// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

describeWithMockConnection('DebuggerWorkspaceBinding', () => {
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

  beforeEach(() => {
    target = createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    const targetManager = target.targetManager();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: false, resourceMapping, targetManager});
    backend = new MockProtocolBackend();
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: false, debuggerWorkspaceBinding});
  });

  it('can wait for a uiSourceCode if it is not yet available', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const scriptUrl = 'http://script-host/script.js' as Platform.DevToolsPath.UrlString;
    const scriptInfo = {url: scriptUrl, content: 'console.log(1);', startLine: 0, startColumn: 0, hasSourceURL: false};

    // Create a second target.
    const workerTarget = createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.ServiceWorker,
      parentTarget: target,
    });

    // Before any script is registered, there shouldn't be any uiSourceCodes.
    assert.isNull(Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(scriptUrl));

    // Create promise to await the uiSourceCode given the url and its target.
    const uiSourceCodePromise = debuggerWorkspaceBinding.waitForUISourceCodeAdded(scriptUrl, target);

    // Register the script, which will kick off creating the uiSourceCode.
    await backend.addScript(target, scriptInfo, null);
    await backend.addScript(workerTarget, scriptInfo, null);

    // Await the promise to retrieve the uiSourceCode.
    const uiSourceCode = await uiSourceCodePromise;

    // Check if the uiSourceCode is the expected one (from the main target, and having the correct sourceURL).
    assert.strictEqual(uiSourceCode.url(), scriptUrl);
    assert.deepEqual(Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode), target);
  });
});
