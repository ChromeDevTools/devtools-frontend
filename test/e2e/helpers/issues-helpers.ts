// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {click, waitFor} from '../../shared/helper.js';
import {openPanelViaMoreTools} from './settings-helpers';

export const CATEGORY = '.issue-category';
export const CATEGORY_NAME = '.issue-category .title';
export const CATEGORY_CHECKBOX = 'input[aria-label="Group by category"]';
export const ISSUE = '.issue';
export const ISSUE_TITLE = '.issue .title';
export const AFFECTED_ELEMENT_ICON = '.affected-resource-csp-info-node';
export const ELEMENT_REVEAL_ICON = '.element-reveal-icon';
export const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
export const SOURCES_LINK = '.affected-source-location > span';

export async function navigateToIssuesTab() {
  await openPanelViaMoreTools('Issues');
}

export async function assertCategoryName(categoryName: string) {
  const categoryNameElement = await waitFor(CATEGORY_NAME);
  const selectedCategoryName = await categoryNameElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedCategoryName, categoryName);
}

export async function assertIssueTitle(issueMessage: string) {
  const issueMessageElement = await waitFor(ISSUE_TITLE);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, issueMessage);
}

export async function expandCategory() {
  const categoryElement = await waitFor(CATEGORY);
  const isCategoryExpanded = await categoryElement.evaluate(node => node.classList.contains('expanded'));

  if (!isCategoryExpanded) {
    await click(CATEGORY);
  }

  await waitFor(ISSUE);
}

export async function expandIssue() {
  if (await getGroupByCategoryChecked()) {
    await expandCategory();
  }

  await waitFor(ISSUE);
  await click(ISSUE);
  await waitFor('.message');
}

export async function getGroupByCategoryChecked() {
  const categoryCheckbox = await waitFor(CATEGORY_CHECKBOX);
  return await categoryCheckbox.evaluate(node => (node as HTMLInputElement).checked);
}

export async function revealNodeInElementsPanel() {
  const revealIcon = await waitFor(ELEMENT_REVEAL_ICON);
  await revealIcon.click();
}

export async function revealViolatingSourcesLines() {
  const sourcesLink = await waitFor(SOURCES_LINK);
  await sourcesLink.click();
}

export async function toggleGroupByCategory() {
  const wasChecked = await getGroupByCategoryChecked();
  const categoryCheckbox = await waitFor(CATEGORY_CHECKBOX);

  // Invoke `click()` directly on the checkbox to toggle while hidden.
  await categoryCheckbox.evaluate(checkbox => (checkbox as HTMLInputElement).click());

  if (wasChecked) {
    await waitFor(ISSUE);
  } else {
    await waitFor(CATEGORY);
  }
}
