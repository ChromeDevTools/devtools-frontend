// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Media from './media.js';

const PLAYER_ID = 'PLAYER_ID' as Protocol.Media.PlayerId;

describeWithEnvironment('MediaMainView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  function assertEmptyState(container: HTMLElement, expectedHeader: string, expectedDescription: string) {
    const emptyWidgetElement = container.querySelector('.empty-widget-container');
    assert.exists(emptyWidgetElement);
    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent, expectedHeader);
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-description span')?.textContent,
                     expectedDescription);
  }

  const testUiUpdate = <T extends keyof Media.MediaModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, expectedMethod: keyof Media.MainView.PlayerDataDownloadManager,
      inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const downloadStore = new Media.MainView.PlayerDataDownloadManager();
    const expectedCall = sinon.stub(downloadStore, expectedMethod);
    const mainView = new Media.MainView.MainView(downloadStore);
    renderElementIntoDOM(mainView);
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);
    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, {playerId: PLAYER_ID});
    const field = [{name: 'kResolution', value: '{}', data: {}, stack: [], cause: []}];
    const data = {playerId: PLAYER_ID, properties: field, events: field, messages: field, errors: field};
    model.dispatchEventToListeners(
        event, ...[data] as unknown as Common.EventTarget.EventPayloadToRestParameters<Media.MediaModel.EventTypes, T>);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(expectedCall.called, inScope);
    await RenderCoordinator.done();
    mainView.detach();
  };

  it('reacts to properties on in scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_PROPERTIES_CHANGED, 'onProperty', true));
  it('does not react to properties on out of scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_PROPERTIES_CHANGED, 'onProperty', false));
  it('reacts to event on in scope event', testUiUpdate(Media.MediaModel.Events.PLAYER_EVENTS_ADDED, 'onEvent', true));
  it('does not react to event on out of scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_EVENTS_ADDED, 'onEvent', false));
  it('reacts to messages on in scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_MESSAGES_LOGGED, 'onMessage', true));
  it('does not react to messages on out of scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_MESSAGES_LOGGED, 'onMessage', false));
  it('reacts to error on in scope event', testUiUpdate(Media.MediaModel.Events.PLAYER_ERRORS_RAISED, 'onError', true));
  it('does not react to error on out of scope event',
     testUiUpdate(Media.MediaModel.Events.PLAYER_ERRORS_RAISED, 'onError', false));

  it('shows a placeholder if no player is available', async () => {
    const view = createViewFunctionStub(Media.MainView.MainView);
    const mainView = new Media.MainView.MainView(undefined, view);
    const input = await view.nextInput;
    assert.isFalse(input.hasPlayers);
    assert.isUndefined(input.activePanel);
    mainView.detach();
  });

  it('shows a placeholder if no player was selected', async () => {
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);

    // Show main view, which will register event listeners on the model.
    const view = createViewFunctionStub(Media.MainView.MainView);
    const mainView = new Media.MainView.MainView(undefined, view);
    renderElementIntoDOM(mainView);
    await view.nextInput;

    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, {playerId: PLAYER_ID});
    const input = await view.nextInput;
    assert.isTrue(input.hasPlayers);
    assert.isUndefined(input.activePanel);
    mainView.detach();
  });

  it('shows a placeholder that no player was detected if all players are hidden', async () => {
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);

    // Show main view, which will register event listeners on the model.
    const view = createViewFunctionStub(Media.MainView.MainView);
    const mainView = new Media.MainView.MainView(undefined, view);
    renderElementIntoDOM(mainView);
    await view.nextInput;

    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, {playerId: PLAYER_ID});
    await view.nextInput;
    mainView.markPlayerForDeletion(PLAYER_ID);
    const input = await view.nextInput;

    assert.isFalse(input.hasPlayers);
    assert.isUndefined(input.activePanel);
    mainView.detach();
  });

  it('shows a placeholder if all players are hidden after already selecting a player and showing its details',
     async () => {
       const model = target.model(Media.MediaModel.MediaModel);
       assert.exists(model);

       // Show main view, which will register event listeners on the model.
       const view = createViewFunctionStub(Media.MainView.MainView);
       const mainView = new Media.MainView.MainView(undefined, view);
       renderElementIntoDOM(mainView);
       await view.nextInput;

       model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, {playerId: PLAYER_ID});
       await view.nextInput;
       mainView.renderMainPanel(PLAYER_ID);
       assert.isDefined((await view.nextInput).activePanel);
       mainView.markPlayerForDeletion(PLAYER_ID);
       const input = await view.nextInput;

       assert.isFalse(input.hasPlayers);
       assert.isUndefined(input.activePanel);
       mainView.detach();
     });

  it('renders placeholders in DEFAULT_VIEW', () => {
    const widget = new UI.Widget.Widget();
    renderElementIntoDOM(widget);
    const sidebar = new Media.PlayerListView.PlayerListView(sinon.createStubInstance(Media.MainView.MainView));

    Media.MainView.DEFAULT_VIEW({sidebar, hasPlayers: false}, undefined, widget.contentElement);
    assertEmptyState(widget.contentElement, 'No media player',
                     'On this page you can view and export media player details');

    Media.MainView.DEFAULT_VIEW({sidebar, hasPlayers: true}, undefined, widget.contentElement);
    assertEmptyState(widget.contentElement, 'No media player selected', 'Select a media player to inspect its details');
    widget.detach();
  });

  it('can select player by dom node id', () => {
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);

    const mainView = new Media.MainView.MainView();
    const renderMainPanelSpy = sinon.spy(mainView, 'renderMainPanel');

    renderElementIntoDOM(mainView);

    const domNodeId = 42 as Protocol.DOM.BackendNodeId;
    const player = {playerId: PLAYER_ID, domNodeId};
    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, player);

    mainView.selectPlayerByDOMNodeId(domNodeId);
    sinon.assert.calledWith(renderMainPanelSpy, PLAYER_ID);
    mainView.detach();
  });

  it('waitForInitialPlayers resolves after player is created', async () => {
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);

    const mainView = new Media.MainView.MainView();
    renderElementIntoDOM(mainView);

    const promise = mainView.waitForInitialPlayers();
    const domNodeId = 42 as Protocol.DOM.BackendNodeId;
    const player = {playerId: PLAYER_ID, domNodeId};
    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYER_CREATED, player);

    await promise;  // This will time out if the promise is not resolved.
    mainView.detach();
  });
});
