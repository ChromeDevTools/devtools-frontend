// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ComponentsModule from '../../../../../../../front_end/ui/legacy/components/utils/utils.js';
import type * as BindingsModule from '../../../../../../../front_end/models/bindings/bindings.js';
import type * as SDKModule from '../../../../../../../front_end/core/sdk/sdk.js';
import type * as WorkspaceModule from '../../../../../../../front_end/models/workspace/workspace.js';
import type * as Protocol from '../../../../../../../front_end/generated/protocol.js';

import {createTarget} from '../../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

const scriptId1 = '1' as Protocol.Runtime.ScriptId;
const scriptId2 = '2' as Protocol.Runtime.ScriptId;
const executionContextId = 1234 as Protocol.Runtime.ExecutionContextId;

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
    assertNotNullOrUndefined(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    const url = '';
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '\u200b');

    const info = Components.Linkifier.Linkifier.linkInfo(anchor);
    assertNotNullOrUndefined(info);
    assert.isNull(info.uiLocation);
  });

  it('resolves url and updates link as soon as debugger is enabled', done => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    // Explicitly set url to empty string and let it resolve through the live location.
    const url = '';
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '\u200b');

    void debuggerModel.resumeModel();
    const scriptParsedEvent: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: scriptId1,
      url: 'https://www.google.com/script.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

    const callback: MutationCallback = function(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const info = Components.Linkifier.Linkifier.linkInfo(anchor);
          assertNotNullOrUndefined(info);
          assertNotNullOrUndefined(info.uiLocation);
          assert.strictEqual(anchor.textContent, `script.js:${lineNumber + 1}`);
          observer.disconnect();
          done();
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(anchor, {childList: true});
  });

  it('always favors script ID over url', done => {
    const {target, linkifier} = setUpEnvironment();
    const lineNumber = 4;
    const url = 'https://www.google.com/script.js';

    const scriptParsedEvent1: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: scriptId1,
      url,
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent1);

    // Ask for a link to a script that has not been registered yet, but has the same url.
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId2, url, lineNumber);
    assertNotNullOrUndefined(anchor);

    // This link should not pick up the first script with the same url, since there's no
    // warranty that the first script has anything to do with this one (other than having
    // the same url).
    const info = Components.Linkifier.Linkifier.linkInfo(anchor);
    assertNotNullOrUndefined(info);
    assert.isNull(info.uiLocation);

    const scriptParsedEvent2: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: scriptId2,
      url,
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent2);

    const callback: MutationCallback = function(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const info = Components.Linkifier.Linkifier.linkInfo(anchor);
          assertNotNullOrUndefined(info);
          assertNotNullOrUndefined(info.uiLocation);

          // Make sure that a uiSourceCode is linked to that anchor.
          assertNotNullOrUndefined(info.uiLocation.uiSourceCode);
          observer.disconnect();
          done();
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(anchor, {childList: true});
  });

  it('optionally shows column numbers in the link text', done => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    const options = {columnNumber: 8, showColumnNumber: true, inlineFrameIndex: 0};
    // Explicitly set url to empty string and let it resolve through the live location.
    const url = '';
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber, options);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '\u200b');

    void debuggerModel.resumeModel();
    const scriptParsedEvent: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: scriptId1,
      url: 'https://www.google.com/script.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId,
      hash: '',
      isLiveEdit: false,
      sourceMapURL: undefined,
      hasSourceURL: false,
      length: 10,
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

    const callback: MutationCallback = function(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const info = Components.Linkifier.Linkifier.linkInfo(anchor);
          assertNotNullOrUndefined(info);
          assertNotNullOrUndefined(info.uiLocation);
          assert.strictEqual(anchor.textContent, `script.js:${lineNumber + 1}:${options.columnNumber + 1}`);
          observer.disconnect();
          done();
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(anchor, {childList: true});
  });
});
