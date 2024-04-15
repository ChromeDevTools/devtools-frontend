// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Sources from './sources.js';

describeWithEnvironment('DebuggerPausedMessage', () => {
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  let breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;
  let pausedMessage: Sources.DebuggerPausedMessage.DebuggerPausedMessage;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager,
      workspace,
      debuggerWorkspaceBinding,
    });
    pausedMessage = new Sources.DebuggerPausedMessage.DebuggerPausedMessage();
  });

  function getPausedMessageFromDOM(): {main: string, sub?: string} {
    const mainElement = pausedMessage.element().shadowRoot?.querySelector('.status-main') ?? null;
    assert.instanceOf(mainElement, HTMLDivElement);
    const main = mainElement.textContent;
    assert.exists(main);
    const sub = pausedMessage.element().shadowRoot?.querySelector('.status-sub')?.textContent ?? undefined;
    return {main, sub};
  }

  describe('EventDetails pause', () => {
    const testCases = [
      {
        title: 'shows no sub message if aux data is missing',
        auxData: undefined,
        expectedSub: undefined,
      },
      {
        title: 'shows no sub message for unknown instrumentation breakpoints',
        auxData: {
          eventName: 'instrumentation:somethingrandom123',
        },
        expectedSub: undefined,
      },
      {
        title: 'shows the fixed string for untranslated instrumentation breakpoints',
        auxData: {
          eventName: 'instrumentation:setTimeout',
        },
        expectedSub: 'setTimeout',
      },
      {
        title: 'shows the translated string for translated instrumentation breakpoints',
        auxData: {
          eventName: 'instrumentation:requestAnimationFrame',
        },
        expectedSub: 'Request Animation Frame',
      },
      {
        title: 'shows no sub message for unknown listener breakpoints',
        auxData: {
          eventName: 'listener:somethingrandom123',
        },
        expectedSub: undefined,
      },
      {
        title: 'shows the "targetName" as a prefix for listener breakpoints',
        auxData: {
          eventName: 'listener:loadstart',
          targetName: 'xmlhttprequest',
        },
        expectedSub: 'xmlhttprequest.loadstart',
      },
      {
        title: 'shows the "targetName" as a prefix for "*" listener breakpoints',
        auxData: {
          eventName: 'listener:pointerover',
          targetName: 'something-random-123',
        },
        expectedSub: 'something-random-123.pointerover',
      },
      {
        title: 'extracts the hex code for WebGL errors',
        auxData: {
          eventName: 'instrumentation:webglErrorFired',
          webglErrorName: 'something 0x42 something',
        },
        expectedSub: 'WebGL Error Fired (0x42)',
      },
      {
        title: 'shows the WebGL error name',
        auxData: {
          eventName: 'instrumentation:webglErrorFired',
          webglErrorName: 'something went wrong',
        },
        expectedSub: 'WebGL Error Fired (something went wrong)',
      },
      {
        title: 'shows the CSP directive text for script blocked errors',
        auxData: {
          eventName: 'instrumentation:scriptBlockedByCSP',
          directiveText: 'script-src "self"',
        },
        expectedSub: 'Script blocked due to Content Security Policy directive: script-src "self"',
      },
    ];

    for (const {title, auxData, expectedSub} of testCases) {
      it(title, async () => {
        const details = new SDK.DebuggerModel.DebuggerPausedDetails(
            sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel),
            /* callFrames */[], Protocol.Debugger.PausedEventReason.EventListener, auxData, /* breakpointIds */[]);
        await pausedMessage.render(details, debuggerWorkspaceBinding, breakpointManager);

        const {main, sub} = getPausedMessageFromDOM();
        assert.strictEqual(main, 'Paused on event listener');
        assert.strictEqual(sub, expectedSub);
      });
    }
  });
});
