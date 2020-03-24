// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, getDisplayedEventListenerNames, openEventListenersPaneAndWaitForListeners, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

describe('Event listeners in the elements sidebar', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('lists the active event listeners on the page', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/sidebar-event-listeners.html`);

    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');
    // Select the button that has the events and make sure it's selected
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<button id=\u200B"test-button">\u200Bhello world\u200B</button>\u200B');

    await openEventListenersPaneAndWaitForListeners();

    const eventListenerNames = await getDisplayedEventListenerNames();
    assert.deepEqual(eventListenerNames, ['click', 'custom event', 'hover']);
  });
});
