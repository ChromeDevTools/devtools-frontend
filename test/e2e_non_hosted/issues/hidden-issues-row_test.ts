// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getHiddenIssuesRow,
  getHiddenIssuesRowBody,
  getHideIssuesMenu,
  getHideIssuesMenuItem,
  getIssueHeaderByTitle,
  ISSUE,
  navigateToIssuesTab,
} from '../../e2e/helpers/issues-helpers.js';

describe('Hide issues row', () => {
  it('should be visible after hiding an issue', async ({devToolsPage, inspectedPage}) => {
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
    const hiddenIssuesRow = await getHiddenIssuesRow(devToolsPage);
    const isHidden = await hiddenIssuesRow?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
  });

  it('should expand after clicking', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);

    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    await menuItem!.click();
    const hiddenIssuesRow = await getHiddenIssuesRow(devToolsPage);
    let isHidden = await hiddenIssuesRow?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    await hiddenIssuesRow?.click();
    const hiddenIssuesRowBody = await getHiddenIssuesRowBody(devToolsPage);
    isHidden = await hiddenIssuesRowBody?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const classes = await hiddenIssuesRow?.evaluate(node => node.classList.toString());
    assert.include(classes, 'expanded');
  });

  it('should contain issue after clicking', async ({devToolsPage, inspectedPage}) => {
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
    const hiddenIssuesRow = await getHiddenIssuesRow(devToolsPage);
    let isHidden = await hiddenIssuesRow?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    await hiddenIssuesRow?.click();
    const hiddenIssuesRowBody = await getHiddenIssuesRowBody(devToolsPage);
    isHidden = await hiddenIssuesRowBody?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const firstChild = await hiddenIssuesRowBody?.$eval('.issue', node => node.classList.toString());
    assert.isOk(firstChild);
    assert.include(firstChild, 'hidden-issue');
  });

  it('should contain Unhide all issues button', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);

    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
    await issueHeader!.hover();
    const hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
    await hideIssuesMenuBtn.click();
    const menuItem = await getHideIssuesMenuItem(devToolsPage);
    await menuItem!.click();
    const hiddenIssuesRow = await getHiddenIssuesRow(devToolsPage);
    const isHidden = await hiddenIssuesRow?.evaluate(node => node.classList.contains('hidden'));
    assert.isFalse(isHidden);
    const hasUnhideAllIssuesBtn = await hiddenIssuesRow?.evaluate(
        node => node.lastElementChild?.lastElementChild?.classList.contains('unhide-all-issues-button'));
    assert.isTrue(hasUnhideAllIssuesBtn);
  });

  it('should get hidden and unhide all issues upon clicking unhide all issues button',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/quirks-mode.html');
       await navigateToIssuesTab(devToolsPage);

       const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
       const issueHeader = await getIssueHeaderByTitle(issueTitle, devToolsPage);
       await issueHeader!.hover();
       const hideIssuesMenuBtn = await getHideIssuesMenu(undefined, devToolsPage);
       await hideIssuesMenuBtn.click();
       const menuItem = await getHideIssuesMenuItem(devToolsPage);
       await menuItem!.click();
       const unhideAllIssuesbtn = await devToolsPage.waitFor('.unhide-all-issues-button');
       await unhideAllIssuesbtn.click();
       const hiddenIssuesRow = await getHiddenIssuesRow(devToolsPage);
       const isHidden = await hiddenIssuesRow?.evaluate(node => node.classList.contains('hidden'));
       assert.isTrue(isHidden);
       await devToolsPage.waitFor(ISSUE);
     });
});
