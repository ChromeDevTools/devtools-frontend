// Copyright 2021 The Chromium Authors. All rights reserved.
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

describe('IssueView cache', () => {
  it('should correctly update the issue', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    async function triggerIssue() {
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
    }
    await triggerIssue();
    await navigateToIssuesTab(devToolsPage);
    async function waitForResources(numberOfAggregatedIssues: number, expectedTableRows: string[][]) {
      await devToolsPage.waitForFunction(async () => {
        await expandIssue(devToolsPage);
        const issueElement =
            await getIssueByTitle('Ensure CORS requests include credentials only when allowed', devToolsPage);
        assertNotNullOrUndefined(issueElement);
        const section =
            await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
        const text = await section.label.evaluate(el => el.textContent);
        const expected = numberOfAggregatedIssues === 1 ? '1 request' : `${numberOfAggregatedIssues} requests`;
        return text === expected;
      });
      const issueElement =
          await getIssueByTitle('Ensure CORS requests include credentials only when allowed', devToolsPage);
      assertNotNullOrUndefined(issueElement);
      const section =
          await getResourcesElement('requests', issueElement, '.cors-issue-affected-resource-label', devToolsPage);
      await ensureResourceSectionIsExpanded(section, devToolsPage);
      await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
      const adorner = await devToolsPage.waitFor('devtools-adorner');
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
    await devToolsPage.setCheckBox('[title="Include cookie Issues caused by third-party sites"]', true);

    // Trigger issue again to see if resources are updated.
    await triggerIssue();
    await waitForResources(4, [header, expectedRow1, expectedRow2, expectedRow1, expectedRow2]);
  });
});
