// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  changeAllocationSampleViewViaDropdown,
  changeViewViaDropdown,
  checkExposeInternals,
  clickOnContextMenuForRetainer,
  expandFocusedRow,
  findSearchResult,
  focusTableRow,
  focusTableRowWithName,
  getAddedCountFromComparisonRow,
  getAddedCountFromComparisonRowWithName,
  getCategoryRow,
  getCountFromCategoryRow,
  getCountFromCategoryRowWithName,
  getDataGridRows,
  getDistanceFromCategoryRow,
  getRemovedCountFromComparisonRow,
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
} from '../../e2e/helpers/memory-helpers.js';
import {
  step,
} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function runJSSetTest(devToolsPage: DevToolsPage) {
  await navigateToMemoryTab(devToolsPage);
  await takeHeapSnapshot(undefined, devToolsPage);
  await waitForNonEmptyHeapSnapshotData(devToolsPage);
  await setSearchFilter('Retainer', devToolsPage);
  await waitForSearchResultNumber(4, devToolsPage);
  await findSearchResult('Retainer()', undefined, devToolsPage);
  await focusTableRowWithName('Retainer()', devToolsPage);
  await expandFocusedRow(devToolsPage);
  await focusTableRowWithName('customProperty', devToolsPage);
  const sizesForSet = await getSizesFromSelectedRow(devToolsPage);
  await expandFocusedRow(devToolsPage);
  await focusTableRowWithName('(internal array)[]', devToolsPage);
  const sizesForBackingStorage = await getSizesFromSelectedRow(devToolsPage);
  return {sizesForSet, sizesForBackingStorage};
}

describe('The Memory Panel', function() {
  // These tests render large chunks of data into DevTools and filter/search
  // through it. On bots with less CPU power, these can fail because the
  // rendering takes a long time, so we allow a much larger timeout.
  if (this.timeout() !== 0) {
    this.timeout(30_000);
  }

  setup({dockingMode: 'undocked'});

  it('Loads content', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/default.html');
    await navigateToMemoryTab(devToolsPage);
  });

  it('Can take several heap snapshots ', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/default.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await takeHeapSnapshot('Snapshot 2', devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    const heapSnapShots = await devToolsPage.$$('.heap-snapshot-sidebar-tree-item');
    assert.lengthOf(heapSnapShots, 2);
  });

  it('Shows a DOM node and its JS wrapper as a single node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-node.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter('leaking', devToolsPage);
    await waitForSearchResultNumber(4, devToolsPage);
    await findSearchResult('leaking()', undefined, devToolsPage);
    await waitForRetainerChain(
        [
          'Detached V8EventListener', 'Detached EventListener', 'Detached InternalNode', 'Detached InternalNode',
          'Detached InternalNode', 'Detached <div>', 'Retainer',
          `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`
        ],
        devToolsPage);
  });

  it('Correctly retains the path for event listeners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/event-listeners.html');
    await step('taking a heap snapshot', async () => {
      await navigateToMemoryTab(devToolsPage);
      await takeHeapSnapshot(undefined, devToolsPage);
      await waitForNonEmptyHeapSnapshotData(devToolsPage);
    });
    await step('searching for the event listener', async () => {
      await setSearchFilter('myEventListener', devToolsPage);
      await waitForSearchResultNumber(4, devToolsPage);
    });

    await step('selecting the search result that we need', async () => {
      await findSearchResult('myEventListener()', undefined, devToolsPage);
    });

    await step('waiting for retainer chain', async () => {
      await waitForRetainerChain(
          [
            'V8EventListener',
            'EventListener',
            'InternalNode',
            'InternalNode',
            '<body>',
          ],
          devToolsPage);
    });
  });

  it('Puts all ActiveDOMObjects with pending activities into one group', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/dom-objects.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    // The test ensures that the following structure is present:
    // Pending activities
    // -> Pending activities
    //    -> InternalNode
    //       -> MediaQueryList
    //       -> MediaQueryList
    await setSearchFilter('Pending activities', devToolsPage);
    // Here and below we have to wait until the elements are actually created
    // and visible.
    await devToolsPage.waitForFunction(async () => {
      const pendingActivitiesSpan =
          await devToolsPage.waitFor('//span[text()="Pending activities"]', undefined, undefined, 'xpath');
      const pendingActivitiesRow =
          await devToolsPage.waitFor('ancestor-or-self::tr', pendingActivitiesSpan, undefined, 'xpath');
      try {
        await devToolsPage.clickElement(pendingActivitiesSpan);
      } catch {
        return false;
      }
      const res = await pendingActivitiesRow.evaluate(x => x.classList.toString());
      return res.includes('selected');
    });
    await devToolsPage.page.keyboard.press('ArrowRight');
    const internalNodeSpan = await devToolsPage.waitFor(
        '//span[text()="InternalNode"][ancestor-or-self::tr[preceding-sibling::*[1][//span[text()="Pending activities"]]]]',
        undefined, undefined, 'xpath');
    const internalNodeRow = await devToolsPage.$('ancestor-or-self::tr', internalNodeSpan, 'xpath');
    await devToolsPage.waitForFunction(async () => {
      await devToolsPage.clickElement(internalNodeSpan);
      const res = await internalNodeRow.evaluate(x => x.classList.toString());
      return res.includes('selected');
    });
    await devToolsPage.page.keyboard.press('ArrowRight');
    await devToolsPage.waitForFunction(async () => {
      const pendingActivitiesChildren = await devToolsPage.waitForElementsWithTextContent('MediaQueryList');
      return pendingActivitiesChildren.length === 2;
    });
  });

  it('Shows the correct number of divs for a detached DOM tree correctly', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-dom-tree.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter('Detached <div>', devToolsPage);
    await waitForSearchResultNumber(3, devToolsPage);
  });

  it('Shows the correct output for an attached iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/attached-iframe.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter('searchable string', devToolsPage);
    await waitForSearchResultNumber(1, devToolsPage);
    // The following line checks two things: That the property 'aUniqueName'
    // in the iframe is retaining the Retainer class object, and that the
    // iframe window is not detached.
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.some(
            ({propertyName, retainerClassName}) =>
                propertyName === 'aUniqueName' && retainerClassName === `Window (global*) / ://`),
        devToolsPage);
  });

  // Flaky on win and linux
  it.skip(
      '[crbug.com/40238574] Correctly shows multiple retainer paths for an object',
      async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.goToResource('memory/multiple-retainers.html');
        await navigateToMemoryTab(devToolsPage);
        await takeHeapSnapshot(undefined, devToolsPage);
        await waitForNonEmptyHeapSnapshotData(devToolsPage);
        await setSearchFilter('leaking', devToolsPage);
        await waitForSearchResultNumber(4, devToolsPage);
        await findSearchResult('\"leaking\"', undefined, devToolsPage);

        await devToolsPage.waitForFunction(async () => {
          // Wait for all the rows of the data-grid to load.
          const retainerGridElements = await getDataGridRows('.retaining-paths-view table.data', devToolsPage);
          return retainerGridElements.length === 9;
        });

        const sharedInLeakingElementRow = await devToolsPage.waitForFunction(async () => {
          const results = await getDataGridRows('.retaining-paths-view table.data', devToolsPage);
          const findPromises = await Promise.all(results.map(async e => {
            const textContent = await e.evaluate(el => el.textContent);
            // Can't search for "shared in leaking()" because the different parts are spaced with CSS.
            return textContent?.startsWith('sharedinleaking()') ? e : null;
          }));
          return findPromises.find(result => result !== null);
        });

        assert.isOk(sharedInLeakingElementRow, 'Could not find data-grid row with "shared in leaking()" text.');

        const textOfEl = await sharedInLeakingElementRow.evaluate(e => e.textContent || '');
        // Double check we got the right element to avoid a confusing text failure
        // later down the line.
        assert.isTrue(textOfEl.startsWith('sharedinleaking()'));

        // Have to click it not in the middle as the middle can hold the link to the
        // file in the sources pane and we want to avoid clicking that.
        await devToolsPage.clickElement(
            sharedInLeakingElementRow /* TODO(crbug.com/1363150): {maxPixelsFromLeft: 10} */);
        // Expand the data-grid for the shared list
        await devToolsPage.page.keyboard.press('ArrowRight');

        // check that we found two V8EventListener objects
        await devToolsPage.waitForFunction(async () => {
          const pendingActivitiesChildren = await devToolsPage.waitForElementsWithTextContent('V8EventListener');
          return pendingActivitiesChildren.length === 2;
        });

        // Now we want to get the two rows below the "shared in leaking()" row and assert on them.
        // Unfortunately they are not structured in the data-grid as children, despite being children in the UI
        // So the best way to get at them is to grab the two subsequent siblings of the "shared in leaking()" row.
        const nextRow = (await sharedInLeakingElementRow.evaluateHandle(e => e.nextSibling)).asElement() as
            puppeteer.ElementHandle<HTMLElement>;
        assert.isOk(nextRow, 'Could not find row below "shared in leaking()" row');
        const nextNextRow =
            (await nextRow.evaluateHandle(e => e.nextSibling)).asElement() as puppeteer.ElementHandle<HTMLElement>;
        assert.isOk(nextNextRow, 'Could not find 2nd row below "shared in leaking()" row');

        const childText =
            await Promise.all([nextRow, nextNextRow].map(async row => await row.evaluate(r => r.innerText)));

        assert.isTrue(childText[0].includes('inV8EventListener'));
        assert.isTrue(childText[1].includes('inEventListener'));
      });

  // Flaky test causing build failures
  it.skip(
      '[crbug.com/40193901] Shows the correct output for a detached iframe', async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.goToResource('memory/detached-iframe.html');
        await navigateToMemoryTab(devToolsPage);
        await takeHeapSnapshot(undefined, devToolsPage);
        await waitForNonEmptyHeapSnapshotData(devToolsPage);
        await setSearchFilter('Leak', devToolsPage);
        await waitForSearchResultNumber(8, devToolsPage);
        await waitUntilRetainerChainSatisfies(
            retainerChain => retainerChain.some(({retainerClassName}) => retainerClassName === 'Detached Window'),
            devToolsPage,
        );
      });

  it('Shows a tooltip', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-dom-tree.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter('Detached <div>', devToolsPage);
    await waitForSearchResultNumber(3, devToolsPage);
    await waitUntilRetainerChainSatisfies(retainerChain => {
      return retainerChain.length > 0 && retainerChain[0].propertyName === 'retaining_wrapper';
    }, devToolsPage);
    const rows = await getDataGridRows('.retaining-paths-view table.data', devToolsPage);
    const propertyNameElement = await rows[0].$('span.property-name');
    await propertyNameElement!.hover();
    const el = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    await devToolsPage.waitFor('.source-code', el);

    await setSearchFilter('system / descriptorarray', devToolsPage);
    await findSearchResult('system / DescriptorArray', undefined, devToolsPage);
    const searchResultElement = await devToolsPage.waitFor('.selected.data-grid-data-grid-node span.object-value-null');
    await searchResultElement!.hover();
    await devToolsPage.waitFor('.widget .object-popover-footer');
  });

  it('shows the list of a detached node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-node.html');
    await navigateToMemoryTab(devToolsPage);
    void takeDetachedElementsProfile(devToolsPage);
    await devToolsPage.waitFor('.detached-elements-view');
  });

  it('shows the flamechart for an allocation sample', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/allocations.html');
    await navigateToMemoryTab(devToolsPage);
    void takeAllocationProfile(devToolsPage);
    void changeAllocationSampleViewViaDropdown('Chart', devToolsPage);
    await devToolsPage.waitFor('canvas.flame-chart-canvas');
  });

  it('shows allocations for an allocation timeline', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/allocations.html');
    await navigateToMemoryTab(devToolsPage);
    void takeAllocationTimelineProfile({recordStacks: true}, devToolsPage);
    await changeViewViaDropdown('Allocation', devToolsPage);

    const header = await devToolsPage.waitForElementWithTextContent('Live Count');
    const table = await header.evaluateHandle(node => {
      return node.closest('.data-grid')!;
    });
    await devToolsPage.waitFor('.data-grid-data-grid-node', table);
  });

  it('does not show allocations perspective when stacks not recorded', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/allocations.html');
    await navigateToMemoryTab(devToolsPage);
    void takeAllocationTimelineProfile({recordStacks: false}, devToolsPage);
    const dropdown = await devToolsPage.waitFor('select[aria-label="Perspective"]');
    await devToolsPage.waitForNoElementsWithTextContent('Allocation', dropdown);
  });

  it('shows object source links in snapshot', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.evaluate(`
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
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await setClassFilter('MyTest', devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);

    const expectedEntries = [
      {constructor: 'MyTestClass', link: 'my-test-script.js:3'},
      {constructor: 'MyTestClass', prop: 'myFunction', link: 'my-test-script.js:5'},
      {constructor: 'MyTestGenerator', link: 'my-test-script.js:8'},
      {constructor: 'MyTestClass2', link: 'my-test-script.js:11'},
    ];

    const rows = await getDataGridRows('.data-grid', devToolsPage);
    for (const entry of expectedEntries) {
      let row: puppeteer.ElementHandle<Element>|null = null;
      // Find the row with the desired constructor.
      for (const r of rows) {
        const constructorName = await devToolsPage.waitForFunction(() => r.evaluate(e => e.firstChild?.textContent));
        if (entry.constructor === constructorName) {
          row = r;
          break;
        }
      }
      assert.isOk(row);
      // Expand the constructor sub-tree.
      await devToolsPage.clickElement(row);
      await devToolsPage.page.keyboard.press('ArrowRight');
      // Get the object subtree/child.
      const {objectElement, objectName} = await devToolsPage.waitForFunction(async () => {
        const objectElement =
            await row?.evaluateHandle(e => e.nextSibling) as puppeteer.ElementHandle<HTMLElement>| null;
        const objectName = await objectElement?.evaluate(e => e.querySelector('.object-value-object')?.textContent);
        if (!objectName) {
          return undefined;
        }
        return {objectElement, objectName};
      });
      let element = objectElement;
      assert.isOk(element);
      // Verify we have the object with the matching name.
      assert.strictEqual(objectName, entry.constructor);
      // Get the right property of the object if required.
      if (entry.prop) {
        // Expand the object.
        await devToolsPage.clickElement(element);
        await devToolsPage.page.keyboard.press('ArrowRight');
        // Try to find the property.
        element = await devToolsPage.waitForFunction(async () => {
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
        assert.isOk(element);
      }

      // Verify the link to the source code.
      const linkText = await devToolsPage.waitForFunction(
          async () => await element?.evaluate(e => e.querySelector('.devtools-link')?.textContent));
      assert.strictEqual(linkText, entry.link);
    }
  });

  it('Includes backing store size in the shallow size of a JS Set', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/set.html');
    const sizes = await runJSSetTest(devToolsPage);

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

  it('Computes distances and sizes for WeakMap values correctly', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/weakmap.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter('CustomClass', devToolsPage);
    assert.strictEqual(6, await getDistanceFromCategoryRow('CustomClass1', devToolsPage));
    assert.strictEqual(7, await getDistanceFromCategoryRow('CustomClass2', devToolsPage));
    assert.strictEqual(3, await getDistanceFromCategoryRow('CustomClass3', devToolsPage));
    assert.strictEqual(9, await getDistanceFromCategoryRow('CustomClass4', devToolsPage));
    assert.isTrue((await getSizesFromCategoryRow('CustomClass1Key', devToolsPage)).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass2Key', devToolsPage)).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass3Key', devToolsPage)).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass4Key', devToolsPage)).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow('CustomClass4Retainer', devToolsPage)).retainedSize >= 2 ** 15);
  });

  it('Allows ignoring retainers', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/ignoring-retainers.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter('searchable_string', devToolsPage);
    await waitForSearchResultNumber(2, devToolsPage);
    await findSearchResult('"searchable_string"', undefined, devToolsPage);
    await waitForRetainerChain(
        [
          '{y}', 'KeyType', `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`
        ],
        devToolsPage);
    await clickOnContextMenuForRetainer('KeyType', 'Ignore this retainer', devToolsPage);
    await waitForRetainerChain(
        [
          '{y}', '{x}', `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`
        ],
        devToolsPage);
    await clickOnContextMenuForRetainer('x', 'Ignore this retainer', devToolsPage);
    await waitForRetainerChain(
        [
          '{y}', '(internal array)[]', 'WeakMap', `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`
        ],
        devToolsPage);
    await clickOnContextMenuForRetainer('(internal array)[]', 'Ignore this retainer', devToolsPage);
    await waitForRetainerChain(
        [
          '{y}',
          '{d}',
          `{${'#'.repeat(130)}, …}`,
          '{b, irrelevantProperty, <symbol also irrelevant>, "}"}',
          '{a, extraProp0, extraProp1, extraProp2, extraProp3, …, extraProp6, extraProp7, extraProp8, extraProp9}',
          `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
        ],
        devToolsPage);
    await clickOnContextMenuForRetainer('b', 'Ignore this retainer', devToolsPage);
    await waitForRetainerChain(['(Internalized strings)', '(GC roots)'], devToolsPage);
    await restoreIgnoredRetainers(devToolsPage);
    await waitForRetainerChain(
        [
          '{y}', 'KeyType', `Window (global*) / localhost:${inspectedPage.serverPort}`,
          `system / NativeContext / https://localhost:${inspectedPage.serverPort}`
        ],
        devToolsPage);
  });

  it('Can filter the summary view', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/filtering.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setFilterDropdown('Duplicated strings', devToolsPage);
    await setSearchFilter('"duplicatedKey":"duplicatedValue"', devToolsPage);
    await waitForSearchResultNumber(2, devToolsPage);
    await setFilterDropdown('Objects retained by detached DOM nodes', devToolsPage);
    await getCategoryRow('ObjectRetainedByDetachedDom', undefined, devToolsPage);
    assert.isNotOk(await getCategoryRow('ObjectRetainedByBothDetachedDomAndConsole', false, devToolsPage));
    await setFilterDropdown('Objects retained by DevTools Console', devToolsPage);
    await getCategoryRow('ObjectRetainedByConsole', undefined, devToolsPage);
    assert.isNotOk(await getCategoryRow('ObjectRetainedByBothDetachedDomAndConsole', false, devToolsPage));
  });

  it('Groups HTML elements by tag name', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/dom-details.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter('<div>', devToolsPage);
    assert.strictEqual(3, await getCountFromCategoryRowWithName('<div>', devToolsPage));
    assert.strictEqual(3, await getCountFromCategoryRowWithName('Detached <div>', devToolsPage));
    await setSearchFilter('Detached <div data-x="p" data-y="q">', devToolsPage);
    await waitForSearchResultNumber(1, devToolsPage);
  });

  it('Groups plain JS objects by interface', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/diff.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter('{a, b, c, d, ', devToolsPage);
    // Objects should be grouped by interface if there are at least two matching instances.
    assert.strictEqual(2, await getCountFromCategoryRowWithName('{a, b, c, d, p, q, r}', devToolsPage));
    assert.isNotOk(await getCategoryRow('{a, b, c, d, e}', /* wait:*/ false, devToolsPage));
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('button#update');
    await devToolsPage.bringToFront();
    await takeHeapSnapshot('Snapshot 2', devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await changeViewViaDropdown('Comparison', devToolsPage);
    await setClassFilter('{a, b, c, d, ', devToolsPage);
    // When comparing, the old snapshot is categorized according to the new one's interfaces,
    // so the comparison should report only one new object of the following type, not two.
    assert.strictEqual(1, await getAddedCountFromComparisonRowWithName('{a, b, c, d, e}', devToolsPage));
    // Only one of these objects remains, so it's no longer a category.
    assert.isNotOk(await getCategoryRow('{a, b, c, d, p, q, r}', /* wait:*/ false, devToolsPage));
  });

  it('Groups objects by constructor location', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/duplicated-names.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(undefined, devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    // TODO: filtering does not work while UI is rendering snapshot.
    await devToolsPage.drainTaskQueue();
    await setClassFilter('DuplicatedClassName', devToolsPage);
    let rows = await devToolsPage.waitForMany('tr.data-grid-data-grid-node', 3);
    assert.strictEqual(30, await getCountFromCategoryRow(rows[0], devToolsPage));
    assert.strictEqual(3, await getCountFromCategoryRow(rows[1], devToolsPage));
    assert.strictEqual(2, await getCountFromCategoryRow(rows[2], devToolsPage));
    await focusTableRow(rows[0], devToolsPage);
    await expandFocusedRow(devToolsPage);
    // TODO: pressing arrowDown does not work while UI is rendering.
    await devToolsPage.drainTaskQueue();
    await devToolsPage.drainTaskQueue();
    await devToolsPage.page.keyboard.press('ArrowDown');
    await clickOnContextMenuForRetainer('x', 'Reveal in Summary view', devToolsPage);
    await waitUntilRetainerChainSatisfies(
        retainerChain => retainerChain.length > 0 && retainerChain[0].propertyName === 'a', devToolsPage);
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('button#update');
    await devToolsPage.bringToFront();
    await takeHeapSnapshot('Snapshot 2', devToolsPage);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await changeViewViaDropdown('Comparison', devToolsPage);
    await setClassFilter('DuplicatedClassName', devToolsPage);
    rows = await devToolsPage.waitForMany('tr.data-grid-data-grid-node', 3);
    assert.strictEqual(5, await getAddedCountFromComparisonRow(rows[0], devToolsPage));
    assert.strictEqual(1, await getRemovedCountFromComparisonRow(rows[0], devToolsPage));
    assert.strictEqual(1, await getAddedCountFromComparisonRow(rows[1], devToolsPage));
    assert.strictEqual(10, await getRemovedCountFromComparisonRow(rows[1], devToolsPage));
    assert.strictEqual(0, await getAddedCountFromComparisonRow(rows[2], devToolsPage));
    assert.strictEqual(2, await getRemovedCountFromComparisonRow(rows[2], devToolsPage));
  });
});

describe('The Memory Panel with show-option-tp-expose-internals-in-heap-snapshot experiment', () => {
  setup({dockingMode: 'undocked', enabledDevToolsExperiments: ['show-option-tp-expose-internals-in-heap-snapshot']});

  it('Does not include backing store size in the shallow size of a JS Set', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/set.html');
    await navigateToMemoryTab(devToolsPage);
    await checkExposeInternals(devToolsPage);
    const sizes = await runJSSetTest(devToolsPage);

    // The Set object is small, regardless of the contained content.
    assert.isTrue(sizes.sizesForSet.shallowSize <= 100);
    // The Set retains its backing storage.
    // Note: 16 bytes is added to retainedSize to account for rounding present in the UI layer.
    assert.isTrue(
        sizes.sizesForSet.retainedSize + 16 >=
        sizes.sizesForSet.shallowSize + sizes.sizesForBackingStorage.retainedSize);
    // The backing storage contains 100 items, which occupy at least one pointer per item.
    assert.isTrue(sizes.sizesForBackingStorage.shallowSize >= 400);
    // TODO: the backing storage seems to be the same as the shallow size
    // going from Chrome 142.0.7421.0 to 142.0.7427.0.
    assert.isTrue(sizes.sizesForBackingStorage.retainedSize >= sizes.sizesForBackingStorage.shallowSize);
  });
});
