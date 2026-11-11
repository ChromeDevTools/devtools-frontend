// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('DebuggerPausedMessage', () => {
  let universe: TestUniverse;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  let breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;
  let pausedMessage: Sources.DebuggerPausedMessage.DebuggerPausedMessage;

  beforeEach(() => {
    universe = new TestUniverse();
    debuggerWorkspaceBinding = universe.debuggerWorkspaceBinding;
    breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager: universe.targetManager,
      workspace: universe.workspace,
      debuggerWorkspaceBinding,
      settings: universe.settings,
    });
    pausedMessage = new Sources.DebuggerPausedMessage.DebuggerPausedMessage(
        undefined, [universe.eventBreakpointsManager, debuggerWorkspaceBinding, breakpointManager, universe.settings]);
  });

  function getPausedMessageFromDOM(): {main: string, sub?: string} {
    const mainElement = pausedMessage.element.shadowRoot?.querySelector('.status-main') ?? null;
    assert.instanceOf(mainElement, HTMLDivElement);
    const main = mainElement.textContent;
    assert.exists(main);
    const sub = pausedMessage.element.shadowRoot?.querySelector('.status-sub')?.textContent;
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
        await pausedMessage.updateComplete;
        const {main, sub} = getPausedMessageFromDOM();
        assert.strictEqual(main, 'Paused on event listener');
        assert.strictEqual(sub, expectedSub);
      });
    }
  });
});

describe('DebuggerPausedMessage recurring pause actions', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  afterEach(() => {
    universe.dispose();
  });

  function createPausedDetails(debuggerModel: SDK.DebuggerModel.DebuggerModel):
      SDK.DebuggerModel.DebuggerPausedDetails {
    return new SDK.DebuggerModel.DebuggerPausedDetails(
        debuggerModel, [{
          callFrameId: 'frame-1' as Protocol.Debugger.CallFrameId,
          functionName: 'tick',
          location: {scriptId: '1' as Protocol.Runtime.ScriptId, lineNumber: 4, columnNumber: 2},
          url: 'https://example.com/app.js',
          scopeChain: [],
          this: {type: Protocol.Runtime.RemoteObjectType.Object},
        }],
        Protocol.Debugger.PausedEventReason.Other, undefined, []);
  }

  it('forwards recurring pause actions from RecurringPauseDetector to ViewInput', async () => {
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.id.returns('main' as Protocol.Target.TargetID);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.target.returns(target);
    debuggerModel.runtimeModel.returns(sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel));
    debuggerModel.scriptForId.returns(sinon.createStubInstance(SDK.Script.Script));

    const {uiSourceCode} = createContentProviderUISourceCode({
      url: urlString`https://example.com/app.js`,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });
    sinon.stub(universe.debuggerWorkspaceBinding, 'rawLocationToUILocation')
        .callsFake(async loc => uiSourceCode.uiLocation(loc.lineNumber, loc.columnNumber));

    const view = createViewFunctionStub(Sources.DebuggerPausedMessage.DebuggerPausedMessage);
    const pausedMessage = new Sources.DebuggerPausedMessage.DebuggerPausedMessage(undefined,
                                                                                  [
                                                                                    universe.eventBreakpointsManager,
                                                                                    universe.debuggerWorkspaceBinding,
                                                                                    universe.breakpointManager,
                                                                                    universe.settings,
                                                                                  ],
                                                                                  view);

    await pausedMessage.render(createPausedDetails(debuggerModel), universe.debuggerWorkspaceBinding,
                               universe.breakpointManager);
    await pausedMessage.updateComplete;
    assert.isUndefined(view.input?.onNeverPauseHere);
    assert.isUndefined(view.input?.onDeactivateBreakpointsAndResume);

    await pausedMessage.render(null, universe.debuggerWorkspaceBinding, universe.breakpointManager);
    await pausedMessage.render(createPausedDetails(debuggerModel), universe.debuggerWorkspaceBinding,
                               universe.breakpointManager);
    await pausedMessage.updateComplete;
    assert.isFunction(view.input?.onNeverPauseHere);
    assert.isFunction(view.input?.onDeactivateBreakpointsAndResume);
  });

  it('ignores stale async renders superseded by a newer render call', async () => {
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.runtimeModel.returns(sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel));
    debuggerModel.scriptForId.returns(sinon.createStubInstance(SDK.Script.Script));
    const {promise, resolve} = Promise.withResolvers<Workspace.UISourceCode.UILocation|null>();
    sinon.stub(universe.debuggerWorkspaceBinding, 'rawLocationToUILocation').returns(promise);

    const view = createViewFunctionStub(Sources.DebuggerPausedMessage.DebuggerPausedMessage);
    const pausedMessage = new Sources.DebuggerPausedMessage.DebuggerPausedMessage(undefined,
                                                                                  [
                                                                                    universe.eventBreakpointsManager,
                                                                                    universe.debuggerWorkspaceBinding,
                                                                                    universe.breakpointManager,
                                                                                    universe.settings,
                                                                                  ],
                                                                                  view);

    const pendingRender = pausedMessage.render(createPausedDetails(debuggerModel), universe.debuggerWorkspaceBinding,
                                               universe.breakpointManager);
    await pausedMessage.render(null, universe.debuggerWorkspaceBinding, universe.breakpointManager);
    resolve(null);
    await pendingRender;
    await pausedMessage.updateComplete;

    assert.isNull(view.input);
  });
});

describe('DebuggerPausedMessage.DEFAULT_VIEW', () => {
  setupLocaleHooks();

  function renderPausedMessageView(input: Sources.DebuggerPausedMessage.ViewInput): ShadowRoot {
    const host = document.createElement('div');
    renderElementIntoDOM(host, {includeCommonStyles: true});
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(host);
    Sources.DebuggerPausedMessage.DEFAULT_VIEW(input, undefined, shadowRoot);
    return shadowRoot;
  }

  it('renders no status-actions container when escape callbacks are absent', () => {
    const shadowRoot = renderPausedMessageView({mainText: 'Debugger paused', errorLike: false});

    assert.strictEqual(shadowRoot.querySelector('.status-main')?.textContent?.trim(), 'Debugger paused');
    assert.isNull(shadowRoot.querySelector('.status-actions'));
  });

  it('renders disable-breakpoint and deactivate-all buttons with visual logging contexts', () => {
    const shadowRoot = renderPausedMessageView({
      mainText: 'Paused on breakpoint',
      errorLike: false,
      onDisableBreakpoint: () => {},
      onDeactivateBreakpointsAndResume: () => {},
    });

    assert.strictEqual(shadowRoot.querySelector('.status-main')?.textContent?.trim(), 'Paused on breakpoint');
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 2);
    assert.strictEqual(buttons[0].textContent?.trim(), 'Disable breakpoint');
    assert.strictEqual(buttons[0].jslogContext, 'disable-breakpoint');
    assert.strictEqual(buttons[1].textContent?.trim(), 'Deactivate all');
    assert.strictEqual(buttons[1].jslogContext, 'debugger.toggle-breakpoints-active');
  });

  it('renders never-pause-here as the primary button when onNeverPauseHere is provided', () => {
    const shadowRoot = renderPausedMessageView({
      mainText: 'Paused on exception',
      subText: 'Error: loop failure',
      errorLike: true,
      onNeverPauseHere: () => {},
      onDeactivateBreakpointsAndResume: () => {},
    });

    assert.strictEqual(shadowRoot.querySelector('.status-main')?.textContent?.trim(), 'Paused on exception');
    assert.strictEqual(shadowRoot.querySelector('.status-sub')?.textContent?.trim(), 'Error: loop failure');
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 2);
    assert.strictEqual(buttons[0].textContent?.trim(), 'Never pause here');
    assert.strictEqual(buttons[0].jslogContext, 'never-pause-here');
    assert.strictEqual(buttons[1].textContent?.trim(), 'Deactivate all');
  });

  it('invokes onDisableBreakpoint when clicking "Disable breakpoint"', () => {
    const onDisableBreakpoint = sinon.spy();
    const shadowRoot = renderPausedMessageView({
      mainText: 'Paused on breakpoint',
      errorLike: false,
      onDisableBreakpoint,
    });

    shadowRoot.querySelector('devtools-button')?.click();

    sinon.assert.calledOnce(onDisableBreakpoint);
  });

  it('invokes onNeverPauseHere when clicking "Never pause here"', () => {
    const onNeverPauseHere = sinon.spy();
    const shadowRoot = renderPausedMessageView({
      mainText: 'Debugger paused',
      errorLike: false,
      onNeverPauseHere,
    });

    shadowRoot.querySelector('devtools-button')?.click();

    sinon.assert.calledOnce(onNeverPauseHere);
  });

  it('invokes onDeactivateBreakpointsAndResume when clicking "Deactivate all"', () => {
    const onDeactivateBreakpointsAndResume = sinon.spy();
    const shadowRoot = renderPausedMessageView({
      mainText: 'Paused on breakpoint',
      errorLike: false,
      onDeactivateBreakpointsAndResume,
    });

    shadowRoot.querySelector('devtools-button')?.click();

    sinon.assert.calledOnce(onDeactivateBreakpointsAndResume);
  });

  it('renders single pause banner screenshot', async () => {
    renderPausedMessageView({
      mainText: 'Paused on breakpoint',
      errorLike: false,
    });

    await assertScreenshot('sources/debugger-paused-message.png');
  });

  it('renders recurring pause banner with escape actions screenshot', async () => {
    renderPausedMessageView({
      mainText: 'Paused on breakpoint',
      errorLike: false,
      onDisableBreakpoint: () => {},
      onDeactivateBreakpointsAndResume: () => {},
    });

    await assertScreenshot('sources/debugger-paused-message-recurring.png');
  });

  it('renders recurring error pause banner with escape actions screenshot', async () => {
    renderPausedMessageView({
      mainText: 'Paused on exception',
      subText: 'Error: loop failure',
      errorLike: true,
      onNeverPauseHere: () => {},
      onDeactivateBreakpointsAndResume: () => {},
    });

    await assertScreenshot('sources/debugger-paused-message-recurring-error.png');
  });
});
