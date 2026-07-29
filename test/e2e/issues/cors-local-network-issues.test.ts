// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Cors Local Network issues', () => {
  it('should display correct information for insecure contexts', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: false,
              initiatorIPAddressSpace: 'Public',
              localNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecureLocalNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://localhost/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: false,
              initiatorIPAddressSpace: 'Unknown',
              localNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecureLocalNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://example.com/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });

    await expandIssue(devToolsPage);
    const issueElement =
        await getIssueByTitle(devToolsPage, 'Ensure that local network requests are compatible with restrictions');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, '2 requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(devToolsPage, section);

    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Resource Address',
        'Initiator Address',
        'Initiator Context',
      ],
      [
        'localhost/',
        'warning',
        'Local',
        'Public',
        'insecure',
      ],
      [
        'example.com/',
        'warning',
        'Local',
        'Unknown',
        'insecure',
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });

  it('should display correct information for secure contexts', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: true,
              initiatorIPAddressSpace: 'Public',
              localNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecureLocalNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://localhost/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'CorsIssue',
        details: {
          corsIssueDetails: {
            clientSecurityState: {
              initiatorIsSecureContext: true,
              initiatorIPAddressSpace: 'Unknown',
              localNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecureLocalNetwork', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://example.com/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });

    await expandIssue(devToolsPage);
    const issueElement =
        await getIssueByTitle(devToolsPage, 'Ensure that local network requests are compatible with restrictions');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, '2 requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Resource Address',
        'Initiator Address',
        'Initiator Context',
      ],
      [
        'localhost/',
        'warning',
        'Local',
        'Public',
        'secure',
      ],
      [
        'example.com/',
        'warning',
        'Local',
        'Unknown',
        'secure',
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
