// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
  $textContent,
  click,
  clickElement,
  hasClass,
  matchStringTable,
  waitFor,
  waitForClass,
  waitForFunction,
} from '../../shared/helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';

export const CATEGORY = '.issue-category:not(.hidden-issues)';
export const KIND = '.issue-kind';
export const CATEGORY_NAME = '.issue-category .title';
export const CATEGORY_CHECKBOX = '[title^="Group displayed issues under"]';
export const KIND_CHECKBOX = '[title^="Group displayed issues as"]';
export const ISSUE = '.issue:not(.hidden-issue)';
export const ISSUE_TITLE = '.issue .title';
export const AFFECTED_ELEMENT_ICON = '.affected-resource-csp-info-node';
export const ELEMENT_REVEAL_ICON = '.element-reveal-icon';
export const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
export const SOURCES_LINK = '.affected-source-location > button';
export const BLOCKED_STATUS = '.affected-resource-blocked-status';
export const REPORT_ONLY_STATUS = '.affected-resource-report-only-status';
export const RESOURCES_LABEL = '.affected-resource-label';
export const HIDE_ISSUES_MENU = 'devtools-hide-issues-menu';
export const HIDE_THIS_ISSUE = 'Hide issues like this';
export const UNHIDE_THIS_ISSUE = 'Unhide issues like this';
export const UNHIDE_ALL_ISSUES = '.unhide-all-issues-button';

export async function getHideIssuesMenu(root?: puppeteer.JSHandle) {
  return await waitFor(HIDE_ISSUES_MENU, root);
}

export async function navigateToIssuesTab() {
  await openPanelViaMoreTools('Issues');
}

export async function getUnhideAllIssuesBtn() {
  const btn = await waitFor(UNHIDE_ALL_ISSUES);
  return btn;
}

export async function getHideIssuesMenuItem(): Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  const menuItem = await waitFor<HTMLElement>(`[aria-label="${HIDE_THIS_ISSUE}"]`);
  if (menuItem) {
    return menuItem;
  }
  return null;
}

export async function getUnhideIssuesMenuItem(): Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await waitFor(`[aria-label="${UNHIDE_THIS_ISSUE}"]`);
}

export async function getHiddenIssuesRow(): Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await waitFor('.hidden-issues');
}

export async function getHiddenIssuesRowBody(): Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await waitFor('.hidden-issues-body');
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

async function getIssueByTitleElement(issueMessageElement: puppeteer.ElementHandle<Element>):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const header =
      await issueMessageElement.evaluateHandle(el => el.parentElement) as puppeteer.ElementHandle<HTMLElement>;
  if (header) {
    const headerClassList = await header.evaluate(el => el.classList.toString());
    assert.include(headerClassList, 'header');
    const issue = (await header.evaluateHandle(el => el.parentElement?.nextSibling)).asElement();
    if (issue) {
      return issue as puppeteer.ElementHandle<HTMLElement>;
    }
  }
  return undefined;
}

// Only works if there is just a single issue.
export async function getIssueByTitle(issueMessage: string): Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await waitFor(ISSUE_TITLE);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, issueMessage);
  return getIssueByTitleElement(issueMessageElement);
}

// Works also if there are multiple issues.
export async function getAndExpandSpecificIssueByTitle(issueMessage: string):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await waitForFunction(async () => {
    const issueElements = await $$(ISSUE_TITLE);
    for (const issueElement of issueElements) {
      const message = await issueElement.evaluate(issueElement => issueElement.textContent);
      if (message === issueMessage) {
        return issueElement;
      }
    }
    return undefined;
  });
  await clickElement(issueMessageElement);
  await waitFor('.message');
  return getIssueByTitleElement(issueMessageElement);
}

export async function getIssueHeaderByTitle(issueMessage: string):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await waitForFunction(async () => await $textContent(issueMessage) ?? undefined);
  const header =
      await issueMessageElement.evaluateHandle(el => el.parentElement) as puppeteer.ElementHandle<HTMLElement>;
  if (header) {
    return header;
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

export async function expandKind(classSelector: string) {
  const kindElement = await waitFor(`${KIND}${classSelector}`);
  const isKindExpanded = await kindElement.evaluate(node => node.classList.contains('expanded'));
  if (!isKindExpanded) {
    await kindElement.click();
  }
  await waitFor(ISSUE);
}

export async function expandIssue() {
  if (await getGroupByCategoryChecked()) {
    await expandCategory();
  }

  const issue = await waitFor(ISSUE);
  await clickElement(issue);
  await waitFor('.message');
}

interface IssueResourceSection {
  label: puppeteer.ElementHandle<Element>;
  content: puppeteer.ElementHandle<Element>;
}

export async function getResourcesElement(
    resourceName: string, issueElement?: puppeteer.ElementHandle<Element>|undefined,
    className?: string): Promise<IssueResourceSection> {
  return await waitForFunction(async () => {
    const elements = await $$(className ?? RESOURCES_LABEL, issueElement);
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

export async function ensureResourceSectionIsExpanded(section: IssueResourceSection) {
  await section.label.evaluate(el => {
    el.scrollIntoView();
  });
  const isExpanded = await hasClass(section.content, 'expanded');
  if (!isExpanded) {
    await section.label.click();
  }
  await waitForClass(section.content, 'expanded');
}

async function extractTableFromResourceSection(resourceContentElement: puppeteer.ElementHandle<Element>):
    Promise<string[][]|undefined> {
  const table = await resourceContentElement.$('.affected-resource-list');
  if (table) {
    return await table.evaluate(table => {
      const rows = [];
      for (const tableRow of table.childNodes) {
        const row = [];
        for (const cell of tableRow.childNodes) {
          const requestLinkIcon = cell instanceof HTMLElement && cell.querySelector('devtools-request-link-icon');
          if (requestLinkIcon) {
            const label = requestLinkIcon.shadowRoot?.querySelector('[aria-label="Shortened URL"]');
            row.push(label?.textContent || '');
          } else {
            row.push(cell.textContent || '');
          }
        }
        rows.push(row);
      }
      return rows;
    });
  }
  return undefined;
}

export async function waitForTableFromResourceSection(
    resourceContentElement: puppeteer.ElementHandle<Element>,
    predicate: (table: string[][]) => true | undefined): Promise<string[][]> {
  return await waitForFunction(async () => {
    const table = await extractTableFromResourceSection(resourceContentElement);
    if (!table || predicate(table) !== true) {
      return undefined;
    }
    return table;
  });
}

export function waitForTableFromResourceSectionContents(
    resourceContentElement: puppeteer.ElementHandle<Element>, expected: (string|RegExp)[][]): Promise<string[][]> {
  return waitForTableFromResourceSection(
      resourceContentElement, table => matchStringTable(table, expected) === true ? true : undefined);
}

export async function getGroupByCategoryChecked() {
  const categoryCheckbox = await waitFor(CATEGORY_CHECKBOX);
  return await categoryCheckbox.evaluate(node => (node as HTMLInputElement).checked);
}

export async function getGroupByKindChecked() {
  const categoryCheckbox = await waitFor(KIND_CHECKBOX);
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

export async function toggleGroupByKind() {
  const wasChecked = await getGroupByKindChecked();
  const kindCheckbox = await waitFor(KIND_CHECKBOX);

  // Invoke `click()` directly on the checkbox to toggle while hidden.
  await kindCheckbox.evaluate(checkbox => (checkbox as HTMLInputElement).click());

  if (wasChecked) {
    await waitFor(ISSUE);
  } else {
    await waitFor(KIND);
  }
}
