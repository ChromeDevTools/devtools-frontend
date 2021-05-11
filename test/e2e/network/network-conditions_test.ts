// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer';

import {getBrowserAndPages, waitFor, waitForAria} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToNetworkTab} from '../helpers/network-helpers.js';

describe('The Network Tab', async function() {
  beforeEach(async () => {
    await navigateToNetworkTab('empty.html');
  });

  async function openNetworkConditions(sectionClassName: string) {
    const networkConditionsButton = await waitForAria('More network conditions…');
    await networkConditionsButton.click();
    return await waitFor(sectionClassName);
  }

  async function assertDisabled(checkbox: ElementHandle<Element>, expected: boolean) {
    const disabled = await checkbox.evaluate(el => el.disabled);
    assert.strictEqual(disabled, expected);
  }

  async function assertChecked(checkbox: ElementHandle<Element>, expected: boolean) {
    const checked = await checkbox.evaluate(el => el.checked);
    assert.strictEqual(checked, expected);
  }

  it('can change accepted content encodings', async () => {
    const section = await openNetworkConditions('.network-config-accepted-encoding');
    const autoCheckbox = await waitForAria('Use browser default', section);
    const deflateCheckbox = await waitForAria('deflate', section);
    const gzipCheckbox = await waitForAria('gzip', section);
    const brotliCheckbox = await waitForAria('br', section);
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

  it('can override userAgentMetadata', async () => {
    const {target, browser} = getBrowserAndPages();
    const version = (await browser.version()).split('/')[1];

    const fixedVersionUAValue =
        'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    const dynamicVersionUAValue =
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'.replace(
            '%s', version);
    const noMetadataVersionUAValue = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';

    const fixedVersionUserAgentMetadataExpected = {
      'brands': [
        {'brand': 'Not A;Brand', 'version': '99'},
        {'brand': 'Chromium', 'version': version},
        {'brand': 'Google Chrome', 'version': version},
      ],
      'platform': 'Android',
      'platformVersion': '4.0.2',
      'architecture': '',
      'model': 'Galaxy Nexus',
      'mobile': true,
    };
    const dynamicVersionUserAgentMetadataExpected = {
      'brands': [
        {'brand': 'Not A;Brand', 'version': '99'},
        {'brand': 'Chromium', 'version': version},
        {'brand': 'Google Chrome', 'version': version},
      ],
      'platform': 'Windows',
      'platformVersion': '10.0',
      'architecture': 'x86',
      'model': '',
      'mobile': false,
    };
    const noMetadataVersionUserAgentMetadataExpected =
        {'brands': [], 'mobile': false, 'platform': '', 'platformVersion': '', 'architecture': '', 'model': ''};

    const getUserAgentMetaData = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = <any>navigator;
      return {
        brands: nav.userAgentData.brands,
        mobile: nav.userAgentData.mobile,
        ...(await nav.userAgentData.getHighEntropyValues([
          'architecture',
          'model',
          'platform',
          'platformVersion',
        ])),
      };
    };
    const getUserAgentMetaDataStr = `(${getUserAgentMetaData.toString()})()`;

    const section = await openNetworkConditions('.network-config-ua');
    const autoCheckbox = await waitForAria('Use browser default', section);
    const uaDropdown = await waitFor('[aria-label="User agent"]', section);
    await assertChecked(autoCheckbox, true);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);

    await uaDropdown.click();
    await uaDropdown.select(fixedVersionUAValue);
    await uaDropdown.click();
    const fixedVersionUserAgentMetadata = await target.evaluate(getUserAgentMetaDataStr);
    assert.deepEqual(fixedVersionUserAgentMetadata, fixedVersionUserAgentMetadataExpected);

    await uaDropdown.click();
    await uaDropdown.select(dynamicVersionUAValue);
    await uaDropdown.click();
    const dynamicVersionUserAgentMetadata = await target.evaluate(getUserAgentMetaDataStr);
    assert.deepEqual(dynamicVersionUserAgentMetadata, dynamicVersionUserAgentMetadataExpected);

    await uaDropdown.click();
    await uaDropdown.select(noMetadataVersionUAValue);
    await uaDropdown.click();
    const noMetadataVersionUserAgentMetadata = await target.evaluate(getUserAgentMetaDataStr);
    assert.deepEqual(noMetadataVersionUserAgentMetadata, noMetadataVersionUserAgentMetadataExpected);
  });
});
