// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForSelectedNodeToBeExpanded,
} from '../../e2e/helpers/elements-helpers.js';
import {clickMoreTabsButton} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Event listeners in the elements sidebar', () => {
  const loadEventListenersAndSelectButtonNode = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
    await inspectedPage.goToResource('elements/sidebar-event-listeners.html');
    await waitForElementsStyleSection(undefined, devToolsPage);

    // Wait for element to be expanded
    await waitForSelectedNodeToBeExpanded(devToolsPage);

    // Select the button that has the events and make sure it's selected
    await devToolsPage.page.keyboard.press('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<button id=\u200B"test-button">\u200Bhello world\u200B</button>\u200B', devToolsPage);
  };

  const EVENT_LISTENERS_PANEL_LINK = '[aria-label="Event Listeners"]';
  /* We add :not(.hidden) here as if you create an event listener + remove it via the UI
   * it gets the class of .hidden rather than being removed
   */
  const EVENT_LISTENERS_SELECTOR = '[aria-label$="event listener"]:not(.hidden)';

  const getDisplayedEventListenerNames = async (devToolsPage: DevToolsPage) => {
    const eventListeners = await devToolsPage.$$(EVENT_LISTENERS_SELECTOR);
    const eventListenerNames = await Promise.all(
        eventListeners.map((listener: puppeteer.JSHandle) => listener.evaluate(l => (l as Element).textContent)));
    return eventListenerNames as string[];
  };

  const getEventListenerProperties = async (devToolsPage: DevToolsPage, selector: string) => {
    const clickEventProperties = await devToolsPage.$$(selector);

    const propertiesOutput = await Promise.all(clickEventProperties.map(n => n.evaluate((node: Element) => {
      const nameNode = node.querySelector('.name');
      const valueNode = node.querySelector('.value');

      if (!nameNode || !valueNode) {
        throw new Error('Could not find a name and value node for event listener properties.');
      }

      const key = nameNode.textContent;
      const value = valueNode.textContent;
      return [key, value];
    })));

    return propertiesOutput as string[][];
  };

  const getFirstNodeForEventListener = async (devToolsPage: DevToolsPage, listenerTypeSelector: string) => {
    await devToolsPage.click(listenerTypeSelector);

    const listenerNodesSelector = `${listenerTypeSelector} + ol>li`;
    const firstListenerNode = await devToolsPage.waitFor(listenerNodesSelector);
    if (!firstListenerNode) {
      throw new Error(`Could not find listener node for selector ${listenerNodesSelector}`);
    }
    const firstListenerText = await firstListenerNode.evaluate((node: Element) => {
      return node.textContent || '';
    });

    return {
      firstListenerText,
      listenerSelector: listenerNodesSelector,
    };
  };

  const openEventListenersPaneAndWaitForListeners = async (devToolsPage: DevToolsPage) => {
    let eventListenersPanel = await devToolsPage.$('Event Listeners', undefined, 'aria');
    if (!eventListenersPanel) {
      await clickMoreTabsButton(undefined, devToolsPage);
      eventListenersPanel = await devToolsPage.waitFor(EVENT_LISTENERS_PANEL_LINK);
    }
    await devToolsPage.clickElement(eventListenersPanel);
    await devToolsPage.waitFor(EVENT_LISTENERS_SELECTOR);
  };

  it('lists the active event listeners on the page', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);

    const eventListenerNames = await getDisplayedEventListenerNames(devToolsPage);
    assert.deepEqual(eventListenerNames, ['click', 'custom event', 'hover']);
  });

  it('shows the event listener properties when expanding it', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="click, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'button#test-button');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await devToolsPage.page.keyboard.press('ArrowRight');  // select
    await devToolsPage.page.keyboard.press('ArrowRight');  // expand
    await devToolsPage.waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const clickEventPropertiesSelector = `${listenerSelector} + ol .name-and-value`;
    const propertiesOutput = await getEventListenerProperties(devToolsPage, clickEventPropertiesSelector);

    assert.deepEqual(propertiesOutput, [
      ['useCapture', 'false'],
      ['passive', 'false'],
      ['once', 'false'],
      ['handler', '() => {}'],
    ]);
  });

  it('shows custom event listeners and their properties correctly', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="custom event, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'body');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await devToolsPage.page.keyboard.press('ArrowRight');  // select
    await devToolsPage.page.keyboard.press('ArrowRight');  // expand
    await devToolsPage.waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const customEventProperties = `${listenerSelector} + ol .name-and-value`;
    const propertiesOutput = await getEventListenerProperties(devToolsPage, customEventProperties);

    assert.deepEqual(propertiesOutput, [
      ['useCapture', 'true'],
      ['passive', 'false'],
      ['once', 'true'],
      ['handler', '() => console.log(\'test\')'],
    ]);
  });

  it('shows delete button by each node for a given event', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="click, event listener"]');

    // Check that we have the right event for the right element
    // and that it has the delete button within it.
    assert.include(firstListenerText, 'button#test-button');
    const removeButtonSelector = `${listenerSelector} devtools-button`;
    const removeButton = await devToolsPage.waitFor(removeButtonSelector);
    if (!removeButton) {
      assert.fail(`Could not find remove button with selector ${removeButtonSelector}`);
    }
    const buttonTitle = await removeButton.evaluate(n => {
      const button = n.shadowRoot?.querySelector('button');
      return button?.title;
    });
    assert.strictEqual(buttonTitle, 'Delete event listener');

    await devToolsPage.click(removeButtonSelector);

    // now we can check that the 'click' event is gone
    const eventListenerNames = await getDisplayedEventListenerNames(devToolsPage);
    assert.deepEqual(eventListenerNames, ['custom event', 'hover']);
  });
});
