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
} from '../../e2e/helpers/issues-helpers.js';

describe('Cors Private Network issue', () => {
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
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
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
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
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
        await getIssueByTitle('Ensure private network requests are made from secure contexts', devToolsPage);
    assert.isOk(issueElement);
    const section =
        await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);

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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
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
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
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
              privateNetworkRequestPolicy: 'WarnFromInsecureToMorePrivate',
            },
            corsErrorStatus: {corsError: 'InsecurePrivateNetwork', failedParameter: ''},
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
        await getIssueByTitle('Ensure private network requests are made from secure contexts', devToolsPage);
    assert.isOk(issueElement);
    const section =
        await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display correct information for preflight request errors', async ({devToolsPage, inspectedPage}) => {
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
              privateNetworkRequestPolicy: 'PreflightBlock',
            },
            corsErrorStatus: {corsError: 'PreflightMissingAllowPrivateNetwork', failedParameter: ''},
            isWarning: false,
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
              initiatorIPAddressSpace: 'Public',
              privateNetworkRequestPolicy: 'PreflightBlock',
            },
            corsErrorStatus: {corsError: 'PreflightInvalidAllowPrivateNetwork', failedParameter: 'shouldBeTrue'},
            isWarning: false,
            request: {requestId: 'request-1', url: 'http://example.com/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });

    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(
        'Ensure private network requests are only made to resources that allow them', devToolsPage);
    assert.isOk(issueElement);
    const section =
        await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Preflight Request',
        'Invalid Value (if available)',
        'Initiator Address',
        'Initiator Context',
      ],
      [
        'localhost/',
        'blocked',
        'localhost/',
        '',
        'Public',
        'secure',
      ],
      [
        'example.com/',
        'blocked',
        'example.com/',
        'shouldBeTrue',
        'Public',
        'secure',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display correct information for failed preflight requests', async ({devToolsPage, inspectedPage}) => {
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
              privateNetworkRequestPolicy: 'PreflightWarn',
            },
            corsErrorStatus: {corsError: 'InvalidResponse', failedParameter: ''},
            isWarning: true,
            request: {requestId: 'request-1', url: 'http://localhost/'},
            resourceIPAddressSpace: 'Local',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
    });

    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Ensure preflight responses are valid', devToolsPage);
    assert.isOk(issueElement);
    const section =
        await getResourcesElement('1 request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Preflight Request',
        'Problem',
      ],
      [
        'localhost/',
        'warning',
        'localhost/',
        'Failed Request',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
