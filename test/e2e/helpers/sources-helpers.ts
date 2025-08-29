// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../conductor/paths.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {
  $$,
  click,
  clickMoreTabsButton,
  getBrowserAndPages,
  platform,
  pressKey,
  typeText,
  waitFor,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openSoftContextMenuAndClickOnItem} from './context-menu-helpers.js';
import {veImpression} from './visual-logging-helpers.js';

export const ACTIVE_LINE = '.CodeMirror-activeline > pre > span';
export const PAUSE_BUTTON = '[aria-label="Pause script execution"]';
export const RESUME_BUTTON = '[aria-label="Resume script execution"]';
export const SOURCES_LINES_SELECTOR = '.CodeMirror-code > div';
export const PAUSE_INDICATOR_SELECTOR = '.paused-status';
export const CODE_LINE_COLUMN_SELECTOR = '.cm-lineNumbers';
export const CODE_LINE_SELECTOR = '.cm-lineNumbers .cm-gutterElement';
export const SCOPE_LOCAL_VALUES_SELECTOR = 'li[aria-label="Local"] + ol';
export const THREADS_SELECTOR = '[aria-label="Threads"]';
export const SELECTED_THREAD_SELECTOR = 'div.thread-item.selected > div.thread-item-title';
export const STEP_INTO_BUTTON = '[aria-label="Step into next function call"]';
export const STEP_OVER_BUTTON = '[aria-label="Step over next function call"]';
export const STEP_OUT_BUTTON = '[aria-label="Step out of current function"]';
export const TURNED_ON_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-on';
export const DEBUGGER_PAUSED_EVENT = 'DevTools.DebuggerPaused';
const WATCH_EXPRESSION_VALUE_SELECTOR = '.watch-expression-tree-item .object-value-string.value';
export const OVERRIDES_TAB_SELECTOR = '[aria-label="Overrides"]';
export const ENABLE_OVERRIDES_SELECTOR = '[aria-label="Select folder for overrides"]';
const CLEAR_CONFIGURATION_SELECTOR = '[aria-label="Clear configuration"]';
export const PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR = '.pause-on-uncaught-exceptions';
export const BREAKPOINT_ITEM_SELECTOR = '.breakpoint-item';

export async function toggleNavigatorSidebar(frontend: puppeteer.Page) {
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.down('Shift');
  await frontend.keyboard.press('y');
  await frontend.keyboard.up('Shift');
  await frontend.keyboard.up(modifierKey);
}

export async function toggleDebuggerSidebar(frontend: puppeteer.Page) {
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.down('Shift');
  await frontend.keyboard.press('h');
  await frontend.keyboard.up('Shift');
  await frontend.keyboard.up(modifierKey);
}

export async function getLineNumberElement(
    lineNumber: number|string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.waitForFunction(async () => {
    const visibleLines = await devToolsPage.$$(CODE_LINE_SELECTOR);
    for (let i = 0; i < visibleLines.length; i++) {
      const lineValue = await visibleLines[i].evaluate(node => (node as HTMLElement).innerText);
      if (lineValue === `${lineNumber}`) {
        return visibleLines[i];
      }
    }
    return null;
  });
}

export async function doubleClickSourceTreeItem(
    selector: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(selector, {clickOptions: {clickCount: 2, offset: {x: 40, y: 10}}});
}

export async function waitForSourcesPanel(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<void> {
  // Wait for the navigation panel to show up
  await devToolsPage.waitFor('.navigator-file-tree-item, .empty-state');
}

export async function openSourcesPanel(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // Locate the button for switching to the sources tab.
  await devToolsPage.click('#tab-sources');
  await waitForSourcesPanel(devToolsPage);
  return await devToolsPage.waitForAria('sources');
}

export async function openFileInSourcesPanel(
    testInput: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await inspectedPage.goToResource(`sources/${testInput}`);

  await openSourcesPanel(devToolsPage);
}

export async function openRecorderSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');
  await clickMoreTabsButton(root);
  await click('[aria-label="Recordings"]');
  await waitFor('[aria-label="Add recording"]');
}

export async function createNewRecording(recordingName: string) {
  const {frontend} = getBrowserAndPages();

  await click('[aria-label="Add recording"]');
  await waitFor('[aria-label^="Recording"]');

  await typeText(recordingName);

  await frontend.keyboard.press('Enter');
}

export async function openSnippetsSubPane(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const root = await devToolsPage.waitFor('.navigator-tabbed-pane');
  await clickMoreTabsButton(root, devToolsPage);
  await devToolsPage.click('[aria-label="Snippets"]');
  await devToolsPage.waitFor('[aria-label="New snippet"]');
}

/**
 * Creates a new snippet, optionally pre-filling it with the provided content.
 * `snippetName` must not contain spaces or special characters, otherwise
 * `createNewSnippet` will time out.
 * DevTools uses the escaped snippet name for the ARIA label. `createNewSnippet`
 * doesn't mirror the escaping so it won't be able to wait for the snippet
 * entry in the navigation tree to appear.
 */
export async function createNewSnippet(
    snippetName: string, content?: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('[aria-label="New snippet"]');
  await devToolsPage.waitFor('[aria-label^="Script snippet"]');

  await devToolsPage.typeText(snippetName);

  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor(`[aria-label*="${snippetName}"]`);

  if (content) {
    await devToolsPage.pasteText(content);
    await devToolsPage.pressKey('s', {control: true});
  }
}

export async function openWorkspaceSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');
  await click('[aria-label="Workspace"]', {root});
  await waitFor('[aria-label="Workspace panel"]');
}

export async function openOverridesSubPane(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const root = await devToolsPage.waitFor('.navigator-tabbed-pane');
  await clickMoreTabsButton(root, devToolsPage);
  await devToolsPage.click('[aria-label="Overrides"]');
  await devToolsPage.waitFor('[aria-label="Overrides panel"]');
}

export async function openFileInEditor(
    sourceFile: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await waitForSourceFiles(
      SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith(sourceFile)),
      // Open a particular file in the editor
      () => doubleClickSourceTreeItem(`[aria-label="${sourceFile}, file"]`, devToolsPage), devToolsPage);
}

export async function openSourceCodeEditorForFile(
    sourceFile: string, testInput: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await openFileInSourcesPanel(testInput, devToolsPage, inspectedPage);
  await openFileInEditor(sourceFile, devToolsPage);
}

export async function getSelectedSource(): Promise<string> {
  const sourceTabPane = await waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await waitFor('.tabbed-pane-header-tab.selected', sourceTabPane);
  return await (sourceTabs.evaluate(node => node.getAttribute('aria-label')) as Promise<string>);
}

export async function getBreakpointHitLocation(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const breakpointHitHandle = await devToolsPage.waitFor('.breakpoint-item.hit');
  const locationHandle = await devToolsPage.waitFor('.location', breakpointHitHandle);
  const locationText = await locationHandle.evaluate(location => location.textContent);

  const groupHandle = await breakpointHitHandle.evaluateHandle(x => x.parentElement!);
  const groupHeaderTitleHandle = await devToolsPage.waitFor('.group-header-title', groupHandle);
  const groupHeaderTitle = await groupHeaderTitleHandle?.evaluate(header => header.textContent);

  return `${groupHeaderTitle}:${locationText}`;
}

export async function getOpenSources(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const sourceTabPane = await devToolsPage.waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await devToolsPage.waitFor('.tabbed-pane-header-tabs', sourceTabPane);
  const openSources =
      await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
  return openSources;
}

export async function waitForHighlightedLine(
    lineNumber: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const selectedLine = await devToolsPage.waitFor('.cm-highlightedLine');
    const currentlySelectedLineNumber = await selectedLine.evaluate(line => {
      return [...line.parentElement?.childNodes || []].indexOf(line);
    });
    const lineNumbers = await devToolsPage.waitFor('.cm-lineNumbers');
    const text = await lineNumbers.evaluate(
        (node, lineNumber) => node.childNodes[lineNumber].textContent, currentlySelectedLineNumber + 1);
    return Number(text) === lineNumber;
  });
}

export async function getToolbarText(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const toolbar = await devToolsPage.waitFor('.sources-toolbar');
  if (!toolbar) {
    return [];
  }
  const textNodes = await devToolsPage.$$('.toolbar-text', toolbar);
  return await Promise.all(textNodes.map(node => node.evaluate(node => node.textContent, node)));
}

export async function addBreakpointForLine(
    index: number|string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const breakpointLine = await getLineNumberElement(index, devToolsPage);
  assert.isOk(breakpointLine);

  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(index, devToolsPage)));
  await devToolsPage.clickElement(breakpointLine);

  await devToolsPage.waitForFunction(async () => await isBreakpointSet(index, devToolsPage));
}

export async function removeBreakpointForLine(
    index: number|string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const breakpointLine = await getLineNumberElement(index, devToolsPage);
  assert.isOk(breakpointLine);

  await devToolsPage.waitForFunction(async () => await isBreakpointSet(index, devToolsPage));
  await devToolsPage.clickElement(breakpointLine);
  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(index, devToolsPage)));
}

export async function addLogpointForLine(
    index: number, condition: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const breakpointLine = await getLineNumberElement(index, devToolsPage);
  assert.isOk(breakpointLine);

  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(index, devToolsPage)));
  await devToolsPage.clickElement(breakpointLine, {clickOptions: {button: 'right'}});

  await devToolsPage.click('aria/Add logpoint…');

  const editDialog = await devToolsPage.waitFor('.sources-edit-breakpoint-dialog');
  const conditionEditor = await devToolsPage.waitForAria('Code editor', editDialog);
  await conditionEditor.focus();

  await devToolsPage.typeText(condition);
  await devToolsPage.pressKey('Enter');

  await devToolsPage.waitForFunction(async () => await isBreakpointSet(index, devToolsPage));
}

export async function isBreakpointSet(
    lineNumber: number|string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const lineNumberElement = await getLineNumberElement(lineNumber, devToolsPage);
  const breakpointLineParentClasses = await lineNumberElement?.evaluate(n => n.className);
  return breakpointLineParentClasses?.includes('cm-breakpoint');
}

/**
 * @param lineNumber 1-based line number
 * @param index 1-based index of the inline breakpoint in the given line
 */
export async function enableInlineBreakpointForLine(
    line: number, index: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const decorationSelector = `pierce/.cm-content > :nth-child(${line}) > :nth-child(${index} of .cm-inlineBreakpoint)`;
  await devToolsPage.click(decorationSelector);
  await devToolsPage.waitForFunction(
      () => devToolsPage.page.$eval(
          decorationSelector, element => !element.classList.contains('cm-inlineBreakpoint-disabled')));
}

/**
 * @param lineNumber 1-based line number
 * @param index 1-based index of the inline breakpoint in the given line
 * @param expectNoBreakpoint If we should wait for the line to not have any inline breakpoints after
 *                           the click instead of a disabled one.
 */
export async function disableInlineBreakpointForLine(
    line: number, index: number, expectNoBreakpoint = false,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const decorationSelector = `pierce/.cm-content > :nth-child(${line}) > :nth-child(${index} of .cm-inlineBreakpoint)`;
  await devToolsPage.click(decorationSelector);
  if (expectNoBreakpoint) {
    await devToolsPage.waitForFunction(
        () => devToolsPage.page.$$eval(
            `pierce/.cm-content > :nth-child(${line}) > .cm-inlineBreakpoint`, elements => elements.length === 0));
  } else {
    await devToolsPage.waitForFunction(
        () => devToolsPage.page.$eval(
            decorationSelector, element => element.classList.contains('cm-inlineBreakpoint-disabled')));
  }
}

export async function checkBreakpointDidNotActivate(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // TODO(almuthanna): make sure this check happens at a point where the pause indicator appears if it was active

  // TODO: it should actually wait for rendering to finish.
  await devToolsPage.drainTaskQueue();
  await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);
}

export async function getBreakpointDecorators(
    disabledOnly = false, expected = 0, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const selector = `.cm-breakpoint${disabledOnly ? '-disabled' : ''}`;
  const breakpointDecorators = await devToolsPage.waitForMany(selector, expected);
  return await Promise.all(
      breakpointDecorators.map(breakpointDecorator => breakpointDecorator.evaluate(n => Number(n.textContent))));
}

export async function getNonBreakableLines(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const selector = '.cm-nonBreakableLine';
  await devToolsPage.waitFor(selector);
  const unbreakableLines = await devToolsPage.$$(selector);
  return await Promise.all(
      unbreakableLines.map(unbreakableLine => unbreakableLine.evaluate(n => Number(n.textContent))));
}

export async function executionLineHighlighted(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.waitFor('.cm-executionLine');
}

export async function getCallFrameNames(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const selector = '.call-frame-item:not(.hidden) .call-frame-item-title';
  await devToolsPage.waitFor(selector);
  const items = await devToolsPage.$$(selector);
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }
  return results;
}

export async function getCallFrameLocations(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const selector = '.call-frame-item:not(.hidden) .call-frame-location';
  await devToolsPage.waitFor(selector);
  const items = await devToolsPage.$$(selector);
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }
  return results;
}

export async function switchToCallFrame(
    index: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const selector = `.call-frame-item[aria-posinset="${index}"]`;
  await devToolsPage.click(selector);
  await devToolsPage.waitFor(selector + '[aria-selected="true"]');
}

export async function retrieveTopCallFrameScriptLocation(
    script: string, target: puppeteer.Page|InspectedPage,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // The script will run into a breakpoint, which means that it will not actually
  // finish the evaluation, until we continue executing.
  // Thus, we have to await it at a later point, while stepping through the code.
  const scriptEvaluation = target.evaluate(script);

  // Wait for the evaluation to be paused and shown in the UI
  // and retrieve the top level call frame script location name
  const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);

  // Resume the evaluation
  await devToolsPage.click(RESUME_BUTTON);

  // Make sure to await the context evaluate before asserting
  // Otherwise the Puppeteer process might crash on a failure assertion,
  // as its execution context is destroyed
  await scriptEvaluation;

  return scriptLocation;
}

export async function retrieveTopCallFrameWithoutResuming(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // Wait for the evaluation to be paused and shown in the UI
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

  // Retrieve the top level call frame script location name
  const locationHandle = await devToolsPage.waitFor('.call-frame-location');
  const scriptLocation = await locationHandle.evaluate(location => location.textContent);

  return scriptLocation;
}

export async function waitForStackTopMatch(matcher: RegExp, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // The call stack is updated asynchronously, so let us wait until we see the correct one
  // (or report the last one we have seen before timeout).
  let stepLocation = '<no call stack>';
  await devToolsPage.waitForFunctionWithTries(async () => {
    stepLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage) ?? '<invalid>';
    return stepLocation?.match(matcher);
  }, {tries: 10});
  return stepLocation;
}

export async function setEventListenerBreakpoint(
    groupName: string, eventName: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const eventListenerBreakpointsSection = await devToolsPage.waitForAria('Event Listener Breakpoints');
  const expanded = await eventListenerBreakpointsSection.evaluate(el => el.getAttribute('aria-expanded'));
  if (expanded !== 'true') {
    await devToolsPage.click('[aria-label="Event Listener Breakpoints"]');
    await devToolsPage.waitFor('[aria-label="Event Listener Breakpoints"][aria-expanded="true"]');
  }

  const eventSelector = `input[type="checkbox"][title="${eventName}"]`;
  const groupSelector = `input[type="checkbox"][title="${groupName}"]`;
  const groupCheckbox = await devToolsPage.waitFor(groupSelector);
  await devToolsPage.scrollElementIntoView(groupSelector);
  await devToolsPage.waitForVisible(groupSelector);
  const eventCheckbox = await devToolsPage.waitFor(eventSelector);
  if (!(await eventCheckbox.evaluate(x => x.checkVisibility()))) {
    // Unfortunately the shadow DOM makes it hard to find the expander element
    // we are attempting to click on, so we click to the left of the checkbox
    // bounding box.
    const rectData = await groupCheckbox.evaluate(element => {
      const {left, top, width, height} = element.getBoundingClientRect();
      return {left, top, width, height};
    });

    await devToolsPage.page.mouse.click(rectData.left - 10, rectData.top + rectData.height * .5);
    await devToolsPage.waitForVisible(eventSelector);
  }

  await devToolsPage.setCheckBox(eventSelector, true);
}

declare global {
  interface Window {
    /* eslint-disable @typescript-eslint/naming-convention */
    __sourceFileEvents: Map<number, {files: string[], handler: (e: Event) => void}>;
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export const enum SourceFileEvents {
  SOURCE_FILE_LOADED = 'source-file-loaded',
  ADDED_TO_SOURCE_TREE = 'source-tree-file-added',
}

let nextEventHandlerId = 0;
export async function waitForSourceFiles<T>(
    eventName: SourceFileEvents, waitCondition: (files: string[]) => boolean | Promise<boolean>, action: () => T,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<T> {
  const eventHandlerId = nextEventHandlerId++;

  // Install new listener for the event
  await devToolsPage.evaluate((eventName, eventHandlerId) => {
    if (!window.__sourceFileEvents) {
      window.__sourceFileEvents = new Map();
    }
    const handler = (event: Event) => {
      const {detail} = event as CustomEvent<string>;
      if (!detail.includes('pptr:')) {
        window.__sourceFileEvents.get(eventHandlerId)?.files.push(detail);
      }
    };
    window.__sourceFileEvents.set(eventHandlerId, {files: [], handler});
    window.addEventListener(eventName, handler);
  }, eventName, eventHandlerId);

  const result = await action();

  await devToolsPage.waitForFunction(async () => {
    const files = await devToolsPage.evaluate(
        eventHandlerId => window.__sourceFileEvents.get(eventHandlerId)?.files, eventHandlerId);
    assert.isOk(files);
    return await waitCondition(files);
  });

  await devToolsPage.evaluate((eventName, eventHandlerId) => {
    const handler = window.__sourceFileEvents.get(eventHandlerId);
    if (!handler) {
      throw new Error('handler unexpectedly unregistered');
    }
    window.__sourceFileEvents.delete(eventHandlerId);
    window.removeEventListener(eventName, handler.handler);
  }, eventName, eventHandlerId);

  return result;
}

export async function captureAddedSourceFiles(
    count: number, action: () => Promise<void>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[]> {
  let capturedFileNames!: string[];
  await waitForSourceFiles(SourceFileEvents.ADDED_TO_SOURCE_TREE, files => {
    capturedFileNames = files;
    return files.length >= count;
  }, action, devToolsPage);
  return capturedFileNames.map(f => new URL(`http://${f}`).pathname);
}

export async function reloadPageAndWaitForSourceFile(
    sourceFile: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await waitForSourceFiles(
      SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith(sourceFile)),
      () => inspectedPage.reload(), devToolsPage);
}

export function isEqualOrAbbreviation(abbreviated: string, full: string): boolean {
  const split = abbreviated.split('…');
  if (split.length === 1) {
    return abbreviated === full;
  }
  assert.lengthOf(split, 2);
  return full.startsWith(split[0]) && full.endsWith(split[1]);
}

// Helpers for navigating the file tree.
export interface NestedFileSelector {
  rootSelector: string;
  domainSelector: string;
  folderSelector?: string;
  fileSelector: string;
}

export function createSelectorsForWorkerFile(
    workerName: string, folderName: string, fileName: string, workerIndex = 1,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage): NestedFileSelector {
  const rootSelector = new Array(workerIndex).fill(`[aria-label="${workerName}, worker"]`).join(' ~ ');
  const domainSelector = `${rootSelector} + ol > [aria-label="localhost:${inspectedPage.serverPort}, domain"]`;
  const folderSelector = `${domainSelector} + ol > [aria-label^="${folderName}, "]`;
  const fileSelector = `${folderSelector} + ol > [aria-label="${fileName}, file"]`;

  return {
    rootSelector,
    domainSelector,
    folderSelector,
    fileSelector,
  };
}

async function isExpanded(sourceTreeItem: puppeteer.ElementHandle<Element>): Promise<boolean> {
  return await sourceTreeItem.evaluate(element => {
    return element.getAttribute('aria-expanded') === 'true';
  });
}

export async function expandSourceTreeItem(selector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  const sourceTreeItem = await devToolsPage.waitFor(selector);
  if (!await isExpanded(sourceTreeItem)) {
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await devToolsPage.timeout(50);
    await doubleClickSourceTreeItem(selector, devToolsPage);
  }
}

export async function expandFileTree(
    selectors: NestedFileSelector, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await expandSourceTreeItem(selectors.rootSelector, devToolsPage);
  await expandSourceTreeItem(selectors.domainSelector, devToolsPage);
  if (selectors.folderSelector) {
    await expandSourceTreeItem(selectors.folderSelector, devToolsPage);
  }
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  return await devToolsPage.waitFor(selectors.fileSelector);
}

export async function readSourcesTreeView(devToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[]> {
  const items = await devToolsPage.$$('.navigator-folder-tree-item,.navigator-file-tree-item');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

export async function readIgnoreListedSources(devToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<string[]> {
  const items =
      await devToolsPage.$$('.navigator-folder-tree-item.is-ignore-listed,.navigator-file-tree-item.is-ignore-listed');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

async function hasPausedEvents(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<boolean> {
  const events = await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  return Boolean(events?.length);
}

export async function stepThroughTheCode(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.page.keyboard.press('F9');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepIn(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.page.keyboard.press('F11');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepOver(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.page.keyboard.press('F10');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepOut(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.page.keyboard.down('Shift');
  await devToolsPage.page.keyboard.press('F11');
  await devToolsPage.page.keyboard.up('Shift');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));

  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function openNestedWorkerFile(
    selectors: NestedFileSelector, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await expandFileTree(selectors, devToolsPage);
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  await devToolsPage.click(selectors.fileSelector);
}

export async function inspectMemory(
    variableName: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openSoftContextMenuAndClickOnItem(
      `[data-object-property-name-for-test="${variableName}"]`,
      'Open in Memory inspector panel',
      devToolsPage,
  );
}

export async function typeIntoSourcesAndSave(text: string) {
  const pane = await waitFor('.sources');
  await pane.type(text);

  await pressKey('s', {control: true});
}

export async function getScopeNames(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const scopeElements = await devToolsPage.$$('.scope-chain-sidebar-pane-section-title');
  const scopeNames = await Promise.all(scopeElements.map(nodes => nodes.evaluate(n => n.textContent)));
  return scopeNames;
}

export async function getValuesForScope(
    scope: string, expandCount: number, waitForNoOfValues: number,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const scopeSelector = `[aria-label="${scope}"]`;
  await devToolsPage.waitFor(scopeSelector);
  for (let i = 0; i < expandCount; i++) {
    await devToolsPage.click(`${scopeSelector} + ol li[aria-expanded=false]`);
  }
  const valueSelector = `${scopeSelector} + ol .name-and-value`;
  async function readValues() {
    const valueSelectorElements = await devToolsPage.waitForMany(valueSelector, waitForNoOfValues);
    return await Promise.all(valueSelectorElements.map(elem => elem.evaluate(n => n.textContent as string)));
  }
  const previousValues = await readValues();
  return await devToolsPage.waitForFunction(async function() {
    const values = await readValues();
    if (values.join('') === previousValues.join('')) {
      return values;
    }
    return;
  });
}

export async function getPausedMessages(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const messageElement = await devToolsPage.page.waitForSelector('.paused-message');
  assert.isOk(messageElement, 'getPausedMessages: did not find .paused-message element.');
  const statusMain = await devToolsPage.waitFor('.status-main', messageElement);
  const statusSub = await devToolsPage.waitFor('.status-sub', messageElement);
  return {
    statusMain: await statusMain.evaluate(x => x.textContent),
    statusSub: await statusSub.evaluate(x => x.textContent),
  };
}

export async function getWatchExpressionsValues(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const expandedOption = await devToolsPage.$('.watch-expression-title');
    if (expandedOption) {
      return true;
    }
    await devToolsPage.click('[aria-label="Watch"]');
    // Wait for the click event to settle.
    await devToolsPage.timeout(100);
    return expandedOption !== null;
  });
  await devToolsPage.pressKey('ArrowRight');
  const watchExpressionValue = await devToolsPage.$(WATCH_EXPRESSION_VALUE_SELECTOR);
  if (!watchExpressionValue) {
    return null;
  }
  const values = await devToolsPage.$$(WATCH_EXPRESSION_VALUE_SELECTOR) as Array<puppeteer.ElementHandle<HTMLElement>>;
  return await Promise.all(values.map(value => value.evaluate(element => element.innerText)));
}

export async function runSnippet(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.pressKey('Enter', {control: true});
}

export async function evaluateSelectedTextInConsole(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.pressKey('E', {control: true, shift: true});
  // TODO: it should actually wait for rendering to finish. Note: it is
  // drained three times because rendering currently takes 3 dependent
  // tasks to finish.
  await devToolsPage.drainTaskQueue();
  await devToolsPage.drainTaskQueue();
  await devToolsPage.drainTaskQueue();
}

export async function addSelectedTextToWatches(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.pressKey('A', {control: true, shift: true});
}

export async function enableLocalOverrides(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openOverridesSubPane(devToolsPage);
  await devToolsPage.click(ENABLE_OVERRIDES_SELECTOR);
  await devToolsPage.waitFor(CLEAR_CONFIGURATION_SELECTOR);
}

export interface LabelMapping {
  label: string;
  moduleOffset: number;
  bytecode: number;
  sourceLine: number;
  labelLine: number;
  labelColumn: number;
}

export class WasmLocationLabels {
  readonly #mappings: Map<string, LabelMapping[]>;
  readonly #source: string;
  readonly #wasm: string;
  constructor(source: string, wasm: string, mappings: Map<string, LabelMapping[]>) {
    this.#mappings = mappings;
    this.#source = source;
    this.#wasm = wasm;
  }

  static load(source: string, wasm: string): WasmLocationLabels {
    const mapFileName = path.join(GEN_DIR, 'test', 'e2e', 'resources', `${wasm}.map.json`);
    const mapFile = JSON.parse(fs.readFileSync(mapFileName, {encoding: 'utf-8'})) as Array<{
                      source: string,
                      generatedLine: number,
                      generatedColumn: number,
                      bytecodeOffset: number,
                      originalLine: number,
                      originalColumn: number,
                    }>;
    const sourceFileName = path.join(GEN_DIR, 'test', 'e2e', 'resources', source);
    const sourceFile = fs.readFileSync(sourceFileName, {encoding: 'utf-8'});
    const labels = new Map<string, number>();
    for (const [index, line] of sourceFile.split('\n').entries()) {
      if (line.trim().startsWith(';;@')) {
        const label = line.trim().substr(3).trim();
        assert.isFalse(labels.has(label), `Label ${label} must be unique`);
        labels.set(label, index + 1);
      }
    }
    const mappings = new Map<string, LabelMapping[]>();
    for (const m of mapFile) {
      const entry = mappings.get(m.source) ?? [];
      if (entry.length === 0) {
        mappings.set(m.source, entry);
      }
      const labelLine = m.originalLine;
      const labelColumn = m.originalColumn;
      const sourceLine = labels.get(`${m.source}:${labelLine}:${labelColumn}`);
      assert.isOk(sourceLine);
      entry.push({
        label: m.source,
        moduleOffset: m.generatedColumn,
        bytecode: m.bytecodeOffset,
        sourceLine,
        labelLine,
        labelColumn,
      });
    }
    return new WasmLocationLabels(source, wasm, mappings);
  }

  async checkLocationForLabel(label: string) {
    const pauseLocation = await retrieveTopCallFrameWithoutResuming();
    const pausedLine = this.#mappings.get(label)!.find(
        line => pauseLocation === `${path.basename(this.#wasm)}:0x${line.moduleOffset.toString(16)}` ||
            pauseLocation === `${path.basename(this.#source)}:${line.sourceLine}`);
    assert.isOk(pausedLine);
    return pausedLine;
  }

  async addBreakpointsForLabelInSource(label: string) {
    await openFileInEditor(path.basename(this.#source));
    await Promise.all(this.#mappings.get(label)!.map(({sourceLine}) => addBreakpointForLine(sourceLine)));
  }

  async addBreakpointsForLabelInWasm(label: string) {
    await openFileInEditor(path.basename(this.#wasm));
    const visibleLines = await $$(CODE_LINE_SELECTOR);
    const lineNumbers = await Promise.all(visibleLines.map(line => line.evaluate(node => node.textContent)));
    const lineNumberLabels = new Map(lineNumbers.map(label => [Number(label), label]));
    await Promise.all(this.#mappings.get(label)!.map(

        ({moduleOffset}) => addBreakpointForLine(lineNumberLabels.get(moduleOffset)!)));
  }

  async setBreakpointInSourceAndRun(label: string, script: string) {
    const {target} = getBrowserAndPages();
    await this.addBreakpointsForLabelInSource(label);

    void target.evaluate(script);
    await this.checkLocationForLabel(label);
  }

  async setBreakpointInWasmAndRun(label: string, script: string) {
    const {target} = getBrowserAndPages();
    await this.addBreakpointsForLabelInWasm(label);

    void target.evaluate(script);
    await this.checkLocationForLabel(label);
  }

  async continueAndCheckForLabel(label: string) {
    await click(RESUME_BUTTON);
    await this.checkLocationForLabel(label);
  }

  getMappingsForPlugin(): LabelMapping[] {
    return Array.from(this.#mappings.values()).flat();
  }
}

export async function retrieveCodeMirrorEditorContent(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[]> {
  const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');
  return await editor.evaluate(
      node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

export async function waitForLines(
    lineCount: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<void> {
  await devToolsPage.waitFor(new Array(lineCount).fill('.cm-line').join(' ~ '));
}

export async function isPrettyPrinted(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<boolean> {
  const prettyButton = await devToolsPage.waitFor('[title="Pretty print"]');
  const isPretty = await prettyButton.evaluate(e => e.classList.contains('toggled'));
  return isPretty === true;
}

export function veImpressionForSourcesPanel() {
  return veImpression('Panel', 'sources', [
    veImpression(
        'Toolbar', 'debug',
        [
          veImpression('Toggle', 'debugger.toggle-pause'),
          veImpression('Action', 'debugger.step-over'),
          veImpression('Action', 'debugger.step-into'),
          veImpression('Action', 'debugger.step-out'),
          veImpression('Action', 'debugger.step'),
          veImpression('Toggle', 'debugger.toggle-breakpoints-active'),
        ]),
    veImpression(
        'Pane', 'debug',
        [
          veImpression('SectionHeader', 'sources.watch'),
          veImpression('SectionHeader', 'sources.js-breakpoints'),
          veImpression('SectionHeader', 'sources.scope-chain'),
          veImpression('SectionHeader', 'sources.callstack'),
          veImpression('SectionHeader', 'sources.xhr-breakpoints'),
          veImpression('SectionHeader', 'sources.dom-breakpoints'),
          veImpression('SectionHeader', 'sources.global-listeners'),
          veImpression('SectionHeader', 'sources.event-listener-breakpoints'),
          veImpression('SectionHeader', 'sources.csp-violation-breakpoints'),
          veImpression('Section', 'sources.scope-chain'),
          veImpression('Section', 'sources.callstack'),
          veImpression(
              'Section', 'sources.js-breakpoints',
              [
                veImpression('Toggle', 'pause-uncaught'),
                veImpression('Toggle', 'pause-on-caught-exception'),
              ]),
        ]),
    veImpression(
        'Pane', 'editor',
        [
          veImpression('Toolbar', 'bottom'),
          veImpression(
              'Toolbar', 'top',
              [
                veImpression('ToggleSubpane', 'navigator'),
                veImpression('ToggleSubpane', 'debugger'),
              ]),
        ]),
    veImpression(
        'Toolbar', 'navigator',
        [
          veImpression('DropDown', 'more-tabs'),
          veImpression('PanelTabHeader', 'navigator-network'),
          veImpression('PanelTabHeader', 'navigator-files'),
          veImpression('DropDown', 'more-options'),
        ]),
    veImpression(
        'Pane', 'navigator-network',
        [
          veImpression(
              'Tree', undefined,
              [
                veImpression(
                    'TreeItem', 'frame',
                    [
                      veImpression('Expand'),
                      veImpression(
                          'TreeItem', 'domain',
                          [
                            veImpression('Expand'),
                            veImpression('TreeItem', 'document', [
                              veImpression('Value', 'title'),
                            ]),
                          ]),
                    ]),
              ]),
        ]),
  ]);
}
