// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getDisplayedEventListenerNames,
  getEventListenerProperties,
  getFirstNodeForEventListener,
  loadEventListenersAndSelectButtonNode,
  openEventListenersPaneAndWaitForListeners,
} from '../helpers/event-listeners-helpers.js';

describe('Event listeners in the elements sidebar', async () => {
  beforeEach(async () => {
    await loadEventListenersAndSelectButtonNode();
  });

  it('lists the active event listeners on the page', async () => {
    await openEventListenersPaneAndWaitForListeners();

    const eventListenerNames = await getDisplayedEventListenerNames();
    assert.deepEqual(eventListenerNames, ['click', 'custom event', 'hover']);
  });

  it('shows the event listener properties when expanding it', async () => {
    const {frontend} = getBrowserAndPages();
    await openEventListenersPaneAndWaitForListeners();
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener('[aria-label="click, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'button#test-button');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await frontend.keyboard.press('ArrowRight');  // select
    await frontend.keyboard.press('ArrowRight');  // expand
    await waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const clickEventPropertiesSelector = `${listenerSelector} + ol .name-and-value`;
    const propertiesOutput = await getEventListenerProperties(clickEventPropertiesSelector);

    assert.deepEqual(propertiesOutput, [
      ['useCapture', 'false'],
      ['passive', 'false'],
      ['once', 'false'],
      ['handler', '() => {}'],
    ]);
  });

  it('shows custom event listeners and their properties correctly', async () => {
    const {frontend} = getBrowserAndPages();
    await openEventListenersPaneAndWaitForListeners();
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener('[aria-label="custom event, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'body');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await frontend.keyboard.press('ArrowRight');  // select
    await frontend.keyboard.press('ArrowRight');  // expand
    await waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const customEventProperties = `${listenerSelector} + ol .name-and-value`;
    const propertiesOutput = await getEventListenerProperties(customEventProperties);

    assert.deepEqual(propertiesOutput, [
      ['useCapture', 'true'],
      ['passive', 'false'],
      ['once', 'true'],
      ['handler', '() => console.log(\'test\')'],
    ]);
  });
});
