// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
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
};

const context2: Protocol.WebAudio.BaseAudioContext = {
  contextId: '78a3e94e-4968-4bf6-8905-325109695c9e' as Protocol.WebAudio.GraphObjectId,
  contextType: Protocol.WebAudio.ContextType.Realtime,
  contextState: Protocol.WebAudio.ContextState.Running,
  sampleRate: 44100,
  callbackBufferSize: 1024,
  maxOutputChannelCount: 2,
};

describeWithMockConnection('WebAudioView', () => {
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

  it('shows placeholder', async () => {
    const viewFunction = WebAudio.WebAudioView.DEFAULT_VIEW;
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    viewFunction(
        {
          contexts: [],
          selectedContextIndex: -1,
          onContextSelectorSelectionChanged: () => {},
          contextRealtimeData: null
        },
        {}, container);
    await assertScreenshot('web_audio/web-audio-view-placeholder.png');
    container.remove();
  });

  it('shows contexts', async () => {
    const viewFunction = WebAudio.WebAudioView.DEFAULT_VIEW;
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    viewFunction(
        {
          contexts: [context1, context2],
          selectedContextIndex: 0,
          onContextSelectorSelectionChanged: () => {},
          contextRealtimeData: null
        },
        {}, container);
    await assertScreenshot('web_audio/web-audio-view-contexts.png');
    container.remove();
  });

  it('starts empty', async () => {
    const view = createViewFunctionStub(WebAudio.WebAudioView.WebAudioView);
    renderElementIntoDOM(new WebAudio.WebAudioView.WebAudioView(undefined, view));
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
