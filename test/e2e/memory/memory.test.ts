// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  step,
} from '../../shared/helper.js';
import {
  changeAllocationSampleViewViaDropdown,
  changeViewViaDropdown,
  checkRetainerChainSatisfies,
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
} from '../helpers/memory-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function runJSSetTest(devToolsPage: DevToolsPage) {
  await navigateToMemoryTab(devToolsPage);
  await takeHeapSnapshot(devToolsPage, undefined);
  await waitForNonEmptyHeapSnapshotData(devToolsPage);
  await setSearchFilter(devToolsPage, 'Retainer');
  await waitForSearchResultNumber(devToolsPage, 4);
  await findSearchResult(devToolsPage, 'Retainer()', undefined);
  await focusTableRowWithName(devToolsPage, 'Retainer()');
  await expandFocusedRow(devToolsPage);
  await focusTableRowWithName(devToolsPage, 'customProperty');
  const sizesForSet = await getSizesFromSelectedRow(devToolsPage);
  await expandFocusedRow(devToolsPage);
  await focusTableRowWithName(devToolsPage, '(internal array)[]');
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
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await takeHeapSnapshot(devToolsPage, 'Snapshot 2');
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    const heapSnapShots = await devToolsPage.$$('.heap-snapshot-sidebar-tree-item');
    assert.lengthOf(heapSnapShots, 2);
  });

  it('Shows a DOM node and its JS wrapper as a single node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-node.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'leaking');
    await waitForSearchResultNumber(devToolsPage, 4);
    await findSearchResult(devToolsPage, 'leaking()', undefined);
    await waitForRetainerChain(devToolsPage, [
      'Detached V8EventListener',
      'Detached EventListener',
      'Detached InternalNode',
      'Detached InternalNode',
      'Detached InternalNode',
      'Detached <div>',
      'Retainer',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
  });

  it('Correctly retains the path for event listeners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/event-listeners.html');
    await step('taking a heap snapshot', async () => {
      await navigateToMemoryTab(devToolsPage);
      await takeHeapSnapshot(devToolsPage, undefined);
      await waitForNonEmptyHeapSnapshotData(devToolsPage);
    });
    await step('searching for the event listener', async () => {
      await setSearchFilter(devToolsPage, 'myEventListener');
      await waitForSearchResultNumber(devToolsPage, 4);
    });

    await step('selecting the search result that we need', async () => {
      await findSearchResult(devToolsPage, 'myEventListener()', undefined);
    });

    await step('waiting for retainer chain', async () => {
      await waitForRetainerChain(devToolsPage, [
        'V8EventListener',
        'EventListener',
        'InternalNode',
        'InternalNode',
        '<body>',
      ]);
    });
  });

  it('Puts all ActiveDOMObjects with pending activities into one group', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/dom-objects.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    // The test ensures that the following structure is present:
    // Pending activities
    // -> Pending activities
    //    -> InternalNode
    //       -> MediaQueryList
    //       -> MediaQueryList
    await setSearchFilter(devToolsPage, 'Pending activities');
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
        '//span[contains(text(), "blink::HeapVectorBacking")][ancestor-or-self::tr[preceding-sibling::*[1][//span[text()="Pending activities"]]]]',
        undefined, undefined, 'xpath');
    const internalNodeRow = (await devToolsPage.$('ancestor-or-self::tr', internalNodeSpan, 'xpath'))!;
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
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'Detached <div>');
    await waitForSearchResultNumber(devToolsPage, 3);
  });

  it('Shows the correct output for an attached iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/attached-iframe.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'searchable string');
    await waitForSearchResultNumber(devToolsPage, 1);
    // The following line checks two things: That the property 'aUniqueName'
    // in the iframe is retaining the Retainer class object, and that the
    // iframe window is not detached.
    await waitUntilRetainerChainSatisfies(
        devToolsPage,
        retainerChain => retainerChain.some(({propertyName, retainerClassName}) => propertyName === 'aUniqueName' &&
                                                retainerClassName === `Window [JSGlobalObject] / ://`));
  });

  it('Correctly shows multiple retainer paths for an object', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/multiple-retainers.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'leaking');
    await waitForSearchResultNumber(devToolsPage, 4);
    await findSearchResult(devToolsPage, '\"leaking\"', '1 of 4');

    await devToolsPage.waitForFunction(async () => {
      // Wait for all the rows of the data-grid to load.
      const retainerGridElements = await getDataGridRows(devToolsPage, '.retaining-paths-view table.data');
      return retainerGridElements.length === 114;
    });

    const sharedInLeakingElementRow = await devToolsPage.waitForFunction(async () => {
      const results = await getDataGridRows(devToolsPage, '.retaining-paths-view table.data');
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
    await devToolsPage.clickElement(sharedInLeakingElementRow /* TODO(crbug.com/1363150): {maxPixelsFromLeft: 10} */);
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

    const childText = await Promise.all([nextRow, nextNextRow].map(async row => await row.evaluate(r => r.innerText)));

    assert.isTrue(childText[0].includes('inV8EventListener'));
    assert.isTrue(childText[1].includes('inEventListener'));
  });

  it('Shows the correct output for a detached iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-iframe.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'Leak');
    await waitForSearchResultNumber(devToolsPage, 9);
    await waitUntilRetainerChainSatisfies(
        devToolsPage,
        retainerChain => retainerChain.some(({retainerClassName}) => retainerClassName === 'Detached Window'));
  });

  it('Shows a tooltip', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/detached-dom-tree.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'Detached <div>');
    await waitForSearchResultNumber(devToolsPage, 3);
    await devToolsPage.waitForFunction(async () => {
      if (await checkRetainerChainSatisfies(devToolsPage, retainerChain => {
            return retainerChain.length > 0 && retainerChain[0].propertyName === 'retaining_wrapper';
          })) {
        return true;
      }
      await devToolsPage.click('[aria-label="Show next result"]');
      return false;
    });
    const rows = await getDataGridRows(devToolsPage, '.retaining-paths-view table.data');
    const propertyNameElement = await rows[0].$('span.property-name');
    await propertyNameElement!.hover();
    const el = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    await devToolsPage.waitFor('.source-code', el);

    await setSearchFilter(devToolsPage, 'system / descriptorarray');
    // Explicitly wait for the search to complete and results to be updated
    await devToolsPage.waitForFunction(async () => {
      const selectedRow = await devToolsPage.$('.data-grid-data-grid-node.selected');
      if (!selectedRow) {
        return false;
      }
      const text = await selectedRow.evaluate(el => el.textContent);
      return text?.includes('system / DescriptorArray');
    });
    // Find the first one as these are system
    await findSearchResult(devToolsPage, 'system / DescriptorArray', /1 of/);
    await devToolsPage.hover('.selected.data-grid-data-grid-node span.object-value-null');
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
    void changeAllocationSampleViewViaDropdown(devToolsPage, 'Chart');
    await devToolsPage.waitFor('canvas.flame-chart-canvas');
  });

  it('shows allocations for an allocation timeline', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/allocations.html');
    await navigateToMemoryTab(devToolsPage);
    void takeAllocationTimelineProfile(devToolsPage, {recordStacks: true});
    await changeViewViaDropdown(devToolsPage, 'Allocation');

    const header = await devToolsPage.waitForElementWithTextContent('Live count');
    const table = await header.evaluateHandle(node => {
      return node.closest('.data-grid')!;
    });
    await devToolsPage.waitFor('.data-grid-data-grid-node', table);
  });

  it('does not show allocations perspective when stacks not recorded', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/allocations.html');
    await navigateToMemoryTab(devToolsPage);
    void takeAllocationTimelineProfile(devToolsPage, {recordStacks: false});
    const dropdown = await devToolsPage.waitFor('select[aria-label="Perspective"]');
    await devToolsPage.waitForNoElementsWithTextContent('Allocation', dropdown);
  });

  it('enables the sampling timeline checkbox only when allocation sampling is selected',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('memory/allocations.html');
       await navigateToMemoryTab(devToolsPage);

       const input = await devToolsPage.waitFor('input[title="Sampling heap profiler timeline"]');
       assert.isNotNull(input, 'Input not found');

       const isDisabled = await input.evaluate(el => (el as HTMLInputElement).disabled);
       assert.isTrue(isDisabled, 'Checkbox should be disabled by default');

       await devToolsPage.click('xpath///label[text()="Allocation sampling"]');

       await devToolsPage.waitForFunction(async () => !(await input.evaluate(el => (el as HTMLInputElement).disabled)));
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
    await takeHeapSnapshot(devToolsPage, undefined);
    await setClassFilter(devToolsPage, 'MyTest');
    await waitForNonEmptyHeapSnapshotData(devToolsPage);

    const expectedEntries = [
      {constructor: 'MyTestClass', link: 'my-test-script.js:3'},
      {constructor: 'MyTestClass', prop: 'myFunction', link: 'my-test-script.js:5'},
      {constructor: 'MyTestGenerator', link: 'my-test-script.js:8'},
      {constructor: 'MyTestClass2', link: 'my-test-script.js:11'},
    ];

    const rows = await getDataGridRows(devToolsPage, '.data-grid');
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

  it('Computes distances and sizes for WeakMap values correctly', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/weakmap.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter(devToolsPage, 'CustomClass');
    assert.strictEqual(8, await getDistanceFromCategoryRow(devToolsPage, 'CustomClass1'));
    assert.strictEqual(9, await getDistanceFromCategoryRow(devToolsPage, 'CustomClass2'));
    assert.strictEqual(5, await getDistanceFromCategoryRow(devToolsPage, 'CustomClass3'));
    assert.strictEqual(11, await getDistanceFromCategoryRow(devToolsPage, 'CustomClass4'));
    assert.isTrue((await getSizesFromCategoryRow(devToolsPage, 'CustomClass1Key')).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow(devToolsPage, 'CustomClass2Key')).retainedSize >= 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow(devToolsPage, 'CustomClass3Key')).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow(devToolsPage, 'CustomClass4Key')).retainedSize < 2 ** 15);
    assert.isTrue((await getSizesFromCategoryRow(devToolsPage, 'CustomClass4Retainer')).retainedSize >= 2 ** 15);
  });

  it('Allows ignoring retainers', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/ignoring-retainers.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setSearchFilter(devToolsPage, 'searchable_string');
    await waitForSearchResultNumber(devToolsPage, 2);
    await findSearchResult(devToolsPage, '"searchable_string"', '1 of 2');
    await waitForRetainerChain(devToolsPage, [
      '{y}',
      'KeyType',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
    await clickOnContextMenuForRetainer(devToolsPage, 'KeyType', 'Ignore this retainer');
    await waitForRetainerChain(devToolsPage, [
      '{y}',
      '{x}',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
    await clickOnContextMenuForRetainer(devToolsPage, 'x', 'Ignore this retainer');
    await waitForRetainerChain(devToolsPage, [
      '{y}',
      '(internal array)[]',
      'WeakMap',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
    await clickOnContextMenuForRetainer(devToolsPage, '(internal array)[]', 'Ignore this retainer');
    await waitForRetainerChain(devToolsPage, [
      '{y}',
      '{d}',
      `{${'#'.repeat(130)}, …}`,
      '{b, irrelevantProperty, <symbol also irrelevant>, "}"}',
      '{a, extraProp0, extraProp1, extraProp2, extraProp3, …, extraProp6, extraProp7, extraProp8, extraProp9}',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
    await clickOnContextMenuForRetainer(devToolsPage, 'b', 'Ignore this retainer');
    await restoreIgnoredRetainers(devToolsPage);
    await waitForRetainerChain(devToolsPage, [
      '{y}',
      'KeyType',
      `Window [JSGlobalObject] / localhost:${inspectedPage.serverPort}`,
      `system / NativeContext / https://localhost:${inspectedPage.serverPort}`,
    ]);
  });

  it('Can filter the summary view', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/filtering.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setFilterDropdown(devToolsPage, 'Duplicated strings');
    await setSearchFilter(devToolsPage, '"duplicatedKey":"duplicatedValue"');
    await waitForSearchResultNumber(devToolsPage, 2);
    await setFilterDropdown(devToolsPage, 'Objects retained by detached DOM nodes');
    await getCategoryRow(devToolsPage, 'ObjectRetainedByDetachedDom', undefined);
    assert.isNotOk(await getCategoryRow(devToolsPage, 'ObjectRetainedByBothDetachedDomAndConsole', false));
    await setFilterDropdown(devToolsPage, 'Objects retained by DevTools Console');
    await getCategoryRow(devToolsPage, 'ObjectRetainedByConsole', undefined);
    assert.isNotOk(await getCategoryRow(devToolsPage, 'ObjectRetainedByBothDetachedDomAndConsole', false));
    await setFilterDropdown(devToolsPage, 'Objects retained by event handlers');
    await getCategoryRow(devToolsPage, 'ObjectRetainedByEventHandler', undefined);
    assert.isNotOk(await getCategoryRow(devToolsPage, 'ObjectRetainedByConsole', false));
    assert.isNotOk(await getCategoryRow(devToolsPage, 'ObjectRetainedByDetachedDom', false));
    const functionCategoryRow = await getCategoryRow(devToolsPage, 'Function', undefined);
    await focusTableRow(devToolsPage, functionCategoryRow);
    await expandFocusedRow(devToolsPage);
    await focusTableRowWithName(devToolsPage, 'handleEventForTest()');
  });

  it('Groups HTML elements by tag name', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/dom-details.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter(devToolsPage, '<div>');
    assert.strictEqual(3, await getCountFromCategoryRowWithName(devToolsPage, '<div>'));
    assert.strictEqual(3, await getCountFromCategoryRowWithName(devToolsPage, 'Detached <div>'));
    await setSearchFilter(devToolsPage, 'Detached <div data-x="p" data-y="q">');
    await waitForSearchResultNumber(devToolsPage, 1);
  });

  it('Groups plain JS objects by interface', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/diff.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await setClassFilter(devToolsPage, '{a, b, c, d, ');
    // Objects should be grouped by interface if there are at least two matching instances.
    assert.strictEqual(2, await getCountFromCategoryRowWithName(devToolsPage, '{a, b, c, d, p, q, r}'));
    assert.isNotOk(await getCategoryRow(devToolsPage, '{a, b, c, d, e}', /* wait:*/ false));
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('button#update');
    await devToolsPage.bringToFront();
    await takeHeapSnapshot(devToolsPage, 'Snapshot 2');
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await changeViewViaDropdown(devToolsPage, 'Comparison');
    await setClassFilter(devToolsPage, '{a, b, c, d, ');
    // When comparing, the old snapshot is categorized according to the new one's interfaces,
    // so the comparison should report only one new object of the following type, not two.
    assert.strictEqual(1, await getAddedCountFromComparisonRowWithName(devToolsPage, '{a, b, c, d, e}'));
    // Only one of these objects remains, so it's no longer a category.
    assert.isNotOk(await getCategoryRow(devToolsPage, '{a, b, c, d, p, q, r}', /* wait:*/ false));
  });

  it('Groups objects by constructor location', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/duplicated-names.html');
    await navigateToMemoryTab(devToolsPage);
    await takeHeapSnapshot(devToolsPage, undefined);
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    // TODO: filtering does not work while UI is rendering snapshot.
    await devToolsPage.drainTaskQueue();
    await setClassFilter(devToolsPage, 'DuplicatedClassName');
    let rows = await devToolsPage.waitForMany('tr.data-grid-data-grid-node', 3);
    assert.strictEqual(30, await getCountFromCategoryRow(devToolsPage, rows[0]));
    assert.strictEqual(3, await getCountFromCategoryRow(devToolsPage, rows[1]));
    assert.strictEqual(2, await getCountFromCategoryRow(devToolsPage, rows[2]));
    await focusTableRow(devToolsPage, rows[0]);
    await expandFocusedRow(devToolsPage);
    // TODO: pressing arrowDown does not work while UI is rendering.
    await devToolsPage.drainTaskQueue();
    await devToolsPage.drainTaskQueue();
    await devToolsPage.page.keyboard.press('ArrowDown');
    await clickOnContextMenuForRetainer(devToolsPage, 'x', 'Reveal in summary view');
    await waitUntilRetainerChainSatisfies(
        devToolsPage, retainerChain => retainerChain.length > 0 && retainerChain[0].propertyName === 'a');
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('button#update');
    await devToolsPage.bringToFront();
    await takeHeapSnapshot(devToolsPage, 'Snapshot 2');
    await waitForNonEmptyHeapSnapshotData(devToolsPage);
    await changeViewViaDropdown(devToolsPage, 'Comparison');
    await setClassFilter(devToolsPage, 'DuplicatedClassName');
    rows = await devToolsPage.waitForMany('tr.data-grid-data-grid-node', 3);
    assert.strictEqual(5, await getAddedCountFromComparisonRow(devToolsPage, rows[0]));
    assert.strictEqual(1, await getRemovedCountFromComparisonRow(devToolsPage, rows[0]));
    assert.strictEqual(1, await getAddedCountFromComparisonRow(devToolsPage, rows[1]));
    assert.strictEqual(10, await getRemovedCountFromComparisonRow(devToolsPage, rows[1]));
    assert.strictEqual(0, await getAddedCountFromComparisonRow(devToolsPage, rows[2]));
    assert.strictEqual(2, await getRemovedCountFromComparisonRow(devToolsPage, rows[2]));
  });
});

describe('The Memory Panel', () => {
  setup({dockingMode: 'undocked'});

  it('Does not include backing store size in the shallow size of a JS Set', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('memory/set.html');
    await navigateToMemoryTab(devToolsPage);
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

  it('Does not crash when resolving heap snapshot object to a JS object on DOM wrapper boilerplate',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('memory/default.html');
       await navigateToMemoryTab(devToolsPage);
       await inspectedPage.evaluate(`document.body.fieldOnDomWrapper = 2012;`);
       await takeHeapSnapshot(devToolsPage, undefined);
       await waitForNonEmptyHeapSnapshotData(devToolsPage);
       await setClassFilter(devToolsPage, 'HTMLBodyElement');

       const row = await getCategoryRow(devToolsPage, 'HTMLBodyElement', undefined);
       assert.isOk(row, 'HTMLBodyElement row not found in UI');

       const count = await getCountFromCategoryRow(devToolsPage, row);
       assert.isAbove(count, 0, 'Should have found at least one HTMLBodyElement');

       // Expand the row to make sure we can see instances without crashing
       await focusTableRow(devToolsPage, row);
       await expandFocusedRow(devToolsPage);
     });
});
