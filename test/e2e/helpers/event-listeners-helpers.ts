// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, click, getBrowserAndPages, goToResource, waitFor} from '../../shared/helper.js';

import {
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForSelectedNodeToBeExpanded,
} from './elements-helpers.js';

export const loadEventListenersAndSelectButtonNode = async () => {
  const {frontend} = getBrowserAndPages();
  await goToResource('elements/sidebar-event-listeners.html');
  await waitForElementsStyleSection();

  // Check to make sure we have the correct node selected after opening a file
  await waitForContentOfSelectedElementsNode('<body class=\u200B"test-js-loaded">\u200B');

  // Wait for element to be expanded
  await waitForSelectedNodeToBeExpanded();

  // Select the button that has the events and make sure it's selected
  await frontend.keyboard.press('ArrowRight');
  await waitForContentOfSelectedElementsNode('<button id=\u200B"test-button">\u200Bhello world\u200B</button>\u200B');
};

const EVENT_LISTENERS_PANEL_LINK = '[aria-label="Event Listeners"]';
/* We add :not(.hidden) here as if you create an event listener + remove it via the UI
 * it gets the class of .hidden rather than being removed
 */
const EVENT_LISTENERS_SELECTOR = '[aria-label$="event listener"]:not(.hidden)';

export const openEventListenersPaneAndWaitForListeners = async () => {
  await click(EVENT_LISTENERS_PANEL_LINK);
  await waitFor(EVENT_LISTENERS_SELECTOR);
};

export const getDisplayedEventListenerNames = async () => {
  const eventListeners = await $$(EVENT_LISTENERS_SELECTOR);
  const eventListenerNames = await Promise.all(eventListeners.map(listener => listener.evaluate(l => l.textContent)));
  return eventListenerNames as string[];
};

export const getEventListenerProperties = async (selector: string) => {
  const clickEventProperties = await $$(selector);

  const propertiesOutput = await Promise.all(clickEventProperties.map(n => n.evaluate(node => {
    const nameNode = node.querySelector('.name');
    const valueNode = node.querySelector('.value');

    if (!nameNode || !valueNode) {
      throw new Error('Could not find a name and value node for event listener properties.');
    }

    const key = nameNode.textContent;
    const value = valueNode.textContent;
    return [key, value];
  })));

  return propertiesOutput as Array<string[]>;
};

export const getFirstNodeForEventListener = async (listenerTypeSelector: string) => {
  await click(listenerTypeSelector);

  const listenerNodesSelector = `${listenerTypeSelector} + ol>li`;
  const firstListenerNode = await waitFor(listenerNodesSelector);
  const firstListenerText = await firstListenerNode.evaluate(node => {
    return node.textContent || '';
  });

  return {
    firstListenerText: firstListenerText,
    listenerSelector: listenerNodesSelector,
  };
};
