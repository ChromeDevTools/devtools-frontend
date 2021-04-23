// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource, matchArray} from '../../shared/helper.js';
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
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
      const text = await section.label.evaluate(el => el.textContent);
      // TODO(crbug.com/1189877): Remove 2nd space after fixing l10n presubmit check
      assert.strictEqual(text, '3  requests');
      await ensureResourceSectionIsExpanded(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 4);
        assert.deepEqual(table[0], [
          'Request',
          'Status',
          'Preflight Request (if problematic)',
          'Header',
          'Problem',
          'Invalid Value (if available)',
        ]);
        matchArray(table[1], [
          /^devtools.oopif.test:.*/,
          'blocked',
          '',
          'Access-Control-Allow-Origin',
          'Missing Header',
          '',
        ]);
        matchArray(table[2], [
          /^devtools.oopif.test:.*/,
          'blocked',
          /^devtools.oopif.test:.*/,
          'Access-Control-Allow-Origin',
          'Missing Header',
          '',
        ]);
        matchArray(table[3], [
          /.*invalid-preflight.*/,
          'blocked',
          /.*invalid-preflight.*/,
          'Access-Control-Allow-Origin',
          'Missing Header',
          '',
        ]);
      }
    }
  });

  it('should display CORS violations with the correct affected resources', async () => {
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
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('request', issueElement, '.cors-issue-affected-resource-label');
      const text = await section.label.evaluate(el => el.textContent);
      // TODO(crbug.com/1189877): Remove 2nd space after fixing l10n presubmit check
      assert.strictEqual(text, '1  request');
      await ensureResourceSectionIsExpanded(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 2);
        assert.deepEqual(table[0], [
          'Request',
          'Status',
          'Preflight Request (if problematic)',
        ]);
        matchArray(table[1], [
          'origin-wildcard.rawresponse',
          'blocked',
          '',
        ]);
      }
    }
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
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
      const text = await section.label.evaluate(el => el.textContent);
      // TODO(crbug.com/1189877): Remove 2nd space after fixing l10n presubmit check
      assert.strictEqual(text, '2  requests');
      await ensureResourceSectionIsExpanded(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 3);
        assert.deepEqual(table[0], [
          'Request',
          'Status',
          'Preflight Request',
          'Problem',
        ]);
        matchArray(table[1], [
          'invalid-response-code.rawresponse',
          'blocked',
          'invalid-response-code.rawresponse',
          'HTTP status of preflight request didn\'t indicate success',
        ]);
        matchArray(table[2], [
          'redirect.rawresponse',
          'blocked',
          'redirect.rawresponse',
          'Response to preflight was a redirect',
        ]);
      }
    }
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
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
      const text = await section.label.evaluate(el => el.textContent);
      // TODO(crbug.com/1189877): Remove 2nd space after fixing l10n presubmit check
      assert.strictEqual(text, '2  requests');
      await ensureResourceSectionIsExpanded(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 3);
        assert.deepEqual(table[0], [
          'Request',
          'Status',
          'Preflight Request (if problematic)',
          'Initiator Context',
          'Allowed Origin (from header)',
        ]);
        matchArray(table[1], [
          'acao-mismatch.rawresponse',
          'blocked',
          'acao-mismatch.rawresponse',
          /^https:\/\/localhost.*/,
          'https://devtools.oopif.test',
        ]);
        matchArray(table[2], [
          'acao-mismatch.rawresponse',
          'blocked',
          '',
          /^https:\/\/localhost.*/,
          'https://devtools.oopif.test',
        ]);
      }
    }
  });
});
