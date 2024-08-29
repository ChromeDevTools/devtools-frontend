// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, waitFor} from '../../shared/helper.js';

import {
  getDisplayedEventListenerNames,
  getFirstNodeForEventListener,
  loadEventListenersAndSelectButtonNode,
  openEventListenersPaneAndWaitForListeners,
} from '../helpers/event-listeners-helpers.js';

describe('Removing event listeners in the elements sidebar', () => {
  beforeEach(async () => {
    await loadEventListenersAndSelectButtonNode();
  });

  it('shows delete button by each node for a given event', async () => {
    await openEventListenersPaneAndWaitForListeners();
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener('[aria-label="click, event listener"]');

    // Check that we have the right event for the right element
    // and that it has the delete button within it.
    assert.include(firstListenerText, 'button#test-button');
    const removeButtonSelector = `${listenerSelector} devtools-button`;
    const removeButton = await waitFor(removeButtonSelector);
    removeButton.evaluate(n => {
      const button = n.shadowRoot?.querySelector('button');
      assert.strictEqual(button?.title, 'Delete event listener');
    });

    await click(removeButtonSelector);

    // now we can check that the 'click' event is gone
    const eventListenerNames = await getDisplayedEventListenerNames();
    assert.deepEqual(eventListenerNames, ['custom event', 'hover']);
  });
});
