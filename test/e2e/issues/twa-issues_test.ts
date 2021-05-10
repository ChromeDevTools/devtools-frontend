// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNull, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Trusted Web Activity issue', async () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information for type kHttpError', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'TrustedWebActivityIssue',
        'details': {
          'twaQualityEnforcementDetails': {
            'url': 'test1.example.com',
            'violationType': 'kHttpError',
            'httpStatusCode': 404,
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle(
        'Trusted Web Activity navigations must succeed or be handled by the ServiceWorker. Your app may crash in the future.');
    assertNotNull(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], ['Status code', 'Url']);
    assert.deepEqual(table[1], ['404', 'test1.example.com']);
  });

  it('should display correct information for type kUnavailableOffline', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'TrustedWebActivityIssue',
        'details': {
          'twaQualityEnforcementDetails': {
            'url': 'test2.example.com',
            'violationType': 'kUnavailableOffline',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle(
        'Trusted Web Activity does not work offline. In the future, your app may crash if the user’s device goes offline.');
    assertNotNull(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], ['Url']);
    assert.deepEqual(table[1], ['test2.example.com']);
  });

  it('should display correct information for type kDigitalAssetLinks', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'TrustedWebActivityIssue',
        'details': {
          'twaQualityEnforcementDetails': {
            'url': 'test3.example.com',
            'violationType': 'kDigitalAssetLinks',
            'packageName': 'test.package',
            'signature': '1A:2B:3C',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle(
        'Digital asset links of the Trusted Web Activity failed verification. Your app may crash in the future.');
    assertNotNull(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], ['Package name', 'Url', 'Package signature']);
    assert.deepEqual(table[1], ['test.package', 'test3.example.com', '1A:2B:3C']);
  });
});
