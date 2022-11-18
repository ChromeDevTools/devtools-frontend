// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('Inline variable view scope helpers', () => {
  const url = 'file:///tmp/example.js' as Platform.DevToolsPath.UrlString;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let defaultScriptMapping: Bindings.DefaultScriptMapping.DefaultScriptMapping;
  const contentWithSourceUrl = `<p>
  Hello!
</p>
<script>console.log("Hi!");
  debugger;
  console.log("There!");
//# sourceURL=test.js
</script>`;
  const contentWithoutSourceUrl = `<p>
  Hello!
</p>
<script>console.log("Hi!");
  debugger;
  console.log("There!");
</script>`;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    target = createTarget();
    backend = new MockProtocolBackend();
    defaultScriptMapping = new Bindings.DefaultScriptMapping.DefaultScriptMapping(
        target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel,
        Workspace.Workspace.WorkspaceImpl.instance(),
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance());
  });

  it('maps raw locations on first line in inline scripts without sourceURL', async () => {
    const {scriptId, debuggerModel} = await backend.addScript(
        target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
    const uiLocation =
        defaultScriptMapping.rawLocationToUILocation(new SDK.DebuggerModel.Location(debuggerModel, scriptId, 3, 9, 0));
    assert.strictEqual(uiLocation?.lineNumber, 0);
    assert.strictEqual(uiLocation?.columnNumber, 1);
  });

  it('maps raw locations in inline scripts without sourceURL', async () => {
    const {scriptId, debuggerModel} = await backend.addScript(
        target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
    const uiLocation =
        defaultScriptMapping.rawLocationToUILocation(new SDK.DebuggerModel.Location(debuggerModel, scriptId, 4, 2, 0));
    assert.strictEqual(uiLocation?.lineNumber, 1);
    assert.strictEqual(uiLocation?.columnNumber, 2);
  });

  it('maps raw locations in inline scripts with sourceURL', async () => {
    const {scriptId, debuggerModel} = await backend.addScript(
        target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
    const uiLocation =
        defaultScriptMapping.rawLocationToUILocation(new SDK.DebuggerModel.Location(debuggerModel, scriptId, 4, 2, 0));
    assert.strictEqual(uiLocation?.lineNumber, 4);
    assert.strictEqual(uiLocation?.columnNumber, 2);
  });

  it('maps UI locations on first line in inline scripts without sourceURL', async () => {
    const script = await backend.addScript(
        target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
    const uiSourceCode = uiSourceCodeFromScript(script);
    assertNotNullOrUndefined(uiSourceCode);

    const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 0, 1);
    assert.strictEqual(rawLocations.length, 1);
    assert.strictEqual(rawLocations[0].lineNumber, 3);
    assert.strictEqual(rawLocations[0].columnNumber, 9);
  });

  it('maps UI locations in inline scripts without sourceURL', async () => {
    const script = await backend.addScript(
        target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
    const uiSourceCode = uiSourceCodeFromScript(script);
    assertNotNullOrUndefined(uiSourceCode);

    const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 1, 2);
    assert.strictEqual(rawLocations.length, 1);
    assert.strictEqual(rawLocations[0].lineNumber, 4);
    assert.strictEqual(rawLocations[0].columnNumber, 2);
  });

  it('maps UI locations in inline scripts with sourceURL', async () => {
    const script = await backend.addScript(
        target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
    const uiSourceCode = uiSourceCodeFromScript(script);
    assertNotNullOrUndefined(uiSourceCode);

    const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 4, 2);
    assert.strictEqual(rawLocations.length, 1);
    assert.strictEqual(rawLocations[0].lineNumber, 4);
    assert.strictEqual(rawLocations[0].columnNumber, 2);
  });

  function uiSourceCodeFromScript(script: SDK.Script.Script): Workspace.UISourceCode.UISourceCode|undefined {
    return defaultScriptMapping
        .rawLocationToUILocation(new SDK.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, 0, 0))
        ?.uiSourceCode;
  }
});
