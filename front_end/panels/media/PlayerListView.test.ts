// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

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

  it('ignores malformed FRAME_URL properties', async () => {
    const mainView = new Media.MainView.MainView();
    const view = createViewFunctionStub(Media.PlayerListView.PlayerListView);
    const playerListView = new Media.PlayerListView.PlayerListView(mainView, view);
    playerListView.addMediaElementItem('player1');
    const initialInput = await view.nextInput;
    assert.strictEqual(initialInput.players[0].frameTitle, 'FrameTitle');

    playerListView.onProperty('player1', {
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.FRAME_URL,
      value: 'invalid-url',
    });
    await playerListView.updateComplete;
    assert.strictEqual(view.input.players[0].frameTitle, 'FrameTitle');
  });

  it('ignores malformed JSON events and continues processing subsequent events', async () => {
    const mainView = new Media.MainView.MainView();
    const view = createViewFunctionStub(Media.PlayerListView.PlayerListView);
    const playerListView = new Media.PlayerListView.PlayerListView(mainView, view);
    playerListView.addMediaElementItem('player1');
    await view.nextInput;

    playerListView.onEvent('player1', {value: 'invalid json', timestamp: 1} as Media.MediaModel.PlayerEvent);
    playerListView.onEvent('player1', {
      value: JSON.stringify({event: 'kPlay'}),
      timestamp: 2,
    } as Media.MediaModel.PlayerEvent);

    const input = await view.nextInput;
    assert.strictEqual(input.players[0].iconName, 'play');
  });

  it('ignores kLoad events without a string url', async () => {
    const mainView = new Media.MainView.MainView();
    const view = createViewFunctionStub(Media.PlayerListView.PlayerListView);
    const playerListView = new Media.PlayerListView.PlayerListView(mainView, view);
    playerListView.addMediaElementItem('player1');
    await view.nextInput;

    playerListView.onEvent('player1', {
      value: JSON.stringify({event: 'kLoad', url: 123}),
      timestamp: 1,
    } as Media.MediaModel.PlayerEvent);
    playerListView.onEvent('player1', {
      value: JSON.stringify({event: 'kPlay'}),
      timestamp: 2,
    } as Media.MediaModel.PlayerEvent);

    const input = await view.nextInput;
    assert.strictEqual(input.players[0].playerTitle, 'PlayerTitle');
    assert.strictEqual(input.players[0].iconName, 'play');
  });
});
