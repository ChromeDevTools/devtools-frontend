// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  assertNotNullOrUndefined,
  clickElement,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
  step,
  waitFor,
  waitForElementsWithTextContent,
  waitForElementWithTextContent,
  waitForFunction,
  waitForNoElementsWithTextContent,
} from '../../shared/helper.js';

import {
  changeAllocationSampleViewViaDropdown,
  changeViewViaDropdown,
  checkExposeInternals,
  clickOnContextMenuForRetainer,
  expandFocusedRow,
  findSearchResult,
  focusTableRow,
  getAddedCountFromComparisonRow,
  getCategoryRow,
  getCountFromCategoryRow,
  getDataGridRows,
  getDistanceFromCategoryRow,
  getSizesFromCategoryRow,
  getSizesFromSelectedRow,
  navigateToMemoryTab,
  restoreIgnoredRetainers,
  setClassFilter,
  setFilterDropdown,
  setSearchFilter,
  takeAllocationProfile,
  takeAllocationTimelineProfile,
  takeDetachedElementsProfile,
  takeHeapSnapshot,
  waitForNonEmptyHeapSnapshotData,
  waitForRetainerChain,
  waitForSearchResultNumber,
  waitUntilRetainerChainSatisfies,
} from '../helpers/memory-helpers.js';

describe('The Memory Panel', function() {
  // These tests render large chunks of data into DevTools and filter/search
  // through it. On bots with less CPU power, these can fail because the
  // rendering takes a long time, so we allow a much larger timeout.
  if (this.timeout() !== 0) {
    this.timeout(100000);
  }

  it('Loads content', async () => {
    await goToResource('memory/default.html');
    await navigateToMemoryTab();
  });

  // This test logs assertions to the console.
  it.skip('[crbug.com/347709947] Can take several heap snapshots ', async () => {
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
    await findSearchResult('leaking()');
    await waitForRetainerChain([
      'Detached V8EventListener',
      'Detached EventListener',
      'Detached InternalNode',
      'Detached InternalNode',
      'Detached <div>',
      'Retainer',
      'Window',
    ]);
  });

  it('Correctly retains the path for event listeners', async () => {
    await goToResource('memory/event-listeners.html');
    await step('taking a heap snapshot', async () => {
      await navigateToMemoryTab();
      await takeHeapSnapshot();
      await waitForNonEmptyHeapSnapshotData();
    });
    await step('searching for the event listener', async () => {
      await setSearchFilter('myEventListener');
      await waitForSearchResultNumber(4);
    });

    await step('selecting the search result that we need', async () => {
      await findSearchResult('myEventListener()');
    });

    await step('waiting for retainer chain', async () => {
      await waitForRetainerChain([
        'V8EventListener',
        'EventListener',
        'InternalNode',
        'InternalNode',
        '<body>',
      ]);
    });
  });

  it('Puts all ActiveDOMObjects with pending activities into one group', async () => {
    const {frontend} = getBrowserAndPages();
    await goToResource('memory/dom-objects.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    // The test ensures that the following structure is present:
    // Pending activities
    // -> Pending activities
    //    -> InternalNode
    //       -> MediaQueryList
    //       -> MediaQueryList
    await setSearchFilter('Pending activities');
    // Here and below we have to wait until the elements are actually created
    // and visible.
    await waitForFunction(async () => {
      const pendingActivitiesSpan = await waitFor('//span[text()="Pending activities"]', undefined, undefined, 'xpath');
      const pendingActiviesRow = await waitFor('ancestor-or-self::tr', pendingActivitiesSpan, undefined, 'xpath');
      try {
        await clickElement(pendingActivitiesSpan);
      } catch {
        return false;
      }
      const res = await pendingActiviesRow.evaluate(x => x.classList.toString());
      return res.includes('selected');
    });
    await frontend.keyboard.press('ArrowRight');
    const internalNodeSpan = await waitFor(
        '//span[text()="InternalNode"][ancestor-or-self::tr[preceding-sibling::*[1][//span[text()="Pending activities"]]]]',
        undefined, undefined, 'xpath');
    const internalNodeRow = await $('ancestor-or-self::tr', internalNodeSpan, 'xpath');
    await waitForFunction(async () => {
      await clickElement(internalNodeSpan);
      const res = await internalNodeRow.evaluate(x => x.classList.toString());
      return res.includes('selected');
    });
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
    await setSearchFilter('Detached <div>');
    await waitForSearchResultNumber(3);
  });

  it('Shows the correct output for an attached iframe', async () => {
    await goToResource('memory/attached-iframe.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('searchable string');
    await waitForSearchResultNumber(1);
    // The following line checks two things: That the property 'aUniqueName'
    // in the iframe is retaining the Retainer class object, and that the
    // iframe window is not detached.
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.some(
            ({propertyName, retainerClassName}) => propertyName === 'aUniqueName' && retainerClassName === 'Window'));
  });

  // Flaky on win and linux
  it.skip('[crbug.com/1363150] Correctly shows multiple retainer paths for an object', async () => {
    await goToResource('memory/multiple-retainers.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('leaking');
    await waitForSearchResultNumber(4);
    await findSearchResult('\"leaking\"');

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

    const textOfEl = await sharedInLeakingElementRow.evaluate(e => e.textContent || '');
    // Double check we got the right element to avoid a confusing text failure
    // later down the line.
    assert.isTrue(textOfEl.startsWith('sharedinleaking()'));

    // Have to click it not in the middle as the middle can hold the link to the
    // file in the sources pane and we want to avoid clicking that.
    await clickElement(sharedInLeakingElementRow /* TODO(crbug.com/1363150): {maxPixelsFromLeft: 10} */);
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
    const nextRow = (await sharedInLeakingElementRow.evaluateHandle(e => e.nextSibling)).asElement() as
        puppeteer.ElementHandle<HTMLElement>;
    if (!nextRow) {
      assert.fail('Could not find row below "shared in leaking()" row');
    }
    const nextNextRow =
        (await nextRow.evaluateHandle(e => e.nextSibling)).asElement() as puppeteer.ElementHandle<HTMLElement>;
    if (!nextNextRow) {
      assert.fail('Could not find 2nd row below "shared in leaking()" row');
    }

    const childText = await Promise.all([nextRow, nextNextRow].map(async row => await row.evaluate(r => r.innerText)));

    assert.isTrue(childText[0].includes('inV8EventListener'));
    assert.isTrue(childText[1].includes('inEventListener'));
  });

  // Flaky test causing build failures
  it.skip('[crbug.com/1239550] Shows the correct output for a detached iframe', async () => {
    await goToResource('memory/detached-iframe.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Leak');
    await waitForSearchResultNumber(8);
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.some(({retainerClassName}) => retainerClassName === 'Detached Window'));
  });

  it('Shows a tooltip', async () => {
    await goToResource('memory/detached-dom-tree.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Detached <div>');
    await waitForSearchResultNumber(3);
    await waitUntilRetainerChainSatisfies(retainerChain => {
      return retainerChain.length > 0 && retainerChain[0].propertyName === 'retaining_wrapper';
    });
    const rows = await getDataGridRows('.retaining-paths-view table.data');
    const propertyNameElement = await rows[0].$('span.property-name');
    propertyNameElement!.hover();
    const el = await waitFor('div.vbox.flex-auto.no-pointer-events');
    await waitFor('.source-code', el);

    await setSearchFilter('system / descriptorarray');
    await findSearchResult('system / DescriptorArray');
    const searchResultElement = await waitFor('.selected.data-grid-data-grid-node span.object-value-null');
    searchResultElement!.hover();
    await waitFor('.widget .object-popover-footer');
  });

  it('shows the list of a detached node', async () => {
    await goToResource('memory/detached-node.html');
    await navigateToMemoryTab();
    void takeDetachedElementsProfile();
    await waitFor('.detached-elements-view');
  });

  it('shows the flamechart for an allocation sample', async () => {
    await goToResource('memory/allocations.html');
    await navigateToMemoryTab();
    void takeAllocationProfile();
    void changeAllocationSampleViewViaDropdown('Chart');
    await waitFor('canvas.flame-chart-canvas');
  });

  it('shows allocations for an allocation timeline', async () => {
    await goToResource('memory/allocations.html');
    await navigateToMemoryTab();
    void takeAllocationTimelineProfile({recordStacks: true});
    await changeViewViaDropdown('Allocation');

    const header = await waitForElementWithTextContent('Live Count');
    const table = await header.evaluateHandle(node => {
      return node.closest('.data-grid');
    });
    await waitFor('.data-grid-data-grid-node', table);
  });

  it('does not show allocations perspective when stacks not recorded', async () => {
    await goToResource('memory/allocations.html');
    await navigateToMemoryTab();
    void takeAllocationTimelineProfile({recordStacks: false});
    const dropdown = await waitFor('select[aria-label="Perspective"]');
    await waitForNoElementsWithTextContent('Allocation', dropdown);
  });

  it('shows object source links in snapshot', async () => {
    const {target, frontend} = getBrowserAndPages();
    await target.evaluate(`
        class MyTestClass {
          constructor() {
            this.z = new Uint32Array(1e6);  // Pull the class to top.
            this.myFunction = () => 42;
          }
        };
        function* MyTestGenerator() {
          yield 1;
        }
        class MyTestClass2 {}
        window.myTestClass = new MyTestClass();
        window.myTestGenerator = MyTestGenerator();
        window.myTestClass2 = new MyTestClass2();
        //# sourceURL=my-test-script.js`);
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await setClassFilter('MyTest');
    await waitForNonEmptyHeapSnapshotData();

    const expectedEntries = [
      {constructor: 'MyTestClass', link: 'my-test-script.js:3'},
      {constructor: 'MyTestClass', prop: 'myFunction', link: 'my-test-script.js:5'},
      {constructor: 'MyTestGenerator', link: 'my-test-script.js:8'},
      {constructor: 'MyTestClass2', link: 'my-test-script.js:11'},
    ];

    const rows = await getDataGridRows('.data-grid');
    for (const entry of expectedEntries) {
      let row: puppeteer.ElementHandle<Element>|null = null;
      // Find the row with the desired constructor.
      for (const r of rows) {
        const constructorName = await waitForFunction(() => r.evaluate(e => e.firstChild?.textContent));
        if (entry.constructor === constructorName) {
          row = r;
          break;
        }
      }
      assertNotNullOrUndefined(row);
      // Expand the constructor sub-tree.
      await clickElement(row);
      await frontend.keyboard.press('ArrowRight');
      // Get the object subtree/child.
      const {objectElement, objectName} = await waitForFunction(async () => {
        const objectElement =
            await row?.evaluateHandle(e => e.nextSibling) as puppeteer.ElementHandle<HTMLElement>| null;
        const objectName = await objectElement?.evaluate(e => e.querySelector('.object-value-object')?.textContent);
        if (!objectName) {
          return undefined;
        }
        return {objectElement, objectName};
      });
      let element = objectElement;
      assertNotNullOrUndefined(element);
      // Verify we have the object with the matching name.
      assert.strictEqual(objectName, entry.constructor);
      // Get the right property of the object if required.
      if (entry.prop) {
        // Expand the object.
        await clickElement(element);
        await frontend.keyboard.press('ArrowRight');
        // Try to find the property.
        element = await waitForFunction(async () => {
          let row = element;
          while (row) {
            const nextRow = await row.evaluateHandle(e => e.nextSibling) as puppeteer.ElementHandle<HTMLElement>| null;
            if (!nextRow) {
              return undefined;
            }
            row = nextRow;
            const text = await row.evaluate(e => e.querySelector('.property-name')?.textContent);
            // If we did not find any text at all, then we saw all properties. Let us fail/retry here.
            if (!text) {
              return undefined;
            }
            // If we found the property, we are done.
            if (text === entry.prop) {
              return row;
            }
            // Continue looking for the property on the next row.
          }
          return undefined;
        });
        assertNotNullOrUndefined(element);
      }

      // Verify the link to the source code.
      const linkText =
          await waitForFunction(async () => element?.evaluate(e => e.querySelector('.devtools-link')?.textContent));
      assert.strictEqual(linkText, entry.link);
    }
  });

  async function runJSSetTest() {
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('Retainer');
    await waitForSearchResultNumber(4);
    await findSearchResult('Retainer()');
    await focusTableRow('Retainer()');
    await expandFocusedRow();
    await focusTableRow('customProperty');
    const sizesForSet = await getSizesFromSelectedRow();
    await expandFocusedRow();
    await focusTableRow('(internal array)[]');
    const sizesForBackingStorage = await getSizesFromSelectedRow();
    return {sizesForSet, sizesForBackingStorage};
  }

  it('Does not include backing store size in the shallow size of a JS Set', async () => {
    await goToResource('memory/set.html');
    await enableExperiment('show-option-tp-expose-internals-in-heap-snapshot');
    await navigateToMemoryTab();
    await checkExposeInternals();
    const sizes = await runJSSetTest();

    // The Set object is small, regardless of the contained content.
    assert.isTrue(sizes.sizesForSet.shallowSize <= 100);
    // The Set retains its backing storage.
    assert.isTrue(
        sizes.sizesForSet.retainedSize >= sizes.sizesForSet.shallowSize + sizes.sizesForBackingStorage.retainedSize);
    // The backing storage contains 100 items, which occupy at least one pointer per item.
    assert.isTrue(sizes.sizesForBackingStorage.shallowSize >= 400);
    // The backing storage retains 100 strings, which occupy at least 16 bytes each.
    assert.isTrue(sizes.sizesForBackingStorage.retainedSize >= sizes.sizesForBackingStorage.shallowSize + 1600);
  });

  it('Includes backing store size in the shallow size of a JS Set', async () => {
    await goToResource('memory/set.html');
    const sizes = await runJSSetTest();

    // The Set is reported as containing at least 100 pointers.
    assert.isTrue(sizes.sizesForSet.shallowSize >= 400);
    // The Set retains its backing storage.
    assert.isTrue(
        sizes.sizesForSet.retainedSize >= sizes.sizesForSet.shallowSize + sizes.sizesForBackingStorage.retainedSize);
    // The backing storage is reported as zero size.
    assert.strictEqual(sizes.sizesForBackingStorage.shallowSize, 0);
    // The backing storage retains 100 strings, which occupy at least 16 bytes each.
    assert.isTrue(sizes.sizesForBackingStorage.retainedSize >= 1600);
  });

  it('Computes distances and sizes for WeakMap values correctly', async () => {
    await goToResource('memory/weakmap.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setClassFilter('CustomClass');
    assert.strictEqual(5, await getDistanceFromCategoryRow('CustomClass1'));
    assert.strictEqual(6, await getDistanceFromCategoryRow('CustomClass2'));
    assert.strictEqual(2, await getDistanceFromCategoryRow('CustomClass3'));
    assert.strictEqual(8, await getDistanceFromCategoryRow('CustomClass4'));
    assert.isTrue((await getSizesFromCategoryRow('CustomClass1Key')).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass2Key')).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass3Key')).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass4Key')).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass4Retainer')).retainedSize >= 2 ** 15);
  });

  it('Allows ignoring retainers', async () => {
    await goToResource('memory/ignoring-retainers.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setSearchFilter('searchable_string');
    await waitForSearchResultNumber(2);
    await findSearchResult('"searchable_string"');
    await waitForRetainerChain(['{y}', 'KeyType', 'Window']);
    await clickOnContextMenuForRetainer('KeyType', 'Ignore this retainer');
    await waitForRetainerChain(['{y}', '{x}', 'Window']);
    await clickOnContextMenuForRetainer('x', 'Ignore this retainer');
    await waitForRetainerChain(['{y}', '(internal array)[]', 'WeakMap', 'Window']);
    await clickOnContextMenuForRetainer('(internal array)[]', 'Ignore this retainer');
    await waitForRetainerChain([
      '{y}',
      '{d}',
      `{${'#'.repeat(130)}, ...}`,
      '{b, irrelevantProperty, <symbol also irrelevant>, "}"}',
      '{a, extraProp0, extraProp1, extraProp2, extraProp3, ..., extraProp6, extraProp7, extraProp8, extraProp9}',
      'Window',
    ]);
    await clickOnContextMenuForRetainer('b', 'Ignore this retainer');
    await waitForRetainerChain(['(Internalized strings)', '(GC roots)']);
    await restoreIgnoredRetainers();
    await waitForRetainerChain(['{y}', 'KeyType', 'Window']);
  });

  it('Can filter the summary view', async () => {
    await goToResource('memory/filtering.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setFilterDropdown('Duplicated strings');
    await setSearchFilter('"duplicatedKey":"duplicatedValue"');
    await waitForSearchResultNumber(2);
    await setFilterDropdown('Objects retained by detached DOM nodes');
    await getCategoryRow('ObjectRetainedByDetachedDom');
    assert.isTrue(!(await getCategoryRow('ObjectRetainedByBothDetachedDomAndConsole', false)));
    await setFilterDropdown('Objects retained by DevTools Console');
    await getCategoryRow('ObjectRetainedByConsole');
    assert.isTrue(!(await getCategoryRow('ObjectRetainedByBothDetachedDomAndConsole', false)));
  });

  it('Groups HTML elements by tag name', async () => {
    await goToResource('memory/dom-details.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setClassFilter('<div>');
    assert.strictEqual(3, await getCountFromCategoryRow('<div>'));
    assert.strictEqual(3, await getCountFromCategoryRow('Detached <div>'));
    await setSearchFilter('Detached <div data-x="p" data-y="q">');
    await waitForSearchResultNumber(1);
  });

  it('Groups plain JS objects by interface', async () => {
    await goToResource('memory/diff.html');
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForNonEmptyHeapSnapshotData();
    await setClassFilter('{a, b, c, d, ');
    // Objects should be grouped by interface if there are at least two matching instances.
    assert.strictEqual(2, await getCountFromCategoryRow('{a, b, c, d, p, q, r}'));
    assert.isTrue(!(await getCategoryRow('{a, b, c, d, e}', /* wait:*/ false)));
    const {frontend, target} = await getBrowserAndPages();
    await target.bringToFront();
    await target.click('button#update');
    await frontend.bringToFront();
    await takeHeapSnapshot('Snapshot 2');
    await waitForNonEmptyHeapSnapshotData();
    await changeViewViaDropdown('Comparison');
    await setClassFilter('{a, b, c, d, ');
    // When comparing, the old snapshot is categorized according to the new one's interfaces,
    // so the comparison should report only one new object of the following type, not two.
    assert.strictEqual(1, await getAddedCountFromComparisonRow('{a, b, c, d, e}'));
    // Only one of these objects remains, so it's no longer a category.
    assert.isTrue(!(await getCategoryRow('{a, b, c, d, p, q, r}', /* wait:*/ false)));
  });
});
