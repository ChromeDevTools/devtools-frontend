// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Breakpoints from '../../../../models/breakpoints/breakpoints.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import {findMenuItemWithLabel} from '../../../../testing/ContextMenuHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../../../testing/MockScopeChain.js';
import * as UI from '../../legacy.js';

import * as Components from './utils.js';

const scriptId1 = '1' as Protocol.Runtime.ScriptId;
const scriptId2 = '2' as Protocol.Runtime.ScriptId;
const executionContextId = 1234 as Protocol.Runtime.ExecutionContextId;

const simpleScriptContent = `
function foo(x) {
  const y = x + 3;
  return y;
}
`;

describeWithMockConnection('Linkifier', () => {
  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false);
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
    assert.exists(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assert.exists(anchor);
    assert.strictEqual(anchor.textContent, '');

    const info = Components.Linkifier.Linkifier.linkInfo(anchor);
    assert.exists(info);
    assert.isNull(info.uiLocation);
  });

  it('resolves url and updates link as soon as debugger is enabled', done => {
    const {target, linkifier} = setUpEnvironment();

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    // Explicitly set url to empty string and let it resolve through the live location.
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber);
    assert.exists(anchor);
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
          assert.exists(info);
          assert.exists(info.uiLocation);
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
    assert.exists(anchor);

    // This link should not pick up the first script with the same url, since there's no
    // warranty that the first script has anything to do with this one (other than having
    // the same url).
    const info = Components.Linkifier.Linkifier.linkInfo(anchor);
    assert.exists(info);
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
          assert.exists(info);
          assert.exists(info.uiLocation);

          // Make sure that a uiSourceCode is linked to that anchor.
          assert.exists(info.uiLocation.uiSourceCode);
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
    assert.exists(debuggerModel);
    void debuggerModel.suspendModel();

    const lineNumber = 4;
    const options = {columnNumber: 8, showColumnNumber: true, inlineFrameIndex: 0};
    // Explicitly set url to empty string and let it resolve through the live location.
    const url = Platform.DevToolsPath.EmptyUrlString;
    const anchor = linkifier.maybeLinkifyScriptLocation(target, scriptId1, url, lineNumber, options);
    assert.exists(anchor);
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
          assert.exists(info);
          assert.exists(info.uiLocation);
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

    assert.exists(anchor);
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
         assert.exists(uiSourceCode);

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
             uiSourceCode, lineNumber, columnNumber, 'x' as Breakpoints.BreakpointManager.UserCondition,
             /* enabled */ true, /* isLogpoint */ true, Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
         assert.exists(breakpoint);

         // Create a link that matches exactly the breakpoint location.
         const anchor = linkifier.maybeLinkifyScriptLocation(
             target, script.scriptId, url, lineNumber, {inlineFrameIndex: 0, revealBreakpoint: true});
         assert.exists(anchor);

         await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

         // Assert that the linkinfo has the `BreakLocation` as its revealable.
         // When clicking the link, `revealables` have predecence over e.g. the
         // UILocation or url.
         const linkInfo = Components.Linkifier.Linkifier.linkInfo(anchor);
         assert.exists(linkInfo);
         assert.propertyVal(linkInfo.revealable, 'breakpoint', breakpoint);
       });

    it('fires the LiveLocationUpdate event for each LiveLocation update', async () => {
      const {target, linkifier, backend} = setUpEnvironment();
      const eventCallback = sinon.stub();
      linkifier.addEventListener(Components.Linkifier.Events.LIVE_LOCATION_UPDATED, eventCallback);
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const lineNumber = 1;
      const url = 'https://www.google.com/script.js' as Platform.DevToolsPath.UrlString;
      const sourceMapContent = JSON.stringify({
        version: 3,
        names: ['adder', 'param1', 'param2', 'result'],
        sources: ['/original-script.js'],
        sourcesContent:
            ['function adder(param1, param2) {\n  const result = param1 + param2;\n  return result;\n}\n\n'],
        mappings: 'AAAA,SAASA,MAAMC,EAAQC,GACrB,MAAMC,EAASF,EAASC,EACxB,OAAOC,CACT',
      });

      const script = await backend.addScript(target, {content: 'function adder(n,r){const t=n+r;return t}', url}, {
        url: 'https://www.google.com/script.js.map',
        content: sourceMapContent,
      });

      linkifier.maybeLinkifyScriptLocation(target, script.scriptId, url, lineNumber);

      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();
      assert.isTrue(eventCallback.calledOnce);

      // Detach the source map and check we get the update event.
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);
      debuggerModel.sourceMapManager().detachSourceMap(script);

      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();
      // We currently receive more than one event after detaching the source map.
      // This is also valid but might constitute unnecessary work.
      assert.isTrue(eventCallback.callCount >= 2);
    });
  });
});

describeWithEnvironment('ContentProviderContextMenuProvider', () => {
  it('does not add \'Open in new tab\'-entry for file URLs', async () => {
    const provider = new Components.Linkifier.ContentProviderContextMenuProvider();

    let contextMenu = new UI.ContextMenu.ContextMenu({} as Event);
    let uiSourceCode = {
      contentURL: () => 'https://www.example.com/index.html',
    } as Workspace.UISourceCode.UISourceCode;
    provider.appendApplicableItems({} as Event, contextMenu, uiSourceCode);
    let openInNewTabItem = findMenuItemWithLabel(contextMenu.revealSection(), 'Open in new tab');
    assert.exists(openInNewTabItem);

    contextMenu = new UI.ContextMenu.ContextMenu({} as Event);
    uiSourceCode = {
      contentURL: () => 'file://usr/local/example/index.html',
    } as Workspace.UISourceCode.UISourceCode;
    provider.appendApplicableItems({} as Event, contextMenu, uiSourceCode);
    openInNewTabItem = findMenuItemWithLabel(contextMenu.revealSection(), 'Open in new tab');
    assert.isUndefined(openInNewTabItem);
  });
});
