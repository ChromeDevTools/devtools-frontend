// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
} from '../../e2e/helpers/issues-helpers.js';

describe('Hide issues menu', () => {
  it('should become visible on hovering over the issue header', async ({devToolsPage}) => {
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'HeavyAdIssue',
        details: {
          heavyAdIssueDetails: {
            resolution: 'HeavyAdBlocked',
            reason: 'NetworkTotalLimit',
            frame: {frameId: 'main'},
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
    });
    await devToolsPage.evaluate(() => {
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
      // @ts-expect-error
      window.addIssueForTest(issue);
    });

    await navigateToIssuesTab(devToolsPage);
    const issueTitle = 'Deprecated feature used';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    assert.isOk(issueHeader);
    const hideIssuesMenu = await getHideIssuesMenu(issueHeader, devToolsPage);
    let menuDisplay = await hideIssuesMenu.evaluate(
        node => window.getComputedStyle(node as HTMLElement).getPropertyValue('visibility'));
    assert.strictEqual(menuDisplay, 'hidden');
    await issueHeader.hover();
    menuDisplay = await hideIssuesMenu.evaluate(
        node => window.getComputedStyle(node as HTMLElement).getPropertyValue('visibility'));
    assert.strictEqual(menuDisplay, 'visible');
  });

  it('should open a context menu upon clicking', async ({devToolsPage, inspectedPage}) => {
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
    const issueTitle = 'Ensure credentialed requests are not sent to CORS resources with origin wildcards';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    const hideIssuesMenu = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenu.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    const content = await menuItem!.evaluate(node => node.textContent);
    assert.isOk(content);
    assert.include(content, 'Hide issues like this');
  });

  it('should hide issue upon clicking the context menu entry', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);

    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    await devToolsPage.waitFor(ISSUE);
    await menuItem!.click();
    await devToolsPage.waitFor('.hidden-issue');
  });

  it('should unhide all issues upon clicking unhide all issues button', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);

    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    await menuItem!.click();
    await devToolsPage.waitFor('.hidden-issue');
    const btn = await getUnhideAllIssuesBtn(devToolsPage);
    await btn.click();
    await devToolsPage.waitFor(ISSUE);
  });

  it('should contain unhide issues like this entry while hovering over a hidden issue',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/quirks-mode.html');
       await navigateToIssuesTab(devToolsPage);

       const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
       const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
       await issueHeader!.hover();
       let hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
       await hideIssuesMenuBtn.click();
       const menuItem = await getHideIssuesMenuItem(devToolsPage);
       await menuItem!.click();
       await devToolsPage.waitFor('.hidden-issue');
       const row = await getHiddenIssuesRow(devToolsPage);
       let isHidden = await row!.evaluate(node => node.classList.contains('hidden'));
       assert.isFalse(isHidden);
       await row!.click();
       const body = await getHiddenIssuesRowBody(devToolsPage);
       isHidden = await body!.evaluate(node => node.classList.contains('hidden'));
       assert.isFalse(isHidden);
       const hiddenIssueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
       await hiddenIssueHeader!.hover();
       hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
       await hideIssuesMenuBtn.click();
       await getUnhideIssuesMenuItem(devToolsPage);
     });

  it('should unhide issue after clicking the unhide issues like this entry', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);

    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    let hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    await menuItem!.click();
    await devToolsPage.waitFor('.hidden-issue');
    const row = await getHiddenIssuesRow(devToolsPage);
    let isHidden = await row!.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    await row!.click();
    const body = await getHiddenIssuesRowBody(devToolsPage);
    isHidden = await body!.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const hiddenIssueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await hiddenIssueHeader!.hover();
    hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const unhideMenuItem = await getUnhideIssuesMenuItem(devToolsPage);
    await unhideMenuItem?.click();
    await devToolsPage.waitFor(ISSUE);
  });
});

describe('After enabling grouping by IssueKind, Hide issues menu', () => {
  it('should be appended to the issue kinds group header', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);
    if (!await getGroupByKindChecked(devToolsPage)) {
      await toggleGroupByKind(devToolsPage);
    }
    await devToolsPage.waitFor('.issue-kind');
    await (await devToolsPage.waitFor('.issue-kind .header')).hover();
    const hideIssuesMenu = await devToolsPage.waitFor('.hide-available-issues');
    assert.isNotNull(hideIssuesMenu);
  });

  it('should hide all available issues upon click menu entry', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);
    if (!await getGroupByKindChecked(devToolsPage)) {
      await toggleGroupByKind(devToolsPage);
    }
    await devToolsPage.waitFor('.issue-kind');
    assert.isEmpty(await devToolsPage.$$('.hidden-issue'));
    await (await devToolsPage.waitFor('.issue-kind .header')).hover();
    const hideIssuesMenu = await devToolsPage.waitFor('.hide-available-issues');
    await hideIssuesMenu.click();
    const menuItem = await devToolsPage.waitFor('[aria-label="Hide all current Page Errors"]');
    await menuItem.click();
    await devToolsPage.waitFor('.hidden-issue');
  });
});
