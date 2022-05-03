// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

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
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const expectedTableRows = [
      ['Status code', 'Url'],
      ['404', 'test1.example.com'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
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
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const expectedTableRows = [
      ['Url'],
      ['test2.example.com'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
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
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    const expectedTableRows = [
      ['Package name', 'Url', 'Package signature'],
      ['test.package', 'test3.example.com', '1A:2B:3C'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
