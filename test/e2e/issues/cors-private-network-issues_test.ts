// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNull, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {ensureResourceSectionIsExpanded, expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Cors Private Network issue', async () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: false,
              initiatorIPAddressSpace: 'Public',
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://localhost/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: false,
              initiatorIPAddressSpace: 'Unknown',
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://example.com/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue2);
    });

    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure private network requests are made from secure contexts');
    assertNotNull(issueElement);
    // TODO(crbug.com/1189877): Remove 2nd space after fixing l10n presubmit check
    const section = await getResourcesElement('2  requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Resource Address',
      'Initiator Address',
      'Initiator Context',
    ]);
    assert.deepEqual(table[1], [
      'localhost/',
      'warning',
      'Local',
      'Public',
      'insecure',
    ]);
    assert.deepEqual(table[2], [
      'example.com/',
      'warning',
      'Local',
      'Unknown',
      'insecure',
    ]);
  });
});
