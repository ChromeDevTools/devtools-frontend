// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Media from './media.js';

describeWithEnvironment('EventDisplayTable', () => {
  it('correctly displays the timestamp for events', () => {
    let viewInput: Media.PlayerEventsView.PlayerEventsViewInput|undefined;
    const view = (input: Media.PlayerEventsView.PlayerEventsViewInput) => {
      viewInput = input;
    };
    const eventDisplayTable = new Media.PlayerEventsView.PlayerEventsView(view);
    const event1 = {
      timestamp: 1000,
      value: JSON.stringify({event: 'testEvent', data: 'data1'}),
    } as Media.MediaModel.PlayerEvent;

    eventDisplayTable.onEvent(event1);
    eventDisplayTable.performUpdate();

    assert.isDefined(viewInput);
    assert.lengthOf(viewInput!.parsedEvents, 1);

    const firstEvent = viewInput!.parsedEvents[0];

    // Verify the data property is set correctly
    assert.strictEqual(firstEvent.displayTimestamp, '0.000');
  });

  it('subtracts the first event time from subsequent events', () => {
    let viewInput: Media.PlayerEventsView.PlayerEventsViewInput|undefined;
    const view = (input: Media.PlayerEventsView.PlayerEventsViewInput) => {
      viewInput = input;
    };
    const eventDisplayTable = new Media.PlayerEventsView.PlayerEventsView(view);
    const event1 = {
      timestamp: 1000,
      value: JSON.stringify({event: 'testEvent', data: 'data1'}),
    } as Media.MediaModel.PlayerEvent;

    const event2 = {
      timestamp: 1234.5678,
      value: JSON.stringify({event: 'testEvent2', data: 'data2'}),
    } as Media.MediaModel.PlayerEvent;

    eventDisplayTable.onEvent(event1);
    eventDisplayTable.onEvent(event2);
    eventDisplayTable.performUpdate();

    assert.isDefined(viewInput);
    assert.lengthOf(viewInput!.parsedEvents, 2);

    const secondEvent = viewInput!.parsedEvents[1];

    assert.strictEqual(secondEvent.displayTimestamp, '234.568');
  });
});
