// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$$, click, getBrowserAndPages, goToResource, waitForElementsWithTextContent, waitForElementWithTextContent, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {changeViewViaDropdown, findSearchResult, getDataGridRows, navigateToMemoryTab, setSearchFilter, takeHeapSnapshot, waitForNonEmptyHeapSnapshotData, waitForRetainerChain, waitForSearchResultNumber, waitUntilRetainerChainSatisfies} from '../helpers/memory-helpers.js';

describe('The Memory Panel', async function() {
  // These tests render large chunks of data into DevTools and filter/search
  // through it. On bots with less CPU power, these can fail because the
  // rendering takes a long time, so we allow a larger timeout.
  this.timeout(20000);

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
      'Window',
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
      'Window',
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

  it('Shows the correct output for an attached iframe', async () => {
    await goToResource('memory/attached-iframe.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Retainer');
    await waitForSearchResultNumber(8);
    await findSearchResult(async p => {
      const el = await p.$(':scope > td > div > .object-value-object');
      return !!el && await el.evaluate(el => el.textContent === 'Retainer');
    });
    // The following line checks two things: That the property 'aUniqueName'
    // in the iframe is retaining the Retainer class object, and that the
    // iframe window is not detached.
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.some(
            ({propertyName, retainerClassName}) => propertyName === 'aUniqueName' && retainerClassName === 'Window'));
  });

  it('Correctly shows multiple retainer paths for an object', async () => {
    await goToResource('memory/multiple-retainers.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('leaking');
    await waitForSearchResultNumber(4);

    await waitForFunction(async () => {
      // Wait for all the rows of the data-grid to load.
      const retainerGridElements = await getDataGridRows('.retaining-paths-view table.data');
      return retainerGridElements.length === 9;
    });

    const sharedInLeakingElementRow = await waitForFunction(async () => {
      const results = await getDataGridRows('.retaining-paths-view table.data');
      const findPromises = await Promise.all(results.map(async e => {
        const textContent = await e.evaluate(el => el.textContent);
        // Can't search for "shared in leaking()" because the different parts are spaced with CSS.
        return textContent && textContent.startsWith('sharedinleaking()') ? e : null;
      }));
      return findPromises.find(result => result !== null);
    });

    if (!sharedInLeakingElementRow) {
      assert.fail('Could not find data-grid row with "shared in leaking()" text.');
    }

    // TODO(jacktfranklin): Consider some helpers to make asserting on contents
    // of the data-grid in the heap snapshot UI easier.
    const textOfEl = await sharedInLeakingElementRow.evaluate(e => e.textContent || '');
    // Double check we got the right element to avoid a confusing text failure
    // later down the line.
    assert.isTrue(textOfEl.startsWith('sharedinleaking()'));

    // Have to click it not in the middle as the middle can hold the link to the
    // file in the sources pane and we want to avoid clicking that.
    await click(sharedInLeakingElementRow, {maxPixelsFromLeft: 10});
    const {frontend} = getBrowserAndPages();
    // Expand the data-grid for the shared list
    await frontend.keyboard.press('ArrowRight');

    // check that we found two V8EventListener objects
    await waitForFunction(async () => {
      const pendingActiviesChildren = await waitForElementsWithTextContent('V8EventListener');
      return pendingActiviesChildren.length === 2;
    });

    // Now we want to get the two rows below the "shared in leaking()" row and assert on them.
    // Unfortunately they are not structured in the data-grid as children, despite being children in the UI
    // So the best way to get at them is to grab the two subsequent siblings of the "shared in leaking()" row.
    const nextRow = await sharedInLeakingElementRow.evaluateHandle(e => e.nextSibling);
    if (!nextRow) {
      assert.fail('Could not find row below "shared in leaking()" row');
    }
    const nextNextRow = await nextRow!.evaluateHandle(e => e.nextSibling);
    if (!nextNextRow) {
      assert.fail('Could not find 2nd row below "shared in leaking()" row');
    }

    const childText = await Promise.all([nextRow, nextNextRow].map(async row => await row.evaluate(r => r.innerText)));

    assert.isTrue(childText[0].includes('inV8EventListener'));
    assert.isTrue(childText[1].includes('inEventListener'));
  });

  it('Shows the correct output for a detached iframe', async () => {
    await goToResource('memory/detached-iframe.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Leak');
    await waitForSearchResultNumber(8);
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.some(({retainerClassName}) => retainerClassName === 'Detached Window'));
  });
});
