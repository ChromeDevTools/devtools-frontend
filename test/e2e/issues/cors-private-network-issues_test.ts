// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Cors Private Network issue', async () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information for insecure contexts', async () => {
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
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(section);

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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display correct information for secure contexts', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
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
      // @ts-ignore
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
      // @ts-ignore
      window.addIssueForTest(issue2);
    });

    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure private network requests are made from secure contexts');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display correct information for preflight request errors', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
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
      // @ts-ignore
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
      // @ts-ignore
      window.addIssueForTest(issue2);
    });

    await expandIssue();
    const issueElement =
        await getIssueByTitle('Ensure private network requests are only made to resources that allow them');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 requests', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display correct information for failed preflight requests', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
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
      // @ts-ignore
      window.addIssueForTest(issue);
    });

    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure preflight responses are valid');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 request', issueElement, '.cors-issue-affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
