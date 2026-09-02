// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../conductor/paths.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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
export const SELECTED_THREAD_SELECTOR = '.thread-item[aria-selected="true"] > div.thread-item-title';
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

export async function getLineNumberElement(devToolsPage: DevToolsPage,
                                           lineNumber: number|string): Promise<puppeteer.ElementHandle<Element>> {
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

export async function doubleClickSourceTreeItem(devToolsPage: DevToolsPage, selector: string): Promise<void> {
  await devToolsPage.click(selector, {clickOptions: {count: 2, offset: {x: 40, y: 10}}});
}

export async function waitForSourcesPanel(devToolsPage: DevToolsPage): Promise<void> {
  // Wait for the navigation panel to show up
  await devToolsPage.waitFor('.navigator-file-tree-item, .empty-state');
}

export async function openSourcesPanel(devToolsPage: DevToolsPage): Promise<puppeteer.ElementHandle<Element>> {
  // Locate the button for switching to the sources tab.
  await devToolsPage.click('#tab-sources');
  await waitForSourcesPanel(devToolsPage);
  return await devToolsPage.waitForAria('sources');
}

export async function openFileInSourcesPanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage,
                                             testInput: string): Promise<void> {
  await inspectedPage.goToResource(`sources/${testInput}`);

  await openSourcesPanel(devToolsPage);
}

export async function openSnippetsSubPane(devToolsPage: DevToolsPage): Promise<void> {
  const root = await devToolsPage.waitFor('.navigator-tabbed-pane');
  await devToolsPage.clickMoreTabsButton(root);
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
export async function createNewSnippet(devToolsPage: DevToolsPage, snippetName: string,
                                       content?: string): Promise<void> {
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

export async function openOverridesSubPane(devToolsPage: DevToolsPage): Promise<void> {
  const root = await devToolsPage.waitFor('.navigator-tabbed-pane');
  await devToolsPage.clickMoreTabsButton(root);
  await devToolsPage.click('[aria-label="Overrides"]');
  await devToolsPage.waitFor('[aria-label="Overrides panel"]');
}

export async function openFileInEditor(devToolsPage: DevToolsPage, sourceFile: string): Promise<void> {
  await waitForSourceFiles(devToolsPage, SourceFileEvents.SOURCE_FILE_LOADED,
                           files => files.some(f => f.endsWith(sourceFile)),
                           // Open a particular file in the editor
                           () => doubleClickSourceTreeItem(devToolsPage, `[aria-label="${sourceFile}, file"]`));
}

export async function openSourceCodeEditorForFile(devToolsPage: DevToolsPage, inspectedPage: InspectedPage,
                                                  sourceFile: string, testInput: string): Promise<void> {
  await openFileInSourcesPanel(devToolsPage, inspectedPage, testInput);
  await openFileInEditor(devToolsPage, sourceFile);
}

export async function getBreakpointHitLocation(devToolsPage: DevToolsPage): Promise<string> {
  const breakpointHitHandle = await devToolsPage.waitFor('.breakpoint-item.hit');
  const locationHandle = await devToolsPage.waitFor('.location', breakpointHitHandle);
  const locationText = await locationHandle.evaluate(location => location.textContent);

  const groupHandle = await breakpointHitHandle.evaluateHandle(x => x.parentElement!);
  const groupHeaderTitleHandle = await devToolsPage.waitFor('.group-header-title', groupHandle);
  const groupHeaderTitle = await groupHeaderTitleHandle?.evaluate(header => header.textContent);

  return `${groupHeaderTitle}:${locationText}`;
}

export async function getOpenSources(devToolsPage: DevToolsPage): Promise<Array<string|null>> {
  const sourceTabPane = await devToolsPage.waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await devToolsPage.waitFor('.tabbed-pane-header-tabs', sourceTabPane);
  const openSources =
      await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
  return openSources;
}

export async function waitForHighlightedLine(devToolsPage: DevToolsPage, lineNumber: number): Promise<void> {
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

export async function getToolbarText(devToolsPage: DevToolsPage): Promise<string[]> {
  const toolbar = await devToolsPage.waitFor('.sources-toolbar');
  if (!toolbar) {
    return [];
  }
  const textNodes = await devToolsPage.$$('.toolbar-text', toolbar);
  return await Promise.all(textNodes.map(node => node.evaluate(node => node.textContent, node)));
}

export async function addBreakpointForLine(devToolsPage: DevToolsPage, index: number|string): Promise<void> {
  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(devToolsPage, index)));
  const breakpointLine = await getLineNumberElement(devToolsPage, index);
  assert.isOk(breakpointLine);
  await devToolsPage.clickElement(breakpointLine);

  await devToolsPage.waitForFunction(async () => await isBreakpointSet(devToolsPage, index));
}

export async function removeBreakpointForLine(devToolsPage: DevToolsPage, index: number|string): Promise<void> {
  await devToolsPage.waitForFunction(async () => await isBreakpointSet(devToolsPage, index));
  const breakpointLine = await getLineNumberElement(devToolsPage, index);
  assert.isOk(breakpointLine);
  await devToolsPage.clickElement(breakpointLine);
  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(devToolsPage, index)));
}

export async function addLogpointForLine(devToolsPage: DevToolsPage, index: number, condition: string): Promise<void> {
  const breakpointLine = await getLineNumberElement(devToolsPage, index);
  assert.isOk(breakpointLine);

  await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(devToolsPage, index)));
  await devToolsPage.clickElement(breakpointLine, {clickOptions: {button: 'right'}});

  await devToolsPage.click('aria/Add logpoint…');

  const editDialog = await devToolsPage.waitFor('.sources-edit-breakpoint-dialog');
  const conditionEditor = await devToolsPage.waitForAria('Code editor', editDialog);
  await conditionEditor.focus();

  await devToolsPage.typeText(condition);
  await devToolsPage.pressKey('Enter');

  await devToolsPage.waitForFunction(async () => await isBreakpointSet(devToolsPage, index));
}

export async function isBreakpointSet(devToolsPage: DevToolsPage, lineNumber: number|string): Promise<boolean> {
  const lineNumberElement = await getLineNumberElement(devToolsPage, lineNumber);
  const breakpointLineParentClasses = await lineNumberElement?.evaluate(n => n.className);
  return breakpointLineParentClasses?.includes('cm-breakpoint');
}

/**
 * @param lineNumber 1-based line number
 * @param index 1-based index of the inline breakpoint in the given line
 */
export async function enableInlineBreakpointForLine(devToolsPage: DevToolsPage, line: number,
                                                    index: number): Promise<void> {
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
export async function disableInlineBreakpointForLine(devToolsPage: DevToolsPage, line: number, index: number,
                                                     expectNoBreakpoint = false): Promise<void> {
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

export async function checkBreakpointDidNotActivate(devToolsPage: DevToolsPage): Promise<void> {
  // TODO(almuthanna): make sure this check happens at a point where the pause indicator appears if it was active

  // TODO: it should actually wait for rendering to finish.
  await devToolsPage.drainTaskQueue();
  await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);
}

export async function getBreakpointDecorators(devToolsPage: DevToolsPage, disabledOnly = false,
                                              expected = 0): Promise<number[]> {
  const selector = `.cm-breakpoint${disabledOnly ? '-disabled' : ''}`;
  const breakpointDecorators = await devToolsPage.waitForMany(selector, expected);
  return await Promise.all(
      breakpointDecorators.map(breakpointDecorator => breakpointDecorator.evaluate(n => Number(n.textContent))));
}

export async function getNonBreakableLines(devToolsPage: DevToolsPage): Promise<number[]> {
  const selector = '.cm-nonBreakableLine';
  await devToolsPage.waitFor(selector);
  const unbreakableLines = await devToolsPage.$$(selector);
  return await Promise.all(
      unbreakableLines.map(unbreakableLine => unbreakableLine.evaluate(n => Number(n.textContent))));
}

export async function executionLineHighlighted(devToolsPage: DevToolsPage): Promise<puppeteer.ElementHandle<Element>> {
  return await devToolsPage.waitFor('.cm-executionLine');
}

export async function getCallFrameNames(devToolsPage: DevToolsPage): Promise<string[]> {
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

export async function getCallFrameLocations(devToolsPage: DevToolsPage): Promise<string[]> {
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

export async function switchToCallFrame(devToolsPage: DevToolsPage, index: number): Promise<void> {
  const selector = `.call-frame-item[aria-posinset="${index}"]`;
  await devToolsPage.click(selector);
  await devToolsPage.waitFor(selector + '[aria-selected="true"]');
}

export async function retrieveTopCallFrameScriptLocation(
    devToolsPage: DevToolsPage, target: puppeteer.Page|InspectedPage, script: string): Promise<string> {
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

export async function retrieveTopCallFrameWithoutResuming(devToolsPage: DevToolsPage): Promise<string> {
  // Wait for the evaluation to be paused and shown in the UI
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

  // Retrieve the top level call frame script location name
  const locationHandle = await devToolsPage.waitFor('.call-frame-location');
  const scriptLocation = await locationHandle.evaluate(location => location.textContent);

  return scriptLocation;
}

export async function waitForStackTopMatch(devToolsPage: DevToolsPage, matcher: RegExp): Promise<string> {
  // The call stack is updated asynchronously, so let us wait until we see the correct one
  // (or report the last one we have seen before timeout).
  let stepLocation = '<no call stack>';
  await devToolsPage.waitForFunctionWithTries(async () => {
    stepLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage) ?? '<invalid>';
    return stepLocation?.match(matcher);
  }, {tries: 10});
  return stepLocation;
}

export async function waitForNewLocation(devToolsPage: DevToolsPage, oldLocation: string): Promise<string> {
  // The call stack is updated asynchronously, so let us wait until we see the correct one
  // (or report the last one we have seen before timeout).
  let stepLocation = '<no call stack>';
  await devToolsPage.waitForFunction(async () => {
    stepLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage) ?? '<invalid>';
    return stepLocation && stepLocation !== oldLocation;
  });
  return stepLocation;
}

export async function setEventListenerBreakpoint(devToolsPage: DevToolsPage, groupName: string,
                                                 eventName: string): Promise<void> {
  const eventListenerBreakpointsSection = await devToolsPage.waitForAria('Event listener breakpoints');
  const expanded = await eventListenerBreakpointsSection.evaluate(el => el.getAttribute('aria-expanded'));
  if (expanded !== 'true') {
    await devToolsPage.click('[aria-label="Event listener breakpoints"]');
    await devToolsPage.waitFor('[aria-label="Event listener breakpoints"][aria-expanded="true"]');
  }

  const eventSelector = `input[type="checkbox"][title="${eventName}"]`;
  const groupSelector = `input[type="checkbox"][title="${groupName}"]`;
  const groupCheckbox = await devToolsPage.waitFor(groupSelector);
  await devToolsPage.scrollElementIntoView(groupSelector);
  await devToolsPage.waitForVisible(groupSelector);
  const eventCheckbox = await devToolsPage.$(eventSelector);
  if (!eventCheckbox || !(await eventCheckbox.evaluate(x => x.checkVisibility()))) {
    // The tree element is an <li> with a ::before pseudoelement for the triangle.
    // We compute the exact coordinate of the triangle as done by isEventWithinDisclosureTriangle
    const rectData = await groupCheckbox.evaluate(node => {
      const paddingLeftValue = window.getComputedStyle(node).paddingLeft;
      const computedLeftPadding = parseFloat(paddingLeftValue);
      const left = node.getBoundingClientRect().left + computedLeftPadding;
      const top = node.getBoundingClientRect().top;
      const height = node.getBoundingClientRect().height;
      return {left, top, height};
    });

    await devToolsPage.page.mouse.click(rectData.left + 5, rectData.top + rectData.height * 0.5);

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
export async function waitForSourceFiles<T>(devToolsPage: DevToolsPage, eventName: SourceFileEvents,
                                            waitCondition: (files: string[]) => boolean | Promise<boolean>,
                                            action?: () => T): Promise<T> {
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

  const result = action ? await action() : undefined as T;

  await devToolsPage.waitForFunction(async logger => {
    const files = await devToolsPage.evaluate(
        eventHandlerId => window.__sourceFileEvents.get(eventHandlerId)?.files, eventHandlerId);
    assert.isOk(files);
    logger.log(`Checking ${files.length} files`);
    return await waitCondition(files);
  }, undefined, 'Waiting for source files to match condition');

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

export async function captureAddedSourceFiles(devToolsPage: DevToolsPage, count: number,
                                              action?: () => Promise<void>): Promise<string[]> {
  let capturedFileNames!: string[];
  await waitForSourceFiles(devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE, files => {
    capturedFileNames = files;
    return files.length >= count;
  }, action);
  return capturedFileNames.map(f => new URL(`http://${f}`).pathname);
}

export async function reloadPageAndWaitForSourceFile(devToolsPage: DevToolsPage, inspectedPage: InspectedPage,
                                                     sourceFile?: string): Promise<void> {
  await waitForSourceFiles(devToolsPage, SourceFileEvents.SOURCE_FILE_LOADED,
                           files => files.some(f => !sourceFile || f.endsWith(sourceFile)),
                           () => inspectedPage.reload());
}

export function isEqualOrAbbreviation(abbreviated: string, full: string): boolean {
  const split = abbreviated.split('…');
  if (split.length === 1) {
    return abbreviated === full;
  }
  assert.lengthOf(split, 2);
  return full.startsWith(split[0]) && full.endsWith(split[1]);
}

/** Helpers for navigating the file tree. **/
export interface NestedFileSelector {
  rootSelector: string;
  domainSelector: string;
  folderSelector?: string;
  fileSelector: string;
}

export function createSelectorsForWorkerFile(inspectedPage: InspectedPage, workerName: string, folderName: string,
                                             fileName: string, workerIndex = 1): NestedFileSelector {
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

export async function expandSourceTreeItem(devToolsPage: DevToolsPage, selector: string): Promise<void> {
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  const sourceTreeItem = await devToolsPage.waitFor(selector);
  if (!await isExpanded(sourceTreeItem)) {
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await devToolsPage.timeout(50);
    await doubleClickSourceTreeItem(devToolsPage, selector);
  }
}

export async function expandFileTree(devToolsPage: DevToolsPage,
                                     selectors: NestedFileSelector): Promise<puppeteer.ElementHandle<Element>> {
  await expandSourceTreeItem(devToolsPage, selectors.rootSelector);
  await expandSourceTreeItem(devToolsPage, selectors.domainSelector);
  if (selectors.folderSelector) {
    await expandSourceTreeItem(devToolsPage, selectors.folderSelector);
  }
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  return await devToolsPage.waitFor(selectors.fileSelector);
}

export async function readSourcesTreeView(devToolsPage: DevToolsPage): Promise<string[]> {
  const items = await devToolsPage.$$('.navigator-folder-tree-item,.navigator-file-tree-item');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

export async function readIgnoreListedSources(devToolsPage: DevToolsPage): Promise<string[]> {
  const items =
      await devToolsPage.$$('.navigator-folder-tree-item.is-ignore-listed,.navigator-file-tree-item.is-ignore-listed');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

async function hasPausedEvents(devToolsPage: DevToolsPage): Promise<boolean> {
  const events = await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  return Boolean(events?.length);
}

export async function stepThroughTheCode(devToolsPage: DevToolsPage, checkLineChange = true): Promise<void> {
  const currentLocation = checkLineChange ? await retrieveTopCallFrameWithoutResuming(devToolsPage) : '';
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.pressKey('F9');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
  if (checkLineChange) {
    await waitForNewLocation(devToolsPage, currentLocation);
  }
}

export async function stepIn(devToolsPage: DevToolsPage, checkLineChange = true): Promise<void> {
  const currentLocation = checkLineChange ? await retrieveTopCallFrameWithoutResuming(devToolsPage) : '';
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.pressKey('F11');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
  if (checkLineChange) {
    await waitForNewLocation(devToolsPage, currentLocation);
  }
}

export async function stepOver(devToolsPage: DevToolsPage, checkLineChange = true): Promise<void> {
  const currentLocation = checkLineChange ? await retrieveTopCallFrameWithoutResuming(devToolsPage) : '';
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.pressKey('F10');
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
  if (checkLineChange) {
    await waitForNewLocation(devToolsPage, currentLocation);
  }
}

export async function stepOut(devToolsPage: DevToolsPage, checkLineChange = true): Promise<void> {
  const currentLocation = checkLineChange ? await retrieveTopCallFrameWithoutResuming(devToolsPage) : '';
  await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT);
  await devToolsPage.pressKey('F11', {shift: true});
  await devToolsPage.waitForFunction(() => hasPausedEvents(devToolsPage));
  await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
  if (checkLineChange) {
    await waitForNewLocation(devToolsPage, currentLocation);
  }
}

export async function openNestedWorkerFile(devToolsPage: DevToolsPage, selectors: NestedFileSelector): Promise<void> {
  await expandFileTree(devToolsPage, selectors);
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(50);
  await devToolsPage.click(selectors.fileSelector);
}

export async function inspectMemory(devToolsPage: DevToolsPage, variableName: string): Promise<void> {
  await openSoftContextMenuAndClickOnItem(devToolsPage, `[data-object-property-name-for-test="${variableName}"]`,
                                          'Open in Memory inspector panel');
}

export async function getScopeNames(devToolsPage: DevToolsPage): Promise<string[]> {
  const scopeElements = await devToolsPage.$$('.scope-chain-sidebar-pane-section-title');
  const scopeNames = await Promise.all(scopeElements.map(nodes => nodes.evaluate(n => n.textContent)));
  return scopeNames;
}

export async function getValuesForScope(devToolsPage: DevToolsPage, scope: string, expandCount: number,
                                        waitForNoOfValues: number): Promise<string[]> {
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
  let previousValues = await readValues();
  return await devToolsPage.waitForFunction(async function() {
    const values = await readValues();
    if (values.join('') === previousValues.join('')) {
      return values;
    }
    previousValues = values;
    return;
  });
}

export async function waitValuesForScope(devToolsPage: DevToolsPage, scope: string, expandCount: number,
                                         expectedValues: string[]): Promise<string[]> {
  await devToolsPage.waitForFunction(async () => {
    const values = await getValuesForScope(devToolsPage, scope, expandCount, expectedValues.length);
    return values.every((value, i) => value === expectedValues[i]);
  });
  return expectedValues;
}

export async function getPausedMessages(devToolsPage: DevToolsPage): Promise<{
  statusMain: string,
  statusSub: string,
}> {
  const messageElement = await devToolsPage.page.waitForSelector('.paused-message');
  assert.isOk(messageElement, 'getPausedMessages: did not find .paused-message element.');
  const statusMain = await devToolsPage.waitFor('.status-main', messageElement);
  const statusSub = await devToolsPage.waitFor('.status-sub', messageElement);
  return {
    statusMain: await statusMain.evaluate(x => x.textContent),
    statusSub: await statusSub.evaluate(x => x.textContent),
  };
}

export async function getWatchExpressionsValues(devToolsPage: DevToolsPage): Promise<string[]|null> {
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

export async function runSnippet(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.pressKey('Enter', {control: true});
}

export async function evaluateSelectedTextInConsole(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.pressKey('E', {control: true, shift: true});
  // TODO: it should actually wait for rendering to finish. Note: it is
  // drained three times because rendering currently takes 3 dependent
  // tasks to finish.
  await devToolsPage.drainTaskQueue();
  await devToolsPage.drainTaskQueue();
  await devToolsPage.drainTaskQueue();
}

export async function addSelectedTextToWatches(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.pressKey('A', {control: true, shift: true});
}

export async function enableLocalOverrides(devToolsPage: DevToolsPage): Promise<void> {
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
  readonly #devToolsPage: DevToolsPage;
  readonly #inspectedPage: InspectedPage;

  constructor(
      source: string, wasm: string, mappings: Map<string, LabelMapping[]>, devToolsPage: DevToolsPage,
      inspectedPage: InspectedPage) {
    this.#mappings = mappings;
    this.#source = source;
    this.#wasm = wasm;
    this.#devToolsPage = devToolsPage;
    this.#inspectedPage = inspectedPage;
  }

  static load(source: string, wasm: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage):
      WasmLocationLabels {
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
    return new WasmLocationLabels(source, wasm, mappings, devToolsPage, inspectedPage);
  }

  async checkLocationForLabel(label: string): Promise<LabelMapping> {
    const pauseLocation = await retrieveTopCallFrameWithoutResuming(this.#devToolsPage);
    const pausedLine = this.#mappings.get(label)!.find(
        line => pauseLocation === `${path.basename(this.#wasm)}:0x${line.moduleOffset.toString(16)}` ||
            pauseLocation === `${path.basename(this.#source)}:${line.sourceLine}`);
    assert.isOk(pausedLine);
    return pausedLine;
  }

  async addBreakpointsForLabelInSource(label: string): Promise<void> {
    await openFileInEditor(this.#devToolsPage, path.basename(this.#source));
    await Promise.all(
        this.#mappings.get(label)!.map(({sourceLine}) => addBreakpointForLine(this.#devToolsPage, sourceLine)));
  }

  async addBreakpointsForLabelInWasm(label: string): Promise<void> {
    await openFileInEditor(this.#devToolsPage, path.basename(this.#wasm));
    const visibleLines = await this.#devToolsPage.$$(CODE_LINE_SELECTOR);
    const lineNumbers = await Promise.all(visibleLines.map(line => line.evaluate(node => node.textContent)));
    const lineNumberLabels = new Map(lineNumbers.map(label => [Number(label), label]));
    await Promise.all(this.#mappings.get(label)!.map(

        ({moduleOffset}) => addBreakpointForLine(this.#devToolsPage, lineNumberLabels.get(moduleOffset)!)));
  }

  async setBreakpointInSourceAndRun(label: string, script: string): Promise<void> {
    await this.addBreakpointsForLabelInSource(label);

    void this.#inspectedPage.evaluate(script);
    await this.checkLocationForLabel(label);
  }

  async setBreakpointInWasmAndRun(label: string, script: string): Promise<void> {
    await this.addBreakpointsForLabelInWasm(label);

    void this.#inspectedPage.evaluate(script);
    await this.checkLocationForLabel(label);
  }

  async continueAndCheckForLabel(label: string): Promise<void> {
    await this.#devToolsPage.click(RESUME_BUTTON);
    await this.checkLocationForLabel(label);
  }

  getMappingsForPlugin(): LabelMapping[] {
    return Array.from(this.#mappings.values()).flat();
  }
}

export async function retrieveCodeMirrorEditorContent(devToolsPage: DevToolsPage): Promise<string[]> {
  const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');
  return await editor.evaluate(
      node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

export async function waitForLines(devToolsPage: DevToolsPage, lineCount: number): Promise<void> {
  await devToolsPage.waitFor(new Array(lineCount).fill('.cm-line').join(' ~ '));
}

export async function isPrettyPrinted(devToolsPage: DevToolsPage): Promise<boolean> {
  const prettyButton = await devToolsPage.waitFor('[title="Pretty print"]');
  const isPretty = await prettyButton.evaluate(e => e.classList.contains('toggled'));
  return isPretty === true;
}

export function veImpressionForSourcesPanel(): {
  impressions: string[],
} {
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
