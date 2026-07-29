// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  clearTextFilter,
  getAllRequestNames,
  navigateToNetworkTab,
  setCacheDisabled,
  setKeepLog,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 10;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

const RESULTS = [
  `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}/test/e2e/resources/network`,
  ...Array.from({length: SIMPLE_PAGE_REQUEST_NUMBER}, (_, i) => `image.svg?id=${i}/test/e2e/resources/network`),
];

async function elementTextContent(element: ElementHandle): Promise<string> {
  return await element.evaluate(node => node.textContent || '');
}

async function checkboxIsChecked(element: ElementHandle<HTMLInputElement>): Promise<boolean> {
  return await element.evaluate(node => node.checked);
}

async function openMoreFiltersDropdown(devToolsPage: DevToolsPage) {
  const filterDropdown = await devToolsPage.waitFor('[aria-label="Show only/hide requests dropdown"]');
  const filterButton = await devToolsPage.waitFor('.toolbar-button', filterDropdown);
  await filterButton.click();
  return filterButton;
}

async function getFilter(devToolsPage: DevToolsPage, label: string, root?: ElementHandle) {
  const filter = await devToolsPage.$textContent(label, root);

  assert.isOk(filter, `Could not find ${label} filter.`);
  return filter;
}

async function checkOpacityCheckmark(filter: ElementHandle, opacity: string) {
  const checkmarkOpacity = await filter.evaluate(element => {
    const checkmark = element.querySelector('.checkmark');
    if (checkmark) {
      return window.getComputedStyle(checkmark).getPropertyValue('opacity');
    }
    return '';
  });

  return checkmarkOpacity === opacity;
}

describe('The Network Tab', function() {
  // One of these tests reloads panels repeatedly, which can take a longer time.
  this.timeout(20_000);

  it('can filter by text in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('id=9');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 1);
    assert.strictEqual(await elementTextContent(nodes[0]), RESULTS[10]);
  });

  it('can match multiple requests by text in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('svg');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 10);
  });

  it('can filter by regex in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('/id=8/');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 1);
    assert.strictEqual(await elementTextContent(nodes[0]), RESULTS[9]);
  });

  it('can match multiple requests by regex in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('/.*/');
    let nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('/.*\\..*/');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('/.*\\.svg/');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 10);
  });

  it('can match no requests by regex in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('/NOTHINGTOMATCH/');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('//');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');
  });

  it('can filter by cache status in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'resources-from-cache.html');
    await setCacheDisabled(devToolsPage, false);
    await waitForSomeRequestsToAppear(devToolsPage, 3);
    await setKeepLog(devToolsPage, true);
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'resources-from-cache.html');
    await waitForSomeRequestsToAppear(devToolsPage, 6);

    await devToolsPage.typeText('-is:from-cache');
    let nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 3);
    assert.lengthOf(nodes, 3);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('is:from-cache');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 3);
    assert.lengthOf(nodes, 3);
  });

  it('require operator to filter by scheme', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('http');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await devToolsPage.typeText('s');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await devToolsPage.typeText('://');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('scheme:https');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);
  });

  it('can filter by domain without operator', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('localhost');
    let nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('domain:localhost');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);
  });

  it('can filter by partial URL in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText(`https://localhost:${inspectedPage.serverPort}`);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.isAtLeast(nodes.length, 11);
  });

  it('can reverse filter text in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('-id=7');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(8, 1);
    assert.isAtLeast(nodes.length, output.length);
  });

  it('can reverse filter regex in the log view', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    await devToolsPage.typeText('-/id=6/');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(7, 1);
    assert.isAtLeast(nodes.length, output.length);
  });

  it('can invert text filters', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
    await devToolsPage.typeText('id=5');
    await invertCheckbox.click();
    assert.isTrue(await checkboxIsChecked(invertCheckbox));
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(6, 1);
    assert.isAtLeast(nodes.length, output.length);
    // Cleanup
    await invertCheckbox.click();
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
  });

  it('can invert regex filters', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
    await devToolsPage.typeText('/id=4/');
    await invertCheckbox.click();
    assert.isTrue(await checkboxIsChecked(invertCheckbox));
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(5, 1);
    assert.isAtLeast(nodes.length, output.length);
    // Cleanup
    await invertCheckbox.click();
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
  });

  it('can invert negated text filters', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
    await devToolsPage.typeText('-num=10');
    await invertCheckbox.click();
    assert.isTrue(await checkboxIsChecked(invertCheckbox));
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 1);
    assert.strictEqual(await elementTextContent(nodes[0]), RESULTS[0]);
    // Cleanup
    await invertCheckbox.click();
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
  });

  it('can invert negated regex filters', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
    await devToolsPage.typeText('-/num=10/');
    await invertCheckbox.click();
    assert.isTrue(await checkboxIsChecked(invertCheckbox));
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    assert.lengthOf(nodes, 1);
    assert.strictEqual(await elementTextContent(nodes[0]), RESULTS[0]);
    // Cleanup
    await invertCheckbox.click();
    assert.isFalse(await checkboxIsChecked(invertCheckbox));
  });

  it('can persist the invert checkbox', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);
    // Start with invert disabled, then enable it.
    {
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      assert.isFalse(await checkboxIsChecked(invertCheckbox));
      await invertCheckbox.click();
      assert.isTrue(await checkboxIsChecked(invertCheckbox));
    }
    // Verify persistence when enabled.
    await devToolsPage.reloadWithParams({panel: 'network'});
    {
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      assert.isTrue(await checkboxIsChecked(invertCheckbox));
      await invertCheckbox.click();
      assert.isFalse(await checkboxIsChecked(invertCheckbox));
    }
    // Verify persistence when disabled.
    await devToolsPage.reloadWithParams({panel: 'network'});
    {
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      assert.isFalse(await checkboxIsChecked(invertCheckbox));
    }
  });
});

describe('The Network Tab', function() {
  it('can show only third-party requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'empty.html');
    await setCacheDisabled(devToolsPage, true);
    await setKeepLog(devToolsPage, false);

    await navigateToNetworkTab(devToolsPage, inspectedPage, 'third-party-resources.html');
    await waitForSomeRequestsToAppear(devToolsPage, 4);

    await openMoreFiltersDropdown(devToolsPage);

    const thirdPartyFilter = await getFilter(devToolsPage, '3rd-party requests');

    await thirdPartyFilter.click();
    assert.isTrue(await checkOpacityCheckmark(thirdPartyFilter, '1'));

    const names = await getAllRequestNames(devToolsPage);
    assert.lengthOf(names, 1);
    assert.deepEqual(names, ['image.svg'], 'The right request names should appear in the list');

    await thirdPartyFilter.click();
    assert.isTrue(await checkOpacityCheckmark(thirdPartyFilter, '0'));

    const names2 = await getAllRequestNames(devToolsPage);
    assert.lengthOf(names2, 4);
    assert.deepEqual(
        names2.sort(),
        [
          'favicon.ico',
          'third-party-resources.html',
          'image.svg',
          'hello.html',
        ].sort(),
        'The right request names should appear in the list');
  });
});
