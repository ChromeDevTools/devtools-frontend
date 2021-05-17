// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertMatchArray, assertNotNull, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {ensureResourceSectionIsExpanded, expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('CORS issues', async () => {
  it('should display CORS violations with the correct affected resources', async () => {
    await goToResource('issues/cors-issue.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      // @ts-ignore
      await window.doCorsFetches(`https://devtools.oopif.test:${document.location.port}`);
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure CORS response header values are valid');
    assertNotNull(issueElement);
    const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '3 requests');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 4);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request (if problematic)',
      'Header',
      'Problem',
      'Invalid Value (if available)',
    ]);
    assertMatchArray(table[1], [
      /^devtools.oopif.test:.*/,
      'blocked',
      '',
      'Access-Control-Allow-Origin',
      'Missing Header',
      '',
    ]);
    assertMatchArray(table[2], [
      /^devtools.oopif.test:.*/,
      'blocked',
      /^devtools.oopif.test:.*/,
      'Access-Control-Allow-Origin',
      'Missing Header',
      '',
    ]);
    assertMatchArray(table[3], [
      /.*invalid-preflight.*/,
      'blocked',
      /.*invalid-preflight.*/,
      'Access-Control-Allow-Origin',
      'Missing Header',
      '',
    ]);
  });

  it('should display credentialed+wildcard CORS issues with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      try {
        const url = new URL('./issues/origin-wildcard.rawresponse', document.location.toString())
                        .toString()
                        .replace('localhost', 'devtools.oopif.test');
        await fetch(url, {credentials: 'include'});
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement =
        await getIssueByTitle('Ensure credentialed requests are not sent to CORS resources with origin wildcards');
    assertNotNull(issueElement);
    const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request (if problematic)',
    ]);
    assertMatchArray(table[1], [
      'origin-wildcard.rawresponse',
      'blocked',
      '',
    ]);
  });

  it('should display invalid CORS preflight response codes with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
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
      } catch (e) {
      }
      try {
        const url2 = new URL('./issues/redirect.rawresponse', document.location.toString())
                         .toString()
                         .replace('localhost', 'devtools.oopif.test');
        await fetch(url2, options);
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure preflight responses are valid');
    assertNotNull(issueElement);
    const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '2 requests');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request',
      'Problem',
    ]);
    assertMatchArray(table[1], [
      'invalid-response-code.rawresponse',
      'blocked',
      'invalid-response-code.rawresponse',
      'HTTP status of preflight request didn\'t indicate success',
    ]);
    assertMatchArray(table[2], [
      'redirect.rawresponse',
      'blocked',
      'redirect.rawresponse',
      'Response to preflight was a redirect',
    ]);
  });

  it('should display CORS ACAO mismatches with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
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
      } catch (e) {
      }
      try {
        await fetch(url);
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure CORS requesting origin matches resource\'s allowed origin');
    assertNotNull(issueElement);
    const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '2 requests');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request (if problematic)',
      'Initiator Context',
      'Allowed Origin (from header)',
    ]);
    assertMatchArray(table[1], [
      'acao-mismatch.rawresponse',
      'blocked',
      'acao-mismatch.rawresponse',
      /^https:\/\/localhost.*/,
      'https://devtools.oopif.test',
    ]);
    assertMatchArray(table[2], [
      'acao-mismatch.rawresponse',
      'blocked',
      '',
      /^https:\/\/localhost.*/,
      'https://devtools.oopif.test',
    ]);
  });

  it('should display invalid CORS ACAC values with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
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
      } catch (e) {
      }
      try {
        await fetch(url, {credentials: 'include'});
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure CORS requests include credentials only when allowed');
    assertNotNull(issueElement);
    const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '2 requests');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request (if problematic)',
      'Access-Control-Allow-Credentials Header Value',
    ]);
    assertMatchArray(table[1], [
      'acac-invalid.rawresponse',
      'blocked',
      'acac-invalid.rawresponse',
      'false',
    ]);
    assertMatchArray(table[2], [
      'acac-invalid.rawresponse',
      'blocked',
      '',
      'false',
    ]);
  });

  it('should display CORS requests using disallowed methods with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      try {
        const url = new URL('./issues/method-disallowed.rawresponse', document.location.toString())
                        .toString()
                        .replace('localhost', 'devtools.oopif.test');
        await fetch(url, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({geeting: 'hello'}),
        });
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure CORS request uses allowed method');
    assertNotNull(issueElement);
    const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request',
      'Disallowed Request Method',
    ]);
    assertMatchArray(table[1], [
      'method-disallowed.rawresponse',
      'blocked',
      'method-disallowed.rawresponse',
      'PUT',
    ]);
  });

  it('should display CORS requests using disallowed headers with the correct affected resources', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      try {
        // We can re-use `method-disallowed.rawresponse` for this test.
        const url = new URL('./issues/method-disallowed.rawresponse', document.location.toString())
                        .toString()
                        .replace('localhost', 'devtools.oopif.test');
        await fetch(url, {
          headers: {'X-Foo': 'bar'},
        });
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure CORS request includes only allowed headers');
    assertNotNull(issueElement);
    const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Preflight Request',
      'Disallowed Request Header',
    ]);
    assertMatchArray(table[1], [
      'method-disallowed.rawresponse',
      'blocked',
      'method-disallowed.rawresponse',
      'x-foo',
    ]);
  });

  it('should display CORS requests redirecting to credentialed URLs', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      try {
        const url = new URL('./issues/credentialed-redirect.rawresponse', document.location.toString())
                        .toString()
                        .replace('localhost', 'devtools.oopif.test');
        await fetch(url);
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement =
        await getIssueByTitle('Ensure CORS requests are not redirected to URLs containing credentials');
    assertNotNull(issueElement);
    const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
    ]);
    assertMatchArray(table[1], [
      'credentialed-redirect.rawresponse',
      'blocked',
    ]);
  });

  it('should display CORS issues that are disallowed by the mode', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      try {
        const url = new URL('/', document.location.toString()).toString().replace('localhost', 'devtools.oopif.test');
        await fetch(url, {mode: 'same-origin'});
      } catch (e) {
      }
    });
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement =
        await getIssueByTitle('Ensure only same-origin resources are fetched with same-origin request mode');
    assertNotNull(issueElement);
    const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 request');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Request',
      'Status',
      'Initiator Context',
      'Source Location',
    ]);
    assertMatchArray(table[1], [
      /^devtools.oopif.test.*\//,
      'blocked',
      /^https:\/\/localhost.*/,
      /.*:\d+/,
    ]);
  });
});
