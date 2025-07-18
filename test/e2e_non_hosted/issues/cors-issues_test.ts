// Copyright 2020 The Chromium Authors. All rights reserved.
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
import {assertNotNullOrUndefined} from '../../shared/helper.js';

describe('CORS issues', () => {
  it('should display CORS violations with the correct affected resources', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('issues/cors-issue.html');
    await inspectedPage.evaluate(async () => {
      // @ts-expect-error
      await window.doCorsFetches(`https://devtools.oopif.test:${document.location.port}`);
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Ensure CORS response header values are valid', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section =
        await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '3 requests');
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Preflight Request (if problematic)',
        'Header',
        'Problem',
        'Invalid Value (if available)',
      ],
      [
        /^devtools.oopif.test:.*/,
        'blocked',
        '',
        'Access-Control-Allow-Origin',
        'Missing Header',
        '',
      ],
      [
        /^devtools.oopif.test:.*/,
        'blocked',
        /^devtools.oopif.test:.*/,
        'Access-Control-Allow-Origin',
        'Missing Header',
        '',
      ],
      [
        /.*invalid-preflight.*/,
        'blocked',
        /.*invalid-preflight.*/,
        'Access-Control-Allow-Origin',
        'Missing Header',
        '',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display credentialed+wildcard CORS issues with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         try {
           const url = new URL('./issues/origin-wildcard.rawresponse', document.location.toString())
                           .toString()
                           .replace('localhost', 'devtools.oopif.test');
           await fetch(url, {credentials: 'include'});
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement = await getIssueByTitle(
           'Ensure credentialed requests are not sent to CORS resources with origin wildcards', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request (if problematic)',
         ],
         [
           'origin-wildcard.rawresponse',
           'blocked',
           '',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display invalid CORS preflight response codes with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         const options = {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({geeting: 'hello'}),
         };
         try {
           const url = new URL('./issues/invalid-response-code.rawresponse', document.location.toString())
                           .toString()
                           .replace('localhost', 'devtools.oopif.test');
           await fetch(url, options);
         } catch {
         }
         try {
           const url2 = new URL('./issues/redirect.rawresponse', document.location.toString())
                            .toString()
                            .replace('localhost', 'devtools.oopif.test');
           await fetch(url2, options);
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement = await getIssueByTitle('Ensure preflight responses are valid', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request',
           'Problem',
         ],
         [
           'invalid-response-code.rawresponse',
           'blocked',
           'invalid-response-code.rawresponse',
           'HTTP status of preflight request didn\'t indicate success',
         ],
         [
           'redirect.rawresponse',
           'blocked',
           'redirect.rawresponse',
           'Response to preflight was a redirect',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display CORS ACAO mismatches with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         const options = {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({geeting: 'hello'}),
         };
         const url = new URL('./issues/acao-mismatch.rawresponse', document.location.toString())
                         .toString()
                         .replace('localhost', 'devtools.oopif.test');
         try {
           await fetch(url, options);
         } catch {
         }
         try {
           await fetch(url);
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement =
           await getIssueByTitle('Ensure CORS requesting origin matches resource\'s allowed origin', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request (if problematic)',
           'Initiator Context',
           'Allowed Origin (from header)',
         ],
         [
           'acao-mismatch.rawresponse',
           'blocked',
           'acao-mismatch.rawresponse',
           /^https:\/\/localhost.*/,
           'https://devtools.oopif.test',
         ],
         [
           'acao-mismatch.rawresponse',
           'blocked',
           '',
           /^https:\/\/localhost.*/,
           'https://devtools.oopif.test',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display invalid CORS ACAC values with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         const url = new URL('./issues/acac-invalid.rawresponse', document.location.toString())
                         .toString()
                         .replace('localhost', 'devtools.oopif.test');
         try {
           await fetch(url, {
             method: 'POST',
             credentials: 'include',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({geeting: 'hello'}),
           });
         } catch {
         }
         try {
           await fetch(url, {credentials: 'include'});
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement =
           await getIssueByTitle('Ensure CORS requests include credentials only when allowed', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request (if problematic)',
           'Access-Control-Allow-Credentials Header Value',
         ],
         [
           'acac-invalid.rawresponse',
           'blocked',
           'acac-invalid.rawresponse',
           'false',
         ],
         [
           'acac-invalid.rawresponse',
           'blocked',
           '',
           'false',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display CORS requests using disallowed methods with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         try {
           const url = new URL('./issues/method-disallowed.rawresponse', document.location.toString())
                           .toString()
                           .replace('localhost', 'devtools.oopif.test');
           await fetch(url, {
             method: 'PUT',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({geeting: 'hello'}),
           });
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement = await getIssueByTitle('Ensure CORS request uses allowed method', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request',
           'Disallowed Request Method',
         ],
         [
           'method-disallowed.rawresponse',
           'blocked',
           'method-disallowed.rawresponse',
           'PUT',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display CORS requests using disallowed headers with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         try {
           // We can re-use \`method-disallowed.rawresponse\` for this test.
           const url = new URL('./issues/method-disallowed.rawresponse', document.location.toString())
                           .toString()
                           .replace('localhost', 'devtools.oopif.test');
           await fetch(url, {
             headers: {'X-Foo': 'bar'},
           });
         } catch {
         }
       });
       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement = await getIssueByTitle('Ensure CORS request includes only allowed headers', devToolsPage);
       assertNotNullOrUndefined(issueElement);
       const section =
           await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(section, devToolsPage);

       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight Request',
           'Disallowed Request Header',
         ],
         [
           'method-disallowed.rawresponse',
           'blocked',
           'method-disallowed.rawresponse',
           'x-foo',
         ],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
     });

  it('should display CORS requests redirecting to credentialed URLs', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await inspectedPage.evaluate(async () => {
      try {
        const url = new URL('./issues/credentialed-redirect.rawresponse', document.location.toString())
                        .toString()
                        .replace('localhost', 'devtools.oopif.test');
        await fetch(url);
      } catch {
      }
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement =
        await getIssueByTitle('Ensure CORS requests are not redirected to URLs containing credentials', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section =
        await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
      ],
      [
        'credentialed-redirect.rawresponse',
        'blocked',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display CORS issues that are disallowed by the mode', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await inspectedPage.evaluate(async () => {
      try {
        const url = new URL('/', document.location.toString()).toString().replace('localhost', 'devtools.oopif.test');
        await fetch(url, {mode: 'same-origin'});
      } catch {
      }
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(
        'Ensure only same-origin resources are fetched with same-origin request mode', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section =
        await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Initiator Context',
        'Source Location',
      ],
      [
        /^devtools.oopif.test.*\//,
        'blocked',
        /^https:\/\/localhost.*/,
        /.*:\d+/,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display CORS issues that are unsupported by the scheme', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await inspectedPage.evaluate(async () => {
      try {
        const url = new URL('/', document.location.toString())
                        .toString()
                        .replace('https://localhost', 'webdav://devtools.oopif.test');
        await fetch(url);
      } catch {
      }
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Ensure CORS requests are made on supported schemes', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section =
        await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Initiator Context',
        'Source Location',
        'Unsupported Scheme',
      ],
      [
        /^devtools.oopif.test.*\//,
        'blocked',
        /^https:\/\/localhost.*/,
        /.*:\d+/,
        'webdav',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display CORS issues that are misconfiguring the redirect mode', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await inspectedPage.evaluate(async () => {
      try {
        const url = new URL('/', document.location.toString())
                        .toString()
                        .replace('https://localhost', 'webdav://devtools.oopif.test');
        await fetch(url, {mode: 'no-cors', redirect: 'manual'});
      } catch {
      }
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Ensure no-cors requests configure redirect mode follow', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section =
        await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Source Location',
      ],
      [
        /^devtools.oopif.test.*\//,
        'blocked',
        /.*:\d+/,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
