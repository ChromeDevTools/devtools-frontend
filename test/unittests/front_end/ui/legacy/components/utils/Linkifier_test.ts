// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ComponentsModule from '../../../../../../../front_end/ui/legacy/components/utils/utils.js';
import type * as BindingsModule from '../../../../../../../front_end/models/bindings/bindings.js';
import type * as BreakpointsModule from '../../../../../../../front_end/models/breakpoints/breakpoints.js';
import * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import type * as SDKModule from '../../../../../../../front_end/core/sdk/sdk.js';
import type * as WorkspaceModule from '../../../../../../../front_end/models/workspace/workspace.js';
import type * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';

import {createTarget, describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import {MockProtocolBackend} from '../../../../helpers/MockScopeChain.js';

const {assert} = chai;

const scriptId1 = '1' as Protocol.Runtime.ScriptId;
const scriptId2 = '2' as Protocol.Runtime.ScriptId;
const executionContextId = 1234 as Protocol.Runtime.ExecutionContextId;

const simpleScriptContent = `
function foo(x) {
  const y = x + 3;
  return y;
}
`;

describeWithMockConnection('Linkifier', async () => {
  let SDK: typeof SDKModule;
  let Components: typeof ComponentsModule;
  let Bindings: typeof BindingsModule;
  let Breakpoints: typeof BreakpointsModule;
  let Workspace: typeof WorkspaceModule;

  before(async () => {
    SDK = await import('../../../../../../../front_end/core/sdk/sdk.js');
    Components = await import('../../../../../../../front_end/ui/legacy/components/utils/utils.js');
    Bindings = await import('../../../../../../../front_end/models/bindings/bindings.js');
    Breakpoints = await import('../../../../../../../front_end/models/breakpoints/breakpoints.js');
    Workspace = await import('../../../../../../../front_end/models/workspace/workspace.js');
  });

  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false, () => {});
    linkifier.targetAdded(target);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const forceNew = true;
    const targetManager = target.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew, debuggerWorkspaceBinding});
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew, targetManager, workspace, debuggerWorkspaceBinding});
    const backend = new MockProtocolBackend();
    return {target, linkifier, backend};
  }

  describe('Linkifier.linkifyURL', () => {
    it('prefers text over the URL if it is present', async () => {
      const url = 'http://www.example.com' as Platform.DevToolsPath.UrlString;
      const link = Components.Linkifier.Linkifier.linkifyURL(url, {
        text: 'foo',
        showColumnNumber: false,
        inlineFrameIndex: 1,
      });
      assert.strictEqual(link.innerText, 'foo');
    });

    it('falls back to the URL if given an empty text value', async () => {
      const url = 'http://www.example.com' as Platform.DevToolsPath.UrlString;
      const link = Components.Linkifier.Linkifier.linkifyURL(url, {
        text: '',
        showColumnNumber: false,
        inlineFrameIndex: 1,
      });
      assert.strictEqual(link.innerText, 'www.example.com');
    });

    it('falls back to unknown if the URL and text are empty', async () => {
      const url = '' as Platform.DevToolsPath.UrlString;
      const link = Components.Linkifier.Linkifier.linkifyURL(url, {
        text: '',
        showColumnNumber: false,
        inlineFrameIndex: 1,
      });
      assert.strictEqual(link.innerText, '(unknown)');
    });
  });

  it('creates an empty placeholder anchor if the debugger is disabled and no url exists', () => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '');

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
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '');

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
    const anchor =
        linkifier.maybeLinkifyScriptLocation(target, scriptId2, url as Platform.DevToolsPath.UrlString, lineNumber);
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
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber, options);
    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, '');

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

  it('linkifyStackTraceTopFrame without a target returns an initiator link', () => {
    const lineNumber = 165;
    const {linkifier} = setUpEnvironment();

    const anchor = linkifier.linkifyStackTraceTopFrame(null, {
      callFrames: [{
        url: 'https://w.com/a.js',
        functionName: 'wow',
        scriptId: '1' as Protocol.Runtime.ScriptId,
        lineNumber,
        columnNumber: 15,
      }],
    });

    assertNotNullOrUndefined(anchor);
    assert.strictEqual(anchor.textContent, `w.com/a.js:${lineNumber + 1}`);
  });

  describe('maybeLinkifyScriptLocation', () => {
    it('uses the BreakLocation as a revealable if the option is provided and a breakpoint is at the given location',
       async () => {
         const {target, linkifier, backend} = setUpEnvironment();
         const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
         const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
         const lineNumber = 1;
         const columnNumber = 0;
         const url = 'https://www.google.com/script.js' as Platform.DevToolsPath.UrlString;

         const script = await backend.addScript(target, {content: simpleScriptContent, url}, null);
         const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
         assertNotNullOrUndefined(uiSourceCode);

         const responder = backend.responderToBreakpointByUrlRequest(url, lineNumber);
         void responder({
           breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
           locations: [
             {
               scriptId: script.scriptId,
               lineNumber,
               columnNumber,
             },
           ],
         });
         const breakpoint = await breakpointManager.setBreakpoint(
             uiSourceCode, lineNumber, columnNumber, 'x' as BreakpointsModule.BreakpointManager.UserCondition,
             /* enabled */ true, /* isLogpoint */ true, Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
         assertNotNullOrUndefined(breakpoint);

         // Create a link that matches exactly the breakpoint location.
         const anchor = linkifier.maybeLinkifyScriptLocation(
             target, script.scriptId, url, lineNumber, {inlineFrameIndex: 0, revealBreakpoint: true});
         assertNotNullOrUndefined(anchor);

         await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

         // Assert that the linkinfo has the `BreakLocation` as its revealable.
         // When clicking the link, `revealables` have predecence over e.g. the
         // UILocation or url.
         const linkInfo = Components.Linkifier.Linkifier.linkInfo(anchor);
         assertNotNullOrUndefined(linkInfo);
         assert.propertyVal(linkInfo.revealable, 'breakpoint', breakpoint);
       });
  });
});

describeWithEnvironment('ContentProviderContextMenuProvider', async () => {
  let Components: typeof ComponentsModule;

  before(async () => {
    Components = await import('../../../../../../../front_end/ui/legacy/components/utils/utils.js');
  });

  it('does not add \'Open in new tab\'-entry for file URLs', async () => {
    const provider = Components.Linkifier.ContentProviderContextMenuProvider.instance();

    let contextMenu = new UI.ContextMenu.ContextMenu({} as Event);
    let uiSourceCode = {
      contentURL: () => 'https://www.example.com/index.html',
    } as WorkspaceModule.UISourceCode.UISourceCode;
    provider.appendApplicableItems({} as Event, contextMenu, uiSourceCode);
    let openInNewTabItem = contextMenu.revealSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Open in new tab');
    assertNotNullOrUndefined(openInNewTabItem);

    contextMenu = new UI.ContextMenu.ContextMenu({} as Event);
    uiSourceCode = {
      contentURL: () => 'file://usr/local/example/index.html',
    } as WorkspaceModule.UISourceCode.UISourceCode;
    provider.appendApplicableItems({} as Event, contextMenu, uiSourceCode);
    openInNewTabItem = contextMenu.revealSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Open in new tab');
    assert.isUndefined(openInNewTabItem);
  });
});
