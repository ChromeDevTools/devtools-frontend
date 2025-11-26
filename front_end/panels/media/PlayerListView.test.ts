// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Media from './media.js';

describeWithEnvironment('PlayerListView', () => {
  it('renders players and handles selection', async () => {
    const mainView = new Media.MainView.MainView();
    const view = createViewFunctionStub(Media.PlayerListView.PlayerListView);
    const playerListView = new Media.PlayerListView.PlayerListView(mainView, view);
    playerListView.addMediaElementItem('player1');
    await view.nextInput;

    sinon.assert.called(view);
    assert.lengthOf(view.input.players, 1);
    assert.strictEqual(view.input.players[0].playerTitle, 'PlayerTitle');

    // Select player
    view.input.onPlayerClick('player1');
    const input = await view.nextInput;
    assert.strictEqual(input.selectedPlayerID, 'player1');
  });

  it('updates player title and icon', async () => {
    const mainView = new Media.MainView.MainView();
    const view = createViewFunctionStub(Media.PlayerListView.PlayerListView);
    const playerListView = new Media.PlayerListView.PlayerListView(mainView, view);
    playerListView.addMediaElementItem('player1');
    await view.nextInput;

    const event = {
      value: JSON.stringify({
        event: 'kLoad',
        url: 'http://example.com/video.mp4',
      }),
    } as Media.MediaModel.PlayerEvent;
    playerListView.onEvent('player1', event);
    await view.nextInput;

    assert.strictEqual(view.input.players[0].playerTitle, 'video.mp4');

    const playEvent = {
      value: JSON.stringify({
        event: 'kPlay',
      }),
    } as Media.MediaModel.PlayerEvent;
    playerListView.onEvent('player1', playEvent);
    const input = await view.nextInput;
    assert.strictEqual(input.players[0].iconName, 'play');
  });
});
