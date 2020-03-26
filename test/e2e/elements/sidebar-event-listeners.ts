// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {$, click, getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, getDisplayedEventListenerNames, getEventListenerProperties, openEventListenersPaneAndWaitForListeners, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

describe('Event listeners in the elements sidebar', async () => {
  beforeEach(async () => {
    await resetPages();

    const {target, frontend} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/elements/sidebar-event-listeners.html`);
    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select the button that has the events and make sure it's selected
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<button id=\u200B"test-button">\u200Bhello world\u200B</button>\u200B');
  });

  it('lists the active event listeners on the page', async () => {
    await openEventListenersPaneAndWaitForListeners();

    const eventListenerNames = await getDisplayedEventListenerNames();
    assert.deepEqual(eventListenerNames, ['click', 'custom event', 'hover']);
  });

  it('shows the event listener properties when expanding it', async () => {
    await openEventListenersPaneAndWaitForListeners();

    const clickListenerSelector = '[aria-label="click, event listener"]';
    await click(clickListenerSelector);

    const buttonClickEventSelector = `${clickListenerSelector} + ol>li`;
    const buttonClickEvent = await $(buttonClickEventSelector);
    const buttonClickEventText = await buttonClickEvent.evaluate(button => {
      return button.textContent;
    });

    // check that we have the right event for the right element
    // we can't use assert.equal() as the text also includes the "Remove" button
    assert.include(buttonClickEventText, 'button#test-button');

    // we have to double click on the event to expand it
    // as single click reveals it in the elements tree
    await click(buttonClickEventSelector, {
      clickOptions: {
        clickCount: 2,
      },
    });
    const clickEventPropertiesSelector = `${buttonClickEventSelector} + ol .name-and-value`;
    const propertiesOutput = await getEventListenerProperties(clickEventPropertiesSelector);

    assert.deepEqual(propertiesOutput, [
      ['useCapture', 'false'],
      ['passive', 'false'],
      ['once', 'false'],
      ['handler', '() => {}'],
    ]);
  });
});
