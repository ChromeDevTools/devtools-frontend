// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$$, click, getBrowserAndPages, goToResource, waitForElementsWithTextContent, waitForElementWithTextContent, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {changeViewViaDropdown, findSearchResult, navigateToMemoryTab, setSearchFilter, takeHeapSnapshot, waitForNonEmptyHeapSnapshotData, waitForRetainerChain, waitForSearchResultNumber} from '../helpers/memory-helpers.js';

describe('The Memory Panel', async () => {
  it('Loads content', async () => {
    await goToResource('memory/default.html');
    await navigateToMemoryTab();
  });

  it('Can take several heap snapshots ', async () => {
    await goToResource('memory/default.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    const heapSnapShots = await $$('.heap-snapshot-sidebar-tree-item');
    assert.strictEqual(heapSnapShots.length, 2);
  });

  it('Shows a DOM node and its JS wrapper as a single node', async () => {
    await goToResource('memory/detached-node.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('leaking');
    await waitForSearchResultNumber(4);
    await findSearchResult(async p => {
      const el = await p.$(':scope > td > div > .object-value-function');
      return !!el && await el.evaluate(el => el.textContent === 'leaking()');
    });
    await waitForRetainerChain([
      'Detached V8EventListener',
      'Detached EventListener',
      'Detached InternalNode',
      'Detached InternalNode',
      'Detached HTMLDivElement',
      'Retainer',
      'Window /',
    ]);
  });

  it('Correctly retains the path for event listeners', async () => {
    await goToResource('memory/event-listeners.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('myEventListener');
    await waitForSearchResultNumber(4);
    await findSearchResult(async p => {
      const el = await p.$(':scope > td > div > .object-value-function');
      return !!el && await el.evaluate(el => el.textContent === 'myEventListener()');
    });
    await waitForRetainerChain([
      'V8EventListener',
      'EventListener',
      'InternalNode',
      'InternalNode',
      'HTMLBodyElement',
      'HTMLHtmlElement',
      'HTMLDocument',
      'Window /',
    ]);
  });

  it('Puts all ActiveDOMObjects with pending activities into one group', async () => {
    await goToResource('memory/dom-objects.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await changeViewViaDropdown('Containment');
    const pendingActiviesElement = await waitForElementWithTextContent('Pending activities');

    // Focus and then expand the pending activities row to show its children
    await click(pendingActiviesElement);
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('ArrowRight');

    await waitForFunction(async () => {
      const pendingActiviesChildren = await waitForElementsWithTextContent('MediaQueryList');
      return pendingActiviesChildren.length === 2;
    });
  });

  it('Shows the correct number of divs for a detached DOM tree correctly', async () => {
    await goToResource('memory/detached-dom-tree.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Detached HTMLDivElement');
    await waitForSearchResultNumber(3);
  });
});
