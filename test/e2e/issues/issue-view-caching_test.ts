// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertNotNullOrUndefined,
  getBrowserAndPages,
  goToResource,
  setCheckBox,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('IssueView cache', () => {
  it('should correctly update the issue', async () => {
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();
    async function triggerIssue() {
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
    }
    await triggerIssue();
    await navigateToIssuesTab();
    async function waitForResources(numberOfAggregatedIssues: number, expectedTableRows: string[][]) {
      await waitForFunction(async () => {
        await expandIssue();
        const issueElement = await getIssueByTitle('Ensure CORS requests include credentials only when allowed');
        assertNotNullOrUndefined(issueElement);
        const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
        const text = await section.label.evaluate(el => el.textContent);
        const expected = numberOfAggregatedIssues === 1 ? '1 request' : `${numberOfAggregatedIssues} requests`;
        return text === expected;
      });
      const issueElement = await getIssueByTitle('Ensure CORS requests include credentials only when allowed');
      const section = await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label');
      await ensureResourceSectionIsExpanded(section);
      await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
      const adorner = await waitFor('devtools-adorner');
      const count = await adorner.evaluate(el => el.textContent);
      assert.strictEqual(count, `${numberOfAggregatedIssues}`);
    }
    const header = [
      'Request',
      'Status',
      'Preflight Request (if problematic)',
      'Access-Control-Allow-Credentials Header Value',
    ];
    const expectedRow1 = [
      'acac-invalid.rawresponse',
      'blocked',
      'acac-invalid.rawresponse',
      'false',
    ];
    const expectedRow2 = [
      'acac-invalid.rawresponse',
      'blocked',
      '',
      'false',
    ];
    await waitForResources(2, [header, expectedRow1, expectedRow2]);
    await setCheckBox('[title="Include cookie Issues caused by third-party sites"]', true);

    // Trigger issue again to see if resources are updated.
    await triggerIssue();
    await waitForResources(4, [header, expectedRow1, expectedRow2, expectedRow1, expectedRow2]);
  });
});
