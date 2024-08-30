// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert, expect} from 'chai';
import {type ElementHandle} from 'puppeteer-core';

import {
  $textContent,
  clickElement,
  disableExperiment,
  getTestServerPort,
  setCheckBox,
  step,
  typeText,
  waitFor,
  waitForAria,
  waitForMany,
  waitForNone,
} from '../../shared/helper.js';

import {
  reloadDevTools,
} from '../helpers/cross-tool-helper.js';
import {
  clearTextFilter,
  getAllRequestNames,
  navigateToNetworkTab,
  setCacheDisabled,
  setPersistLog,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';

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

async function openMoreFiltersDropdown() {
  const filterDropdown = await waitFor('[aria-label="Show only/hide requests dropdown"]');
  const filterButton = await waitFor('.toolbar-button', filterDropdown);
  await filterButton.click();
  return filterButton;
}

async function getFilter(label: string, root?: ElementHandle) {
  const filter = await $textContent(label, root);

  if (!filter) {
    assert.fail(`Could not find ${label} filter.`);
  }
  return filter;
}

async function checkOpacityCheckmark(filter: ElementHandle, opacity: string) {
  const checkmarkOpacity = await filter.$eval('.checkmark', element => {
    return window.getComputedStyle(element).getPropertyValue('opacity');
  });

  return checkmarkOpacity === opacity;
}

describe('The Network Tab', function() {
  // One of these tests reloads panels repeatedly, which can take a longer time.
  this.timeout(20_000);

  beforeEach(async () => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL);
  });

  it('can filter by text in the log view', async () => {
    await typeText('9');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[10]);
  });

  it('can match multiple requests by text in the log view', async () => {
    await typeText('svg');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(10);
  });

  it('can filter by regex in the log view', async () => {
    await typeText('/8/');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[9]);
  });

  it('can match multiple requests by regex in the log view', async () => {
    await typeText('/.*/');
    let nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(11);

    await clearTextFilter();
    await typeText('/.*\\..*/');
    nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(11);

    await clearTextFilter();
    await typeText('/.*\\.svg/');
    nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(10);
  });

  it('can match no requests by regex in the log view', async () => {
    await typeText('/NOTHINGTOMATCH/');
    await waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter();
    await typeText('//');
    await waitForNone('.data-grid-data-grid-node > .name-column');
  });

  // Mac doesn't consistently respect force-cache
  it.skipOnPlatforms(['mac'], '[crbug.com/1297070] can filter by cache status in the log view', async () => {
    await navigateToNetworkTab(`requests.html?num=5&cache=no-store&nocache=${Math.random()}`);
    await setPersistLog(true);
    await navigateToNetworkTab(`requests.html?num=3&cache=force-cache&nocache=${Math.random()}`);
    await typeText('-is:from-cache');
    let nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(7);

    await clearTextFilter();
    await typeText('is:from-cache');
    nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(3);
    await setPersistLog(false);
  });

  it('require operator to filter by scheme', async () => {
    await typeText('http');
    await waitForNone('.data-grid-data-grid-node > .name-column');

    await typeText('s');
    await waitForNone('.data-grid-data-grid-node > .name-column');

    await typeText('://');
    await waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter();
    await typeText('scheme:https');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(11);
  });

  it('require operator to filter by scheme', async () => {
    await typeText('localhost');
    await waitForNone('.data-grid-data-grid-node > .name-column');

    await clearTextFilter();
    await typeText('domain:localhost');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(11);
  });

  it('can filter by partial URL in the log view', async () => {
    await clearTextFilter();
    await typeText(`https://localhost:${getTestServerPort()}`);
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(11);
  });

  it('can reverse filter text in the log view', async () => {
    await typeText('-7');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(8, 1);
    expect(nodes.length).to.equal(output.length);
    for (let i = 0; i < 10; i++) {
      expect(await elementTextContent(nodes[i])).to.equal(output[i]);
    }
  });

  it('can reverse filter regex in the log view', async () => {
    await typeText('-/6/');
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(7, 1);
    expect(nodes.length).to.equal(output.length);
    for (let i = 0; i < 10; i++) {
      expect(await elementTextContent(nodes[i])).to.equal(output[i]);
    }
  });

  it('can invert text filters', async () => {
    const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await typeText('5');
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(6, 1);
    expect(nodes.length).to.equal(output.length);
    for (let i = 0; i < 10; i++) {
      expect(await elementTextContent(nodes[i])).to.equal(output[i]);
    }
    // Cleanup
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert regex filters', async () => {
    const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await typeText('/4/');
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 10);
    const output = [...RESULTS];
    output.splice(5, 1);
    expect(nodes.length).to.equal(output.length);
    for (let i = 0; i < 10; i++) {
      expect(await elementTextContent(nodes[i])).to.equal(output[i]);
    }
    // Cleanup
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert negated text filters', async () => {
    const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await typeText('-10');
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[0]);
    // Cleanup
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can invert negated regex filters', async () => {
    const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    await typeText('-/10/');
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    const nodes = await waitForMany('.data-grid-data-grid-node > .name-column', 1);
    expect(nodes.length).to.equal(1);
    expect(await elementTextContent(nodes[0])).to.equal(RESULTS[0]);
    // Cleanup
    await clickElement(invertCheckbox);
    expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
  });

  it('can persist the invert checkbox', async () => {
    // Start with invert disabled, then enable it.
    {
      const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
      await clickElement(invertCheckbox);
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
    }
    // Verify persistence when enabled.
    await reloadDevTools({queryParams: {panel: 'network'}});
    {
      const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(true);
      await clickElement(invertCheckbox);
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    }
    // Verify persistence when disabled.
    await reloadDevTools({queryParams: {panel: 'network'}});
    {
      const invertCheckbox = await (await waitForAria('Invert')).toElement('input');
      expect(await checkboxIsChecked(invertCheckbox)).to.equal(false);
    }
  });
});

describe('The Network Tab', function() {
  this.timeout(5000);

  beforeEach(async () => {
    await disableExperiment('network-panel-filter-bar-redesign');

    await navigateToNetworkTab('empty.html');
    await setCacheDisabled(true);
    await setPersistLog(false);
  });

  it('can show only third-party requests from checkbox', async () => {
    await setCheckBox('[title="3rd-party requests"]', true);
    await navigateToNetworkTab('third-party-resources.html');
    await waitForSomeRequestsToAppear(1);

    assert.deepStrictEqual(await getAllRequestNames(), ['external_image.svg']);
  });
});

describe('The Network Tab', function() {
  this.timeout(5000);

  beforeEach(async () => {
    await reloadDevTools({enableExperiments: ['network-panel-filter-bar-redesign']});

    await navigateToNetworkTab('empty.html');
    await setCacheDisabled(true);
    await setPersistLog(false);
  });

  it('can show only third-party requests from dropdown', async () => {
    await navigateToNetworkTab('third-party-resources.html');
    await waitForSomeRequestsToAppear(3);

    await openMoreFiltersDropdown();

    const thirdPartyFilter = await getFilter('3rd-party requests');

    let names = await getAllRequestNames();

    await step('verify the dropdown state and the requests when 3rd-part filter is selected', async () => {
      await thirdPartyFilter.click();
      assert.isTrue(await checkOpacityCheckmark(thirdPartyFilter, '1'));

      names = await getAllRequestNames();
      assert.deepEqual(1, names.length);
      assert.deepStrictEqual(names, ['external_image.svg'], 'The right request names should appear in the list');
    });

    await step('verify the dropdown state and the requests when 3rd-party filter is deselected', async () => {
      await thirdPartyFilter.click();
      assert.isTrue(await checkOpacityCheckmark(thirdPartyFilter, '0'));

      names = await getAllRequestNames();
      assert.deepEqual(3, names.length);
      assert.deepStrictEqual(
          names, ['third-party-resources.html', 'image.svg', 'external_image.svg'],
          'The right request names should appear in the list');
    });
  });
});
