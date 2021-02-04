// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$$, click, waitFor, waitForClass, waitForFunction} from '../../shared/helper.js';
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
export const BLOCKED_STATUS = '.affected-resource-blocked-status';
export const REPORT_ONLY_STATUS = '.affected-resource-report-only-status';
export const RESOURCES_LABEL = '.affected-resource-label';

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

export async function getIssueByTitle(issueMessage: string): Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await waitFor(ISSUE_TITLE);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, issueMessage);
  const header = await issueMessageElement.evaluateHandle(el => el.parentElement);
  if (header) {
    const headerClassList = await header.evaluate(el => el.classList.toString());
    assert.include(headerClassList, 'header');
    const issue = await header.evaluateHandle(el => el.parentElement.nextSibling);
    if (issue) {
      return issue as puppeteer.ElementHandle<HTMLElement>;
    }
  }
  return undefined;
}

export async function assertStatus(status: 'blocked'|'report-only') {
  const classStatus = status === 'blocked' ? BLOCKED_STATUS : REPORT_ONLY_STATUS;
  const issueMessageElement = await waitFor(classStatus);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, status);
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

interface IssueResourceSection {
  label: puppeteer.ElementHandle<Element>;
  content: puppeteer.ElementHandle<Element>;
}

export async function getResourcesElement(
    resourceName: string, issueElement?: puppeteer.ElementHandle<Element>|undefined): Promise<IssueResourceSection> {
  return await waitForFunction(async () => {
    const elements = await $$(RESOURCES_LABEL, issueElement);
    for (const el of elements) {
      const text = await el.evaluate(el => el.textContent);
      if (text && text.includes(resourceName)) {
        const content = await el.evaluateHandle(el => el.parentElement && el.parentElement.nextSibling);
        return {label: el, content: content as puppeteer.ElementHandle<Element>};
      }
    }
    return undefined;
  });
}

export async function expandResourceSection(section: IssueResourceSection) {
  await section.label.evaluate(el => {
    el.scrollIntoView();
  });
  await section.label.click();
  await waitForClass(section.content, 'expanded');
}

export async function extractTableFromResourceSection(resourceContentElement: puppeteer.ElementHandle<Element>) {
  const table = await resourceContentElement.$('.affected-resource-list');
  if (table) {
    return await table.evaluate(table => {
      const rows = [];
      for (const tableRow of table.childNodes) {
        const row = [];
        for (const cell of tableRow.childNodes) {
          row.push(cell.textContent);
        }
        rows.push(row);
      }
      return rows;
    });
  }
  return null;
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
