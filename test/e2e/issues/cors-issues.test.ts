// Copyright 2020 The Chromium Authors
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

describe('CORS issues', () => {
  it('should display CORS violations with the correct affected resources', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('issues/cors-issue.html');
    await inspectedPage.evaluate(async () => {
      // @ts-expect-error
      await window.doCorsFetches(`https://devtools.oopif.test:${document.location.port}`);
    });
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(devToolsPage, 'Ensure CORS response header values are valid');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, 'requests', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '3 requests');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Preflight request (if problematic)',
        'Header',
        'Problem',
        'Invalid value (if available)',
      ],
      [
        /^devtools.oopif.test:.*/,
        'Blocked',
        '',
        'Access-Control-Allow-Origin',
        'Missing header',
        '',
      ],
      [
        /^devtools.oopif.test:.*/,
        'Blocked',
        /^devtools.oopif.test:.*/,
        'Access-Control-Allow-Origin',
        'Missing header',
        '',
      ],
      [
        /.*invalid-preflight.*/,
        'Blocked',
        /.*invalid-preflight.*/,
        'Access-Control-Allow-Origin',
        'Missing header',
        '',
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
           devToolsPage, 'Ensure credentialed requests aren’t sent to CORS resources with origin wildcards');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request (if problematic)',
         ],
         [
           'origin-wildcard.rawresponse',
           'Blocked',
           '',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
       const issueElement = await getIssueByTitle(devToolsPage, 'Ensure preflight responses are valid');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'requests', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request',
           'Problem',
         ],
         [
           'invalid-response-code.rawresponse',
           'Blocked',
           'invalid-response-code.rawresponse',
           'HTTP status of preflight request didn’t indicate success',
         ],
         [
           'redirect.rawresponse',
           'Blocked',
           'redirect.rawresponse',
           'Response to preflight was a redirect',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
           await getIssueByTitle(devToolsPage, 'Ensure CORS requesting origin matches resource’s allowed origin');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'requests', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request (if problematic)',
           'Initiator context',
           'Allowed origin (from header)',
         ],
         [
           'acao-mismatch.rawresponse',
           'Blocked',
           'acao-mismatch.rawresponse',
           /^https:\/\/localhost.*/,
           'https://devtools.oopif.test',
         ],
         [
           'acao-mismatch.rawresponse',
           'Blocked',
           '',
           /^https:\/\/localhost.*/,
           'https://devtools.oopif.test',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
           await getIssueByTitle(devToolsPage, 'Ensure CORS requests include credentials only when allowed');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'requests', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '2 requests');
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request (if problematic)',
           'Access-Control-Allow-Credentials header value',
         ],
         [
           'acac-invalid.rawresponse',
           'Blocked',
           'acac-invalid.rawresponse',
           'false',
         ],
         [
           'acac-invalid.rawresponse',
           'Blocked',
           '',
           'false',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
       const issueElement = await getIssueByTitle(devToolsPage, 'Ensure CORS request uses allowed method');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request',
           'Disallowed request method',
         ],
         [
           'method-disallowed.rawresponse',
           'Blocked',
           'method-disallowed.rawresponse',
           'PUT',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display CORS requests using disallowed headers with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await inspectedPage.evaluate(async () => {
         try {
           // We can reuse `method-disallowed.rawresponse` for this test.
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
       const issueElement = await getIssueByTitle(devToolsPage, 'Ensure CORS request includes only allowed headers');
       assert.isOk(issueElement);
       const section =
           await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
       const text = await section.label.evaluate(el => el.textContent);
       assert.strictEqual(text, '1 request');
       await ensureResourceSectionIsExpanded(devToolsPage, section);

       const expectedTableRows = [
         [
           'Request',
           'Status',
           'Preflight request',
           'Disallowed request header',
         ],
         [
           'method-disallowed.rawresponse',
           'Blocked',
           'method-disallowed.rawresponse',
           'x-foo',
         ],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
        await getIssueByTitle(devToolsPage, 'Ensure CORS requests aren’t redirected to URLs containing credentials');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
      ],
      [
        'credentialed-redirect.rawresponse',
        'Blocked',
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
        devToolsPage, 'Ensure only same-origin resources are fetched with same-origin request mode');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Initiator context',
        'Source location',
      ],
      [
        /^devtools.oopif.test.*\//,
        'Blocked',
        /^https:\/\/localhost.*/,
        /.*:\d+/,
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
    const issueElement = await getIssueByTitle(devToolsPage, 'Ensure CORS requests are made on supported schemes');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Initiator context',
        'Source location',
        'Unsupported scheme',
      ],
      [
        /^devtools.oopif.test.*\//,
        'Blocked',
        /^https:\/\/localhost.*/,
        /.*:\d+/,
        'webdav',
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
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
    const issueElement = await getIssueByTitle(devToolsPage, 'Ensure no-cors requests configure redirect mode follow');
    assert.isOk(issueElement);
    const section =
        await getResourcesElement(devToolsPage, 'request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      [
        'Request',
        'Status',
        'Source location',
      ],
      [
        /^devtools.oopif.test.*\//,
        'Blocked',
        /.*:\d+/,
      ],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
