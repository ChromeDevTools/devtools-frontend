// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  assertNotNullOrUndefined,
  getBrowserAndPages,
  goToResource,
  waitFor,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getGroupByKindChecked,
  getHiddenIssuesRow,
  getHiddenIssuesRowBody,
  getHideIssuesMenu,
  getHideIssuesMenuItem,
  getIssueHeaderByTitle,
  getUnhideAllIssuesBtn,
  getUnhideIssuesMenuItem,
  ISSUE,
  navigateToIssuesTab,
  toggleGroupByKind,
} from '../helpers/issues-helpers.js';

describe('Hide issues menu', async () => {
  it('should become visible on hovering over the issue header', async () => {
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'HeavyAdIssue',
        'details': {
          'heavyAdIssueDetails': {
            'resolution': 'HeavyAdBlocked',
            'reason': 'NetworkTotalLimit',
            'frame': {frameId: 'main'},
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });
    frontend.evaluate(() => {
      const issue = {
        code: 'DeprecationIssue',
        details: {
          deprecationIssueDetails: {
            sourceCodeLocation: {
              url: 'empty.html',
              lineNumber: 1,
              columnNumber: 1,
            },
            type: 'PrivacySandboxExtensionsAPI',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });

    await navigateToIssuesTab();
    const issueTitle = 'Deprecated feature used';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    const hideIssuesMenu = await getHideIssuesMenu(issueHeader);
    let menuDisplay = await hideIssuesMenu.evaluate(
        node => window.getComputedStyle(node as HTMLElement).getPropertyValue('visibility'));
    assert.strictEqual(menuDisplay, 'hidden');
    await issueHeader.hover();
    menuDisplay = await hideIssuesMenu.evaluate(
        node => window.getComputedStyle(node as HTMLElement).getPropertyValue('visibility'));
    assert.strictEqual(menuDisplay, 'visible');
  });

  it('should open a context menu upon clicking', async () => {
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
    const issueTitle = 'Ensure credentialed requests are not sent to CORS resources with origin wildcards';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    await issueHeader.hover();
    const hideIssuesMenu = await getHideIssuesMenu();
    await hideIssuesMenu.click();
    const menuItem = await getHideIssuesMenuItem();
    assertNotNullOrUndefined(menuItem);
    const content = await menuItem.evaluate(node => node.textContent);
    assertNotNullOrUndefined(content);
    assert.include(content, 'Hide issues like this');
  });

  it('should hide issue upon clicking the context menu entry', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();

    const issueTitle = 'Cross-origin portal post messages are blocked on your site';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    await issueHeader.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem();
    assertNotNullOrUndefined(menuItem);
    await waitFor(ISSUE);
    await menuItem.click();
    await waitFor('.hidden-issue');
  });

  it('should unhide all issues upon clicking unhide all issues button', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();
    const issueTitle = 'Cross-origin portal post messages are blocked on your site';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    await issueHeader.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem();
    assertNotNullOrUndefined(menuItem);
    await menuItem.click();
    await waitFor('.hidden-issue');
    const btn = await getUnhideAllIssuesBtn();
    await btn.click();
    await waitFor(ISSUE);
  });

  it('should contain unhide issues like this entry while hovering over a hidden issue', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();
    const issueTitle = 'Cross-origin portal post messages are blocked on your site';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    await issueHeader.hover();
    let hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem();
    assertNotNullOrUndefined(menuItem);
    await menuItem.click();
    await waitFor('.hidden-issue');
    const row = await getHiddenIssuesRow();
    let isHidden = await row?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    await row?.click();
    const body = await getHiddenIssuesRowBody();
    isHidden = await body?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const hiddenIssueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(hiddenIssueHeader);
    await hiddenIssueHeader.hover();
    hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    await getUnhideIssuesMenuItem();
  });

  it('should unhide issue after clicking the unhide issues like this entry', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();
    const issueTitle = 'Cross-origin portal post messages are blocked on your site';
    const issueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(issueHeader);
    await issueHeader.hover();
    let hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem();
    assertNotNullOrUndefined(menuItem);
    await menuItem.click();
    await waitFor('.hidden-issue');
    const row = await getHiddenIssuesRow();
    let isHidden = await row?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    await row?.click();
    const body = await getHiddenIssuesRowBody();
    isHidden = await body?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const hiddenIssueHeader = await getIssueHeaderByTitle(issueTitle);
    assertNotNullOrUndefined(hiddenIssueHeader);
    await hiddenIssueHeader.hover();
    hideIssuesMenuBtn = await getHideIssuesMenu();
    await hideIssuesMenuBtn.click();
    const unhideMenuItem = await getUnhideIssuesMenuItem();
    await unhideMenuItem?.click();
    await waitFor(ISSUE);
  });
});

describe('After enabling grouping by IssueKind, Hide issues menu', async () => {
  it('should be appended to the issue kinds group header', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();
    if (!await getGroupByKindChecked()) {
      await toggleGroupByKind();
    }
    await waitFor('.issue-kind');
    await (await waitFor('.issue-kind .header')).hover();
    const hideIssuesMenu = await waitFor('.hide-available-issues');
    assert.isNotNull(hideIssuesMenu);
  });

  it('should hide all available issues upon click menu entry', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();
    if (!await getGroupByKindChecked()) {
      await toggleGroupByKind();
    }
    await waitFor('.issue-kind');
    assert.isEmpty(await $$('.hidden-issue'));
    await (await waitFor('.issue-kind .header')).hover();
    const hideIssuesMenu = await waitFor('.hide-available-issues');
    await hideIssuesMenu.click();
    const menuItem = await waitFor('[aria-label="Hide all current Page Errors"]');
    await menuItem.click();
    await waitFor('.hidden-issue');
  });
});
