// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as WebAudio from './web_audio.js';

const context1: Protocol.WebAudio.BaseAudioContext = {
  contextId: '924c4ee4-4cae-4e62-b4c6-71603edc39fd' as Protocol.WebAudio.GraphObjectId,
  contextType: Protocol.WebAudio.ContextType.Realtime,
  contextState: Protocol.WebAudio.ContextState.Running,
  sampleRate: 44100,
  callbackBufferSize: 1024,
  maxOutputChannelCount: 2,
  renderQuantumSize: 128,
};

const context2: Protocol.WebAudio.BaseAudioContext = {
  contextId: '78a3e94e-4968-4bf6-8905-325109695c9e' as Protocol.WebAudio.GraphObjectId,
  contextType: Protocol.WebAudio.ContextType.Realtime,
  contextState: Protocol.WebAudio.ContextState.Running,
  sampleRate: 44100,
  callbackBufferSize: 1024,
  maxOutputChannelCount: 2,
  renderQuantumSize: 128,
};

describeWithEnvironment('WebAudioView', () => {
  beforeEach(() => {
    UI.ActionRegistration.registerActionExtension({
      actionId: 'components.collect-garbage',
      category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
  });

  afterEach(() => {
    UI.ActionRegistration.reset();
  });

  it('shows a paused status and hides the toolbar until inspection resumes', () => {
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('components.collect-garbage');
    action.setEnabled(true);
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    const input: WebAudio.WebAudioView.ViewInput = {
      suspended: true,
      contexts: [context1],
      selectedContextIndex: 0,
      onContextSelectorSelectionChanged: sinon.spy(),
      contextRealtimeData: null,
    };
    WebAudio.WebAudioView.DEFAULT_VIEW(input, undefined, container);

    const status = container.querySelector<HTMLElement>('.web-audio-paused');
    assert.exists(status);
    assert.strictEqual(status.textContent, 'Web Audio inspection paused');
    assert.strictEqual(status.getAttribute('role'), 'status');
    assert.isNull(container.querySelector('.context-detail-container'));
    const selector = container.querySelector('select');
    const button = container.querySelector('devtools-button');
    assert.exists(selector);
    assert.exists(button);
    const toolbar = container.querySelector<HTMLElement>('[role="toolbar"]');
    assert.exists(toolbar);
    assert.isFalse(toolbar.checkVisibility());
    assert.isFalse(button.checkVisibility());
    assert.isFalse(selector.checkVisibility());
    assert.isTrue(status.checkVisibility());

    WebAudio.WebAudioView.DEFAULT_VIEW(input, undefined, container);
    assert.isFalse(toolbar.checkVisibility());

    input.suspended = false;
    WebAudio.WebAudioView.DEFAULT_VIEW(input, undefined, container);
    assert.isNull(container.querySelector('.web-audio-paused'));
    assert.exists(container.querySelector('.context-detail-container'));
    assert.isFalse(selector.disabled);
    assert.isFalse(button.disabled);
    assert.isTrue(toolbar.checkVisibility());
    assert.isTrue(button.checkVisibility());
    assert.isTrue(selector.checkVisibility());

    action.setEnabled(false);
    input.suspended = true;
    WebAudio.WebAudioView.DEFAULT_VIEW(input, undefined, container);
    assert.isFalse(toolbar.checkVisibility());
    input.suspended = false;
    WebAudio.WebAudioView.DEFAULT_VIEW(input, undefined, container);
    assert.isTrue(button.disabled);
    assert.isTrue(toolbar.checkVisibility());
    container.remove();
  });

  it('reads the current suspension state when opened and reopened', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const suspended = sinon.stub(targetManager, 'allTargetsSuspended').returns(true);
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    const widget = new WebAudio.WebAudioView.WebAudioView(undefined, view);
    renderElementIntoDOM(widget);
    await view.nextInput;
    assert.isTrue(view.input.suspended);

    widget.detach();
    suspended.returns(false);
    targetManager.dispatchEventToListeners(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED);
    renderElementIntoDOM(widget);
    await view.nextInput;
    assert.isFalse(view.input.suspended);
    widget.detach();
  });

  it('stops polling during suspension and while hidden, and restarts on resume', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const suspended = sinon.stub(targetManager, 'allTargetsSuspended').returns(false);
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);
    const requestRealtimeData = sinon.stub(model, 'requestRealtimeData').resolves(null);
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    const widget = new WebAudio.WebAudioView.WebAudioView(undefined, view);
    renderElementIntoDOM(widget);
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await clock.tickAsync(1000);
    sinon.assert.calledOnce(requestRealtimeData);

    suspended.returns(true);
    targetManager.dispatchEventToListeners(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED);
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;
    await clock.tickAsync(3000);
    assert.deepEqual(view.input.contexts, [context1]);
    assert.strictEqual(view.input.selectedContextIndex, 0);
    sinon.assert.calledOnce(requestRealtimeData);

    suspended.returns(false);
    targetManager.dispatchEventToListeners(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED);
    await clock.tickAsync(1);
    sinon.assert.calledTwice(requestRealtimeData);
    widget.detach();
    await clock.tickAsync(3000);
    sinon.assert.calledTwice(requestRealtimeData);

    renderElementIntoDOM(widget);
    await clock.tickAsync(1);
    sinon.assert.calledThrice(requestRealtimeData);
    widget.detach();
  });

  it('does not display or keep polling data from a request that finishes during suspension', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const suspended = sinon.stub(targetManager, 'allTargetsSuspended').returns(false);
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);
    const response = Promise.withResolvers<Protocol.WebAudio.ContextRealtimeData|null>();
    const request = sinon.stub(model, 'requestRealtimeData').returns(response.promise);
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    const widget = new WebAudio.WebAudioView.WebAudioView(undefined, view);
    renderElementIntoDOM(widget);
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await clock.tickAsync(1000);
    sinon.assert.calledOnce(request);

    suspended.returns(true);
    targetManager.dispatchEventToListeners(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED);
    await view.nextInput;
    response.resolve({currentTime: 1, renderCapacity: 0.5, callbackIntervalMean: 0.01, callbackIntervalVariance: 0});
    await clock.tickAsync(3000);
    sinon.assert.calledOnce(request);
    assert.isTrue(view.input.suspended);
    assert.isNull(view.input.contextRealtimeData);
    widget.detach();
  });

  it('shows placeholder', async () => {
    const viewFunction = WebAudio.WebAudioView.DEFAULT_VIEW;
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    viewFunction({
      suspended: false,
      contexts: [],
      selectedContextIndex: -1,
      onContextSelectorSelectionChanged: () => {},
      contextRealtimeData: null,
    },
                 undefined, container);
    await assertScreenshot('web_audio/web-audio-view-placeholder.png');
    container.remove();
  });

  it('shows contexts', async () => {
    const viewFunction = WebAudio.WebAudioView.DEFAULT_VIEW;
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    viewFunction({
      suspended: false,
      contexts: [context1, context2],
      selectedContextIndex: 0,
      onContextSelectorSelectionChanged: () => {},
      contextRealtimeData: null,
    },
                 undefined, container);
    await assertScreenshot('web_audio/web-audio-view-contexts.png');
    container.remove();
  });

  it('renders context detail rows including render quantum size', () => {
    const viewFunction = WebAudio.WebAudioView.DEFAULT_VIEW;
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    viewFunction({
      suspended: false,
      contexts: [context1],
      selectedContextIndex: 0,
      onContextSelectorSelectionChanged: () => {},
      contextRealtimeData: null,
    },
                 undefined, container);

    const entries = Array.from(container.querySelectorAll('.context-detail-row-entry')).map(e => e.textContent?.trim());
    const values = Array.from(container.querySelectorAll('.context-detail-row-value')).map(e => e.textContent?.trim());
    assert.include(entries, 'Render quantum size');
    assert.include(values, '128 frames');
    container.remove();
  });

  it('starts empty', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view), {includeCommonStyles: true});
    assert.isEmpty(view.input.contexts);
    assert.strictEqual(view.input.selectedContextIndex, -1);
  });

  it('selects created context', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context1]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('clears list on reset', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.MODEL_RESET);
    const input = await view.nextInput;

    assert.isEmpty(input.contexts);
    assert.strictEqual(input.selectedContextIndex, -1);
  });

  it('re-selects created context after change', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CHANGED, context1);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context1]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('keeps first context selected when another is added', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context2);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context1, context2]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('does not change selection when a different context is changed', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context2);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CHANGED, context2);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context1, context2]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('selects the context that was chosen', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context2);
    await view.nextInput;

    assert.exists(view.input);
    view.input.onContextSelectorSelectionChanged(context2.contextId);
    const input = await view.nextInput;
    assert.strictEqual(input.selectedContextIndex, 1);
  });

  it('keeps context selected when another is destroyed', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context2);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_DESTROYED, context2.contextId);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context1]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('selects another context when the selected one is destroyed', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;
    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context2);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_DESTROYED, context1.contextId);
    const input = await view.nextInput;

    assert.deepEqual(input.contexts, [context2]);
    assert.strictEqual(input.selectedContextIndex, 0);
  });

  it('selects nothing when the only context is destroyed', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
    const target = createTarget();
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_CREATED, context1);
    await view.nextInput;

    model.dispatchEventToListeners(WebAudio.WebAudioModel.Events.CONTEXT_DESTROYED, context1.contextId);
    const input = await view.nextInput;

    assert.isEmpty(input.contexts);
    assert.strictEqual(input.selectedContextIndex, -1);
  });
});
