// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {navigateToNetworkTab} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';

interface Navigator {
  userAgentData?: {
    brands: Array<{
      brand: string,
      version: string,
    }>,
    fullVersionList: Array<{
      brand: string,
      version: string,
    }>,
    mobile: string,
    getHighEntropyValues: (metaDataKeys: string[]) => Promise<string[]>,
  };
}

describe('The Network Tab', () => {
  async function openNetworkConditions(devToolsPage: DevToolsPage, sectionClassName: string) {
    const networkConditionsButton = await devToolsPage.waitForAria('More network conditions…');
    await networkConditionsButton.click();
    return await devToolsPage.waitFor(sectionClassName);
  }

  async function assertDisabled(checkbox: ElementHandle<HTMLInputElement>, expected: boolean) {
    const disabled = await checkbox.evaluate(el => el.disabled);
    assert.strictEqual(disabled, expected);
  }

  async function assertChecked(checkbox: ElementHandle<HTMLInputElement>, expected: boolean) {
    const checked = await checkbox.evaluate(el => el.checked);
    assert.strictEqual(checked, expected);
  }

  async function getUserAgentMetadataFromTarget(target: InspectedPage) {
    const getUserAgentMetaData = async () => {
      const nav = navigator as Navigator;
      return {
        brands: nav.userAgentData?.brands,
        fullVersionList: nav.userAgentData?.fullVersionList,
        mobile: nav.userAgentData?.mobile,
        ...(await nav.userAgentData?.getHighEntropyValues([
          'uaFullVersion',
          'architecture',
          'model',
          'platform',
          'platformVersion',
          'formFactors',
        ])),
      };
    };
    const getUserAgentMetaDataStr = `(${getUserAgentMetaData.toString()})()`;
    return await target.evaluate(getUserAgentMetaDataStr);
  }

  it('can change accepted content encodings', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    const section = await openNetworkConditions(devToolsPage, '.network-config-accepted-encoding');
    const autoCheckbox = await (await devToolsPage.waitForAria('Use browser default', section)).toElement('input');
    const deflateCheckbox = await (await devToolsPage.waitForAria('deflate', section)).toElement('input');
    const gzipCheckbox = await (await devToolsPage.waitForAria('gzip', section)).toElement('input');
    const brotliCheckbox = await (await devToolsPage.waitForAria('br', section)).toElement('input');
    await brotliCheckbox.evaluate(el => el.scrollIntoView(true));
    await assertChecked(autoCheckbox, true);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, true);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, true);
    await assertDisabled(gzipCheckbox, true);
    await assertDisabled(brotliCheckbox, true);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, true);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, false);
    await assertDisabled(gzipCheckbox, false);
    await assertDisabled(brotliCheckbox, false);
    await brotliCheckbox.click();
    await assertChecked(autoCheckbox, false);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, false);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, false);
    await assertDisabled(gzipCheckbox, false);
    await assertDisabled(brotliCheckbox, false);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, true);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, false);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, true);
    await assertDisabled(gzipCheckbox, true);
    await assertDisabled(brotliCheckbox, true);
  });

  it('can override userAgentMetadata', async ({browser, devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    const fullVersion = (await browser.browser.version()).split('/')[1];
    const majorVersion = fullVersion.split('.', 1)[0];
    const fixedVersionUAValue =
        'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    const dynamicVersionUAValue =
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'.replace(
            '%s', `${majorVersion}.0.0.0`);
    const noMetadataVersionUAValue = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';

    const fixedVersionUserAgentMetadataExpected = {
      brands: [
        {brand: 'Not A;Brand', version: '99'},
        {brand: 'Chromium', version: majorVersion},
        {brand: 'Google Chrome', version: majorVersion},
      ],
      uaFullVersion: `${majorVersion}.0.0.0`,
      formFactors: ['Desktop'],
      platform: 'Android',
      platformVersion: '4.0.2',
      architecture: '',
      model: 'Galaxy Nexus',
      mobile: true,
    };
    const dynamicVersionUserAgentMetadataExpected = {
      brands: [
        {brand: 'Not A;Brand', version: '99'},
        {brand: 'Chromium', version: majorVersion},
        {brand: 'Google Chrome', version: majorVersion},
      ],
      uaFullVersion: `${majorVersion}.0.0.0`,
      formFactors: ['Desktop'],
      platform: 'Windows',
      platformVersion: '10.0',
      architecture: 'x86',
      model: '',
      mobile: false,
    };
    const noMetadataVersionUserAgentMetadataExpected = {
      brands: [],
      mobile: false,
      uaFullVersion: '',
      formFactors: [],
      platform: '',
      platformVersion: '',
      architecture: '',
      model: '',
    };
    const section = await openNetworkConditions(devToolsPage, '.network-config-ua');
    const autoCheckbox = await (await devToolsPage.waitForAria('Use browser default', section)).toElement('input');
    const uaDropdown = await devToolsPage.waitForAria('User agent', section);
    await assertChecked(autoCheckbox, true);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);

    await uaDropdown.click();
    await uaDropdown.select(fixedVersionUAValue);
    await uaDropdown.click();

    const fixedVersionUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(fixedVersionUserAgentMetadata, fixedVersionUserAgentMetadataExpected);

    await uaDropdown.click();
    await uaDropdown.select(dynamicVersionUAValue);
    await uaDropdown.click();

    const dynamicVersionUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(dynamicVersionUserAgentMetadata, dynamicVersionUserAgentMetadataExpected);

    await uaDropdown.click();
    await uaDropdown.select(noMetadataVersionUAValue);
    await uaDropdown.click();

    const noMetadataVersionUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(noMetadataVersionUserAgentMetadata, noMetadataVersionUserAgentMetadataExpected);
  });

  it('restores default userAgentMetadata', async ({browser, devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    const fullVersion = (await browser.browser.version()).split('/')[1];
    const majorVersion = fullVersion.split('.', 1)[0];
    const customUAValue =
        `Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${
            majorVersion}.0.0.0 Mobile Safari/537.36`;
    const section = await openNetworkConditions(devToolsPage, '.network-config-ua');
    const autoCheckbox = await (await devToolsPage.waitForAria('Use browser default', section)).toElement('input');
    const uaDropdown = await devToolsPage.waitForAria('User agent', section);
    await assertChecked(autoCheckbox, true);

    const defaultUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);

    await uaDropdown.click();
    await uaDropdown.select(customUAValue);
    await uaDropdown.click();
    const customUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.notDeepEqual(defaultUserAgentMetadata, customUserAgentMetadata);

    await autoCheckbox.click();
    await assertChecked(autoCheckbox, true);
    const restoredUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(defaultUserAgentMetadata, restoredUserAgentMetadata);
  });

  it('can apply customized userAgentMetadata', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    const section = await openNetworkConditions(devToolsPage, '.network-config-ua');
    const autoCheckbox = await (await devToolsPage.waitForAria('Use browser default', section)).toElement('input');
    const uaDropdown = await devToolsPage.waitForAria('User agent', section);
    await assertChecked(autoCheckbox, true);

    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);

    // Choose "Custom..." UA, Move focus to UA string and enter test value
    await uaDropdown.select('custom');
    const userAgent = await devToolsPage.waitForAria('Enter a custom user agent');
    await userAgent.click();
    await devToolsPage.typeText('Test User Agent String');
    await devToolsPage.tabForward();       // focus help button
    await devToolsPage.pressKey('Space');  // open client hints section
    await devToolsPage.tabForward();       // focus help link

    // UA brands
    await devToolsPage.tabForward();  // focus brand name
    await devToolsPage.typeText('Test Brand 1');
    await devToolsPage.tabForward();  // focus brand version
    await devToolsPage.typeText('99');
    await devToolsPage.tabForward();       // focus delete brand button
    await devToolsPage.tabForward();       // focus add brand button
    await devToolsPage.pressKey('Enter');  // add a second brand
    await devToolsPage.typeText('Test Brand 2');
    await devToolsPage.tabForward();  // focus brand version
    await devToolsPage.typeText('100');
    await devToolsPage.tabForward();       // focus delete brand button
    await devToolsPage.tabForward();       // focus add brand button
    await devToolsPage.pressKey('Enter');  // add a third brand
    await devToolsPage.typeText('Test Brand 3');
    await devToolsPage.tabForward();  // focus brand version
    await devToolsPage.typeText('101');
    await devToolsPage.tabForward();  // focus delete brand button
    await devToolsPage.tabForward();  // focus add brand button

    // full-version brands
    await devToolsPage.tabForward();  // focus brand
    await devToolsPage.typeText('FV Brand 1');
    await devToolsPage.tabForward();  // focus brand version
    await devToolsPage.typeText('9.8.7');
    await devToolsPage.tabForward();  // focus delete brand button
    await devToolsPage.tabForward();  // focus add brand button

    await devToolsPage.tabForward();  // focus browser full version
    await devToolsPage.typeText('99.99');

    // Focus on form factors checkbox
    for (let i = 0; i < 7; ++i) {
      await devToolsPage.tabForward();
      // Enable form factors Desktop and XR
      if (i === 0 || i === 4) {
        await devToolsPage.pressKey('Space');
      }
    }

    await devToolsPage.tabForward();  // focus platform name
    await devToolsPage.typeText('Test Platform');
    await devToolsPage.tabForward();  // focus platform version
    await devToolsPage.typeText('10');
    await devToolsPage.tabForward();  // focus architecture
    await devToolsPage.typeText('Test Architecture');
    await devToolsPage.tabForward();  // focus device model
    await devToolsPage.typeText('Test Model');
    await devToolsPage.tabForward();  // focus mobile checkbox
    await devToolsPage.pressKey('Space');
    await devToolsPage.tabForward();  // focus update button
    await devToolsPage.pressKey('Enter');
    const userAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(userAgentMetadata, {
      brands: [
        {brand: 'Test Brand 1', version: '99'},
        {brand: 'Test Brand 2', version: '100'},
        {brand: 'Test Brand 3', version: '101'},
      ],
      uaFullVersion: '99.99',
      formFactors: ['Desktop', 'XR'],
      platform: 'Test Platform',
      platformVersion: '10',
      architecture: 'Test Architecture',
      model: 'Test Model',
      mobile: true,
    });

    // Delete a brand
    const brand = await devToolsPage.waitForAria('Brand 1', section);  // move focus back to first brand
    await brand.click();
    await devToolsPage.tabForward();  // focus brand version
    await devToolsPage.tabForward();  // focus delete brand button
    await devToolsPage.pressKey('Enter');

    // Edit a value
    const platformVersion = await devToolsPage.waitForAria('Platform version', section);
    await platformVersion.click();
    await devToolsPage.typeText('11');

    // Update
    await devToolsPage.tabForward();  // focus architecture
    await devToolsPage.tabForward();  // focus device model
    await devToolsPage.tabForward();  // focus mobile checkbox
    await devToolsPage.tabForward();  // focus update button
    await devToolsPage.pressKey('Enter');
    const updatedUserAgentMetadata = await getUserAgentMetadataFromTarget(inspectedPage);
    assert.deepEqual(updatedUserAgentMetadata, {
      brands: [
        {brand: 'Test Brand 2', version: '100'},
        {brand: 'Test Brand 3', version: '101'},
      ],
      uaFullVersion: '99.99',
      formFactors: ['Desktop', 'XR'],
      platform: 'Test Platform',
      platformVersion: '1011',
      architecture: 'Test Architecture',
      model: 'Test Model',
      mobile: true,
    });
  });
});
