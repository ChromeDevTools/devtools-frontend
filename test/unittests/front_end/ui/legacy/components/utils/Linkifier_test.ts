// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ComponentsModule from '../../../../../../../front_end/ui/legacy/components/utils/utils.js';
import type * as BindingsModule from '../../../../../../../front_end/models/bindings/bindings.js';
import type * as SDKModule from '../../../../../../../front_end/core/sdk/sdk.js';
import type * as WorkspaceModule from '../../../../../../../front_end/models/workspace/workspace.js';

import {createTarget} from '../../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../../../helpers/MockConnection.js';
import {assertNotNull} from '../../../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describeWithMockConnection('Linkifier', async () => {
  let SDK: typeof SDKModule;
  let Components: typeof ComponentsModule;
  let Bindings: typeof BindingsModule;
  let Workspace: typeof WorkspaceModule;

  before(async () => {
    SDK = await import('../../../../../../../front_end/core/sdk/sdk.js');
    Components = await import('../../../../../../../front_end/ui/legacy/components/utils/utils.js');
    Bindings = await import('../../../../../../../front_end/models/bindings/bindings.js');
    Workspace = await import('../../../../../../../front_end/models/workspace/workspace.js');
  });

  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false, () => {});
    linkifier.targetAdded(target);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const forceNew = true;
    const targetManager = target.targetManager();
    const debuggerWorkspaceBinding =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({forceNew, targetManager, workspace});
    Bindings.ResourceMapping.ResourceMapping.instance({forceNew, targetManager, workspace});
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew, debuggerWorkspaceBinding});
    return {target, linkifier};
  }

  it('creates an empty placeholder anchor if the debugger is disabled and no url exists', () => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNull(debuggerModel);
    debuggerModel.suspendModel();

    const scriptId = 'script';
    const lineNumber = 4;
    const url = '';
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId, url, lineNumber);
    assertNotNull(anchor);
    assert.strictEqual(anchor.textContent, '\u200b');

    const info = Components.Linkifier.Linkifier.linkInfo(anchor);
    assertNotNull(info);
    assert.isNull(info.uiLocation);
  });

  it('resolves url and updates link as soon as debugger is enabled', done => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNull(debuggerModel);
    debuggerModel.suspendModel();

    const scriptId = 'script';
    const lineNumber = 4;
    // Explicitly set url to empty string and let it resolve through the live location.
    const url = '';
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId, url, lineNumber);
    assertNotNull(anchor);
    assert.strictEqual(anchor.textContent, '\u200b');

    debuggerModel.resumeModel();
    const scriptParsedEvent = {
      scriptId,
      url: 'https://www.google.com/script.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId: 1234,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      hasSyntaxError: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

    const callback: MutationCallback = function(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const info = Components.Linkifier.Linkifier.linkInfo(anchor);
          assertNotNull(info);
          assertNotNull(info.uiLocation);
          assert.strictEqual(anchor.textContent, `script.js:${lineNumber + 1}`);
          observer.disconnect();
          done();
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(anchor, {childList: true});
  });

  it('uses url to identify script if scriptId cannot be found', done => {
    const {target, linkifier} = setUpEnvironment();
    const scriptId = 'script';
    const lineNumber = 4;
    const url = 'https://www.google.com/script.js';

    const scriptParsedEvent = {
      scriptId,
      url,
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId: 1234,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      hasSyntaxError: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

    // Ask for a link to a script that has not been registered yet, but has the same url.
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId + '2', url, lineNumber);
    assertNotNull(anchor);

    const callback: MutationCallback = function(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const info = Components.Linkifier.Linkifier.linkInfo(anchor);
          assertNotNull(info);
          assertNotNull(info.uiLocation);

          // Make sure that a uiSourceCode is linked to that anchor.
          assertNotNull(info.uiLocation.uiSourceCode);
          observer.disconnect();
          done();
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(anchor, {childList: true});
  });
});
