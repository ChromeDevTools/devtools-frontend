// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Media from './media.js';

const PLAYER_ID = 'PLAYER_ID' as Protocol.Media.PlayerId;

describeWithMockConnection('MediaMainView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  const testUiUpdate = <T extends keyof Media.MediaModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, expectedMethod: keyof Media.MainView.PlayerDataDownloadManager,
      inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const downloadStore = new Media.MainView.PlayerDataDownloadManager();
    const expectedCall = sinon.stub(downloadStore, expectedMethod).returns();
    const mainView = new Media.MainView.MainView(downloadStore);
    mainView.markAsRoot();
    mainView.show(document.body);
    const model = target.model(Media.MediaModel.MediaModel);
    assert.exists(model);
    model.dispatchEventToListeners(Media.MediaModel.Events.PLAYERS_CREATED, [PLAYER_ID]);
    const field = [{name: 'kResolution', value: '{}', data: {}, stack: [], cause: []}];
    const data = {playerId: PLAYER_ID, properties: field, events: field, messages: field, errors: field};
    model.dispatchEventToListeners(
        event, ...[data] as unknown as Common.EventTarget.EventPayloadToRestParameters<Media.MediaModel.EventTypes, T>);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(expectedCall.called, inScope);
    await Coordinator.RenderCoordinator.RenderCoordinator.instance().done();
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
});
