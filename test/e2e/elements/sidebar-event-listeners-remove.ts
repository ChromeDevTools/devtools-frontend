// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, resetPages} from '../../shared/helper.js';
import {getDisplayedEventListenerNames, loadEventListenersAndSelectButtonNode, openEventListenersPaneAndWaitForListeners} from '../helpers/event-listeners-helpers.js';

describe('Removing event listeners in the elements sidebar', async () => {
  beforeEach(async () => {
    await resetPages();
    await loadEventListenersAndSelectButtonNode();
  });

  it('shows "Remove" by each node for a given event', async () => {
    await openEventListenersPaneAndWaitForListeners();

    const clickListenerSelector = '[aria-label="click, event listener"]';
    await click(clickListenerSelector);

    const buttonClickEventSelector = `${clickListenerSelector} + ol>li`;
    const buttonClickEvent = await $(buttonClickEventSelector);
    const buttonClickEventText = await buttonClickEvent.evaluate(button => {
      return button.textContent;
    });

    // check that we have the right event for the right element
    // and that it has the "Remove" button within it
    assert.include(buttonClickEventText, 'button#test-button');
    assert.include(buttonClickEventText, 'Remove');

    const removeButtonSelector = `${buttonClickEventSelector} .event-listener-button`;
    await click(removeButtonSelector);

    // now we can check that the 'click' event is gone
    const eventListenerNames = await getDisplayedEventListenerNames();
    assert.deepEqual(eventListenerNames, ['custom event', 'hover']);
  });
});
