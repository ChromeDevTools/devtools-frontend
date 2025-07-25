// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert, expect} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {reloadDevTools} from '../../e2e/helpers/cross-tool-helper.js';
import {
  clearTextFilter,
  getAllRequestNames,
  navigateToNetworkTab,
  setCacheDisabled,
  setPersistLog,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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

  it('can filter by text in the log view', async ({devToolsPage, inspectedPage}: {
                                             devToolsPage: DevToolsPage,
                                             inspectedPage: InspectedPage,
                                           }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('9');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[10]);
  });

  it('can match multiple requests by text in the log view', async ({devToolsPage, inspectedPage}: {
                                                              devToolsPage: DevToolsPage,
                                                              inspectedPage: InspectedPage,
                                                            }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('svg');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(10);
  });

  it('can filter by regex in the log view', async ({devToolsPage, inspectedPage}: {
                                              devToolsPage: DevToolsPage,
                                              inspectedPage: InspectedPage,
                                            }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('/8/');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[9]);
  });

  it('can match multiple requests by regex in the log view', async ({devToolsPage, inspectedPage}: {
                                                               devToolsPage: DevToolsPage,
                                                               inspectedPage: InspectedPage,
                                                             }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('/.*/');
    let nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.be.greaterThanOrEqual(11);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('/.*\\..*/');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.be.greaterThanOrEqual(11);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('/.*\\.svg/');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(10);
  });

  it('can match no requests by regex in the log view', async ({devToolsPage, inspectedPage}: {
                                                         devToolsPage: DevToolsPage,
                                                         inspectedPage: InspectedPage,
                                                       }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('/NOTHINGTOMATCH/');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('//');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');
  });

  // Mac doesn't consistently respect force-cache
  // TODO(crbug.com/1412665): This test is flaky.
  it.skip('[crbug.com/40822085] can filter by cache status in the log view', async () => {
    const {devToolsPage, inspectedPage} = getBrowserAndPagesWrappers();
    await navigateToNetworkTab(
        `requests.html?num=5&cache=no-store&nocache=${Math.random()}`, devToolsPage, inspectedPage);
    await setPersistLog(true, devToolsPage);
    await navigateToNetworkTab(
        `requests.html?num=3&cache=force-cache&nocache=${Math.random()}`, devToolsPage, inspectedPage);
    await devToolsPage.typeText('-is:from-cache');
    let nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(7);

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('is:from-cache');
    nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(3);
    await setPersistLog(false, devToolsPage);
  });

  it('require operator to filter by scheme', async ({devToolsPage, inspectedPage}: {
                                               devToolsPage: DevToolsPage,
                                               inspectedPage: InspectedPage,
                                             }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('http');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await devToolsPage.typeText('s');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await devToolsPage.typeText('://');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('scheme:https');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.be.greaterThanOrEqual(11);
  });

  it('require operator to filter by domain', async ({devToolsPage, inspectedPage}: {
                                               devToolsPage: DevToolsPage,
                                               inspectedPage: InspectedPage,
                                             }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('localhost');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText('domain:localhost');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.be.greaterThanOrEqual(11);
  });

  it('can filter by partial URL in the log view', async ({devToolsPage, inspectedPage}: {
                                                    devToolsPage: DevToolsPage,
                                                    inspectedPage: InspectedPage,
                                                  }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await clearTextFilter(devToolsPage);
    await devToolsPage.typeText(`https://localhost:${inspectedPage.serverPort}`);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.be.greaterThanOrEqual(11);
  });

  it('can reverse filter text in the log view', async ({devToolsPage, inspectedPage}: {
                                                  devToolsPage: DevToolsPage,
                                                  inspectedPage: InspectedPage,
                                                }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('-7');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(8, 1);
    expect(nodes.length).to.be.greaterThanOrEqual(output.length);
  });

  it('can reverse filter regex in the log view', async ({devToolsPage, inspectedPage}: {
                                                   devToolsPage: DevToolsPage,
                                                   inspectedPage: InspectedPage,
                                                 }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await devToolsPage.typeText('-/6/');
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(7, 1);
    expect(nodes.length).to.be.greaterThanOrEqual(output.length);
  });

  it('can invert text filters', async ({devToolsPage, inspectedPage}: {
                                  devToolsPage: DevToolsPage,
                                  inspectedPage: InspectedPage,
                                }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await devToolsPage.typeText('5');
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(6, 1);
    expect(nodes.length).to.be.greaterThanOrEqual(output.length);
    // Cleanup
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert regex filters', async ({devToolsPage, inspectedPage}: {
                                   devToolsPage: DevToolsPage,
                                   inspectedPage: InspectedPage,
                                 }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await devToolsPage.typeText('/4/');
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(5, 1);
    expect(nodes.length).to.be.greaterThanOrEqual(output.length);
    // Cleanup
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert negated text filters', async ({devToolsPage, inspectedPage}: {
                                          devToolsPage: DevToolsPage,
                                          inspectedPage: InspectedPage,
                                        }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await devToolsPage.typeText('-10');
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[0]);
    // Cleanup
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert negated regex filters', async ({devToolsPage, inspectedPage}: {
                                           devToolsPage: DevToolsPage,
                                           inspectedPage: InspectedPage,
                                         }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await devToolsPage.typeText('-/10/');
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await devToolsPage.waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[0]);
    // Cleanup
    await invertCheckbox.click();
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  // TODO(crbug.com/1412665): This test is flaky.
  it.skip('[crbug.com/1412665] can persist the invert checkbox', async ({devToolsPage, inspectedPage}: {
                                                                   devToolsPage: DevToolsPage,
                                                                   inspectedPage: InspectedPage,
                                                                 }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    // Start with invert disabled, then enable it.
    {
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
      await invertCheckbox.click();
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    }
    // Verify persistence when enabled.
    await reloadDevTools({queryParams: {panel: 'network'}});
    {
      const {devToolsPage} = getBrowserAndPagesWrappers();
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
      await invertCheckbox.click();
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    }
    // Verify persistence when disabled.
    await reloadDevTools({queryParams: {panel: 'network'}});
    {
      const {devToolsPage} = getBrowserAndPagesWrappers();
      const invertCheckbox = await (await devToolsPage.waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    }
  });
});

describe('The Network Tab', function() {
  it('can show only third-party requests', async ({devToolsPage, inspectedPage}: {
                                             devToolsPage: DevToolsPage,
                                             inspectedPage: InspectedPage,
                                           }) => {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    await setCacheDisabled(true, devToolsPage);
    await setPersistLog(false, devToolsPage);

    await navigateToNetworkTab('third-party-resources.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(4, devToolsPage);

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
