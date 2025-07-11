// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {
  matchStringTable,
  waitFor,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

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

export async function getHideIssuesMenu(
    root?: puppeteer.ElementHandle, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.waitFor(HIDE_ISSUES_MENU, root);
}

export async function navigateToIssuesTab(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openPanelViaMoreTools('Issues', devToolsPage);
}

export async function getUnhideAllIssuesBtn(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const btn = await devToolsPage.waitFor(UNHIDE_ALL_ISSUES);
  return btn;
}

export async function getHideIssuesMenuItem(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  const menuItem = await devToolsPage.waitFor<HTMLElement>(`[aria-label="${HIDE_THIS_ISSUE}"]`);
  if (menuItem) {
    return menuItem;
  }
  return null;
}

export async function getUnhideIssuesMenuItem(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await devToolsPage.waitFor(`[aria-label="${UNHIDE_THIS_ISSUE}"]`);
}

export async function getHiddenIssuesRow(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await devToolsPage.waitFor('.hidden-issues');
}

export async function getHiddenIssuesRowBody(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|null> {
  return await devToolsPage.waitFor('.hidden-issues-body');
}

export async function assertCategoryName(
    categoryName: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const categoryNameElement = await devToolsPage.waitFor(CATEGORY_NAME);
  const selectedCategoryName = await categoryNameElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedCategoryName, categoryName);
}

export async function assertIssueTitle(
    issueMessage: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const issueMessageElement = await devToolsPage.waitFor(ISSUE_TITLE);
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
export async function getIssueByTitle(
    issueMessage: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await devToolsPage.waitFor(ISSUE_TITLE);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, issueMessage);
  return await getIssueByTitleElement(issueMessageElement);
}

// Works also if there are multiple issues.
export async function getAndExpandSpecificIssueByTitle(
    issueMessage: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await devToolsPage.waitForFunction(async () => {
    const issueElements = await devToolsPage.$$(ISSUE_TITLE);
    for (const issueElement of issueElements) {
      const message = await issueElement.evaluate(issueElement => issueElement.textContent);
      if (message === issueMessage) {
        return issueElement;
      }
    }
    return undefined;
  });
  await devToolsPage.clickElement(issueMessageElement);
  await devToolsPage.waitFor('.message');
  return await getIssueByTitleElement(issueMessageElement);
}

export async function getIssueHeaderByTitle(
    issueMessage: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<HTMLElement>|undefined> {
  const issueMessageElement = await devToolsPage.waitForFunction(
      async () => await devToolsPage.$textContent(issueMessage, undefined) ?? undefined);
  const header =
      await issueMessageElement.evaluateHandle(el => el.parentElement) as puppeteer.ElementHandle<HTMLElement>;
  if (header) {
    return header;
  }
  return undefined;
}

export async function assertStatus(
    status: 'blocked'|'report-only', devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const classStatus = status === 'blocked' ? BLOCKED_STATUS : REPORT_ONLY_STATUS;
  const issueMessageElement = await devToolsPage.waitFor(classStatus);
  const selectedIssueMessage = await issueMessageElement.evaluate(node => node.textContent);
  assert.strictEqual(selectedIssueMessage, status);
}

export async function expandCategory(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const categoryElement = await devToolsPage.waitFor(CATEGORY);
  const isCategoryExpanded = await categoryElement.evaluate(node => node.classList.contains('expanded'));

  if (!isCategoryExpanded) {
    await devToolsPage.click(CATEGORY);
  }

  await devToolsPage.waitFor(ISSUE);
}

export async function expandKind(
    classSelector: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const kindElement = await devToolsPage.waitFor(`${KIND}${classSelector}`);
  const isKindExpanded = await kindElement.evaluate(node => node.classList.contains('expanded'));
  if (!isKindExpanded) {
    await kindElement.click();
  }
  await devToolsPage.waitFor(ISSUE);
}

export async function expandIssue(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  if (await getGroupByCategoryChecked(devToolsPage)) {
    await expandCategory(devToolsPage);
  }

  const issue = await devToolsPage.waitFor(ISSUE);
  await devToolsPage.clickElement(issue);
  await devToolsPage.waitFor('.message');
}

interface IssueResourceSection {
  label: puppeteer.ElementHandle<Element>;
  content: puppeteer.ElementHandle<Element>;
}

export async function getResourcesElement(
    resourceName: string, issueElement?: puppeteer.ElementHandle<Element>|undefined, className?: string,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<IssueResourceSection> {
  return await devToolsPage.waitForFunction(async () => {
    const elements = await devToolsPage.$$(className ?? RESOURCES_LABEL, issueElement);
    for (const el of elements) {
      const text = await el.evaluate(el => el.textContent);
      if (text?.includes(resourceName)) {
        const content = await el.evaluateHandle(el => el.parentElement?.nextSibling);
        return {label: el, content: content as puppeteer.ElementHandle<Element>};
      }
    }
    return undefined;
  });
}

export async function ensureResourceSectionIsExpanded(
    section: IssueResourceSection, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await section.label.evaluate(el => {
    el.scrollIntoView();
  });
  const isExpanded = await devToolsPage.hasClass(section.content, 'expanded');
  if (!isExpanded) {
    await section.label.click();
  }
  await devToolsPage.waitForClass(section.content, 'expanded');
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
    resourceContentElement: puppeteer.ElementHandle<Element>, predicate: (table: string[][]) => true | undefined,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[][]> {
  return await devToolsPage.waitForFunction(async () => {
    const table = await extractTableFromResourceSection(resourceContentElement);
    if (!table || predicate(table) !== true) {
      return undefined;
    }
    return table;
  });
}

export function waitForTableFromResourceSectionContents(
    resourceContentElement: puppeteer.ElementHandle<Element>, expected: Array<Array<string|RegExp>>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[][]> {
  return waitForTableFromResourceSection(
      resourceContentElement, table => matchStringTable(table, expected) === true ? true : undefined, devToolsPage);
}

export async function getGroupByCategoryChecked(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const categoryCheckbox = await devToolsPage.waitFor(CATEGORY_CHECKBOX);
  return await categoryCheckbox.evaluate(node => (node as HTMLInputElement).checked);
}

export async function getGroupByKindChecked(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const categoryCheckbox = await devToolsPage.waitFor(KIND_CHECKBOX);
  return await categoryCheckbox.evaluate(node => (node as HTMLInputElement).checked);
}

export async function revealNodeInElementsPanel() {
  const revealIcon = await waitFor(ELEMENT_REVEAL_ICON);
  await revealIcon.click();
}

export async function revealViolatingSourcesLines(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const sourcesLink = await devToolsPage.waitFor(SOURCES_LINK);
  await sourcesLink.click();
}

export async function toggleGroupByCategory(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const wasChecked = await getGroupByCategoryChecked(devToolsPage);
  const categoryCheckbox = await devToolsPage.waitFor(CATEGORY_CHECKBOX);

  // Invoke `click()` directly on the checkbox to toggle while hidden.
  await categoryCheckbox.evaluate(checkbox => (checkbox as HTMLInputElement).click());

  if (wasChecked) {
    await devToolsPage.waitFor(ISSUE);
  } else {
    await devToolsPage.waitFor(CATEGORY);
  }
}

export async function toggleGroupByKind(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const wasChecked = await getGroupByKindChecked(devToolsPage);
  const kindCheckbox = await devToolsPage.waitFor(KIND_CHECKBOX);

  // Invoke `click()` directly on the checkbox to toggle while hidden.
  await kindCheckbox.evaluate(checkbox => (checkbox as HTMLInputElement).click());

  if (wasChecked) {
    await devToolsPage.waitFor(ISSUE);
  } else {
    await devToolsPage.waitFor(KIND);
  }
}
