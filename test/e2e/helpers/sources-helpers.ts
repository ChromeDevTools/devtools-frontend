// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import type * as puppeteer from 'puppeteer-core';
import {requireTestRunnerConfigSetting} from '../../conductor/test_runner_config.js';

import {
  $,
  $$,
  assertNotNullOrUndefined,
  click,
  getBrowserAndPages,
  getPendingEvents,
  getTestServerPort,
  goToResource,
  pasteText,
  platform,
  pressKey,
  reloadDevTools,
  step,
  timeout,
  typeText,
  waitFor,
  clickElement,
  waitForFunction,
  waitForFunctionWithTries,
  waitForAria,
} from '../../shared/helper.js';

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
export const TURNED_OFF_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-off';
export const TURNED_ON_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-on';
export const DEBUGGER_PAUSED_EVENT = 'DevTools.DebuggerPaused';
const WATCH_EXPRESSION_VALUE_SELECTOR = '.watch-expression-tree-item .object-value-string.value';
export const MORE_TABS_SELECTOR = '[aria-label="More tabs"]';
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

export async function getLineNumberElement(lineNumber: number|string) {
  const visibleLines = await $$(CODE_LINE_SELECTOR);
  for (let i = 0; i < visibleLines.length; i++) {
    const lineValue = await visibleLines[i].evaluate(node => node.textContent);
    if (lineValue === `${lineNumber}`) {
      return visibleLines[i];
    }
  }
  return null;
}

export async function doubleClickSourceTreeItem(selector: string) {
  await click(selector, {clickOptions: {clickCount: 2, offset: {x: 40, y: 10}}});
}

export async function waitForSourcesPanel(): Promise<void> {
  // Wait for the navigation panel to show up
  await waitFor('.navigator-file-tree-item');
}

export async function openSourcesPanel() {
  // Locate the button for switching to the sources tab.
  await click('#tab-sources');

  await waitForSourcesPanel();
}

export async function openFileInSourcesPanel(testInput: string) {
  await goToResource(`sources/${testInput}`);

  await openSourcesPanel();
}

export async function openRecorderSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');

  await waitFor('[aria-label="More tabs"]', root);
  await click('[aria-label="More tabs"]', {root});

  await waitFor('[aria-label="Recordings"]');

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

export async function openSnippetsSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');

  await waitFor('[aria-label="More tabs"]', root);
  await click('[aria-label="More tabs"]', {root});

  await waitFor('[aria-label="Snippets"]');

  await click('[aria-label="Snippets"]');
  await waitFor('[aria-label="New snippet"]');
}

/**
 * Creates a new snippet, optionally pre-filling it with the provided content.
 * `snippetName` must not contain spaces or special characters, otherwise
 * `createNewSnippet` will time out.
 * DevTools uses the escaped snippet name for the ARIA label. `createNewSnippet`
 * doesn't mirror the escaping so it won't be able to wait for the snippet
 * entry in the navigation tree to appear.
 */
export async function createNewSnippet(snippetName: string, content?: string) {
  const {frontend} = getBrowserAndPages();

  await click('[aria-label="New snippet"]');
  await waitFor('[aria-label^="Script snippet"]');

  await typeText(snippetName);

  await frontend.keyboard.press('Enter');
  await waitFor(`[aria-label*="${snippetName}"]`);

  if (content) {
    await pasteText(content);
    await pressKey('s', {control: true});
  }
}

export async function openOverridesSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');

  await waitFor('[aria-label="More tabs"]', root);
  await click('[aria-label="More tabs"]', {root});

  await waitFor('[aria-label="Overrides"]');

  await click('[aria-label="Overrides"]');
  await waitFor('[aria-label="Overrides panel"]');
}

export async function openFileInEditor(sourceFile: string) {
  await waitForSourceFiles(
      SourceFileEvents.SourceFileLoaded, files => files.some(f => f.endsWith(sourceFile)),
      // Open a particular file in the editor
      () => doubleClickSourceTreeItem(`[aria-label="${sourceFile}, file"]`));
}

export async function openSourceCodeEditorForFile(sourceFile: string, testInput: string) {
  await openFileInSourcesPanel(testInput);
  await openFileInEditor(sourceFile);
}

export async function getSelectedSource(): Promise<string> {
  const sourceTabPane = await waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await waitFor('.tabbed-pane-header-tab.selected', sourceTabPane);
  return sourceTabs.evaluate(node => node.getAttribute('aria-label')) as Promise<string>;
}

export async function getBreakpointHitLocation() {
  const breakpointHitHandle = await waitFor('.breakpoint-item.hit');
  const locationHandle = await waitFor('.location', breakpointHitHandle);
  const locationText = await locationHandle.evaluate(location => location.textContent);

  const groupHandle = await breakpointHitHandle.evaluateHandle(x => x.parentElement);
  const groupHeaderTitleHandle = await waitFor('.group-header-title', groupHandle);
  const groupHeaderTitle = await groupHeaderTitleHandle?.evaluate(header => header.textContent);

  return `${groupHeaderTitle}:${locationText}`;
}

export async function getOpenSources() {
  const sourceTabPane = await waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await waitFor('.tabbed-pane-header-tabs', sourceTabPane);
  const openSources =
      await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
  return openSources;
}

export async function waitForHighlightedLine(lineNumber: number) {
  await waitForFunction(async () => {
    const selectedLine = await waitFor('.cm-highlightedLine');
    const currentlySelectedLineNumber = await selectedLine.evaluate(line => {
      return [...line.parentElement?.childNodes || []].indexOf(line);
    });
    const lineNumbers = await waitFor('.cm-lineNumbers');
    const text = await lineNumbers.evaluate(
        (node, lineNumber) => node.childNodes[lineNumber].textContent, currentlySelectedLineNumber + 1);
    return Number(text) === lineNumber;
  });
}

export async function getToolbarText() {
  const toolbar = await waitFor('.sources-toolbar');
  if (!toolbar) {
    return [];
  }
  const textNodes = await $$('.toolbar-text', toolbar);
  return Promise.all(textNodes.map(node => node.evaluate(node => node.textContent, node)));
}

export async function addBreakpointForLine(frontend: puppeteer.Page, index: number|string) {
  const breakpointLine = await getLineNumberElement(index);
  assertNotNullOrUndefined(breakpointLine);

  await waitForFunction(async () => !(await isBreakpointSet(index)));
  await clickElement(breakpointLine);

  await waitForFunction(async () => await isBreakpointSet(index));
}

export async function removeBreakpointForLine(frontend: puppeteer.Page, index: number|string) {
  const breakpointLine = await getLineNumberElement(index);
  assertNotNullOrUndefined(breakpointLine);

  await waitForFunction(async () => await isBreakpointSet(index));
  await clickElement(breakpointLine);
  await waitForFunction(async () => !(await isBreakpointSet(index)));
}

export async function addLogpointForLine(index: number, condition: string) {
  const {frontend} = getBrowserAndPages();
  const breakpointLine = await getLineNumberElement(index);
  assertNotNullOrUndefined(breakpointLine);

  await waitForFunction(async () => !(await isBreakpointSet(index)));
  await clickElement(breakpointLine, {clickOptions: {button: 'right'}});

  await click('aria/Add logpoint…');

  const editDialog = await waitFor('.sources-edit-breakpoint-dialog');
  const conditionEditor = await waitForAria('Code editor', editDialog);
  await conditionEditor.focus();

  await typeText(condition);
  await frontend.keyboard.press('Enter');

  await waitForFunction(async () => await isBreakpointSet(index));
}

export async function isBreakpointSet(lineNumber: number|string) {
  const lineNumberElement = await getLineNumberElement(lineNumber);
  const breakpointLineParentClasses = await lineNumberElement?.evaluate(n => n.className);
  return breakpointLineParentClasses?.includes('cm-breakpoint');
}

/**
 * @param lineNumber 1-based line number
 * @param index 1-based index of the inline breakpoint in the given line
 */
export async function enableInlineBreakpointForLine(line: number, index: number) {
  const {frontend} = getBrowserAndPages();
  const decorationSelector = `pierce/.cm-content > :nth-child(${line}) > :nth-child(${index} of .cm-inlineBreakpoint)`;
  await click(decorationSelector);
  await waitForFunction(
      () => frontend.$eval(decorationSelector, element => !element.classList.contains('cm-inlineBreakpoint-disabled')));
}

/**
 * @param lineNumber 1-based line number
 * @param index 1-based index of the inline breakpoint in the given line
 * @param expectNoBreakpoint If we should wait for the line to not have any inline breakpoints after
 *                           the click instead of a disabled one.
 */
export async function disableInlineBreakpointForLine(line: number, index: number, expectNoBreakpoint: boolean = false) {
  const {frontend} = getBrowserAndPages();
  const decorationSelector = `pierce/.cm-content > :nth-child(${line}) > :nth-child(${index} of .cm-inlineBreakpoint)`;
  await click(decorationSelector);
  if (expectNoBreakpoint) {
    await waitForFunction(
        () => frontend.$$eval(
            `pierce/.cm-content > :nth-child(${line}) > .cm-inlineBreakpoint`, elements => elements.length === 0));
  } else {
    await waitForFunction(
        () =>
            frontend.$eval(decorationSelector, element => element.classList.contains('cm-inlineBreakpoint-disabled')));
  }
}

export async function checkBreakpointDidNotActivate() {
  await step('check that the script did not pause', async () => {
    // TODO(almuthanna): make sure this check happens at a point where the pause indicator appears if it was active
    const pauseIndicators = await $$(PAUSE_INDICATOR_SELECTOR);
    const breakpointIndicator = await Promise.all(pauseIndicators.map(elements => {
      return elements.evaluate(el => el.className);
    }));
    assert.deepEqual(breakpointIndicator.length, 0, 'script had been paused');
  });
}

export async function getBreakpointDecorators(disabledOnly = false) {
  const selector = `.cm-breakpoint${disabledOnly ? '-disabled' : ''}`;
  const breakpointDecorators = await $$(selector);
  return await Promise.all(
      breakpointDecorators.map(breakpointDecorator => breakpointDecorator.evaluate(n => Number(n.textContent))));
}

export async function getNonBreakableLines() {
  const selector = '.cm-nonBreakableLine';
  await waitFor(selector);
  const unbreakableLines = await $$(selector);
  return await Promise.all(
      unbreakableLines.map(unbreakableLine => unbreakableLine.evaluate(n => Number(n.textContent))));
}

export async function executionLineHighlighted() {
  return await waitFor('.cm-executionLine');
}

export async function getCallFrameNames() {
  const selector = '.call-frame-item:not(.hidden) .call-frame-item-title';
  await waitFor(selector);
  const items = await $$(selector);
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }
  return results;
}

export async function getCallFrameLocations() {
  const selector = '.call-frame-item:not(.hidden) .call-frame-location';
  await waitFor(selector);
  const items = await $$(selector);
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }
  return results;
}

export async function switchToCallFrame(index: number) {
  const selector = `.call-frame-item[aria-posinset="${index}"]`;
  await click(selector);
  await waitFor(selector + '[aria-selected="true"]');
}

export async function retrieveTopCallFrameScriptLocation(script: string, target: puppeteer.Page) {
  // The script will run into a breakpoint, which means that it will not actually
  // finish the evaluation, until we continue executing.
  // Thus, we have to await it at a later point, while stepping through the code.
  const scriptEvaluation = target.evaluate(script);

  // Wait for the evaluation to be paused and shown in the UI
  // and retrieve the top level call frame script location name
  const scriptLocation = await retrieveTopCallFrameWithoutResuming();

  // Resume the evaluation
  await click(RESUME_BUTTON);

  // Make sure to await the context evaluate before asserting
  // Otherwise the Puppeteer process might crash on a failure assertion,
  // as its execution context is destroyed
  await scriptEvaluation;

  return scriptLocation;
}

export async function retrieveTopCallFrameWithoutResuming() {
  // Wait for the evaluation to be paused and shown in the UI
  await waitFor(PAUSE_INDICATOR_SELECTOR);

  // Retrieve the top level call frame script location name
  const locationHandle = await waitFor('.call-frame-location');
  const scriptLocation = await locationHandle.evaluate(location => location.textContent);

  return scriptLocation;
}

export async function waitForStackTopMatch(matcher: RegExp) {
  // The call stack is updated asynchronously, so let us wait until we see the correct one
  // (or report the last one we have seen before timeout).
  let stepLocation = '<no call stack>';
  await waitForFunctionWithTries(async () => {
    stepLocation = await retrieveTopCallFrameWithoutResuming() ?? '<invalid>';
    return stepLocation?.match(matcher);
  }, {tries: 10});
  return stepLocation;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window {
    /* eslint-disable @typescript-eslint/naming-convention */
    __sourceFileEvents: Map<number, {files: string[], handler: (e: Event) => void}>;
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export const enum SourceFileEvents {
  SourceFileLoaded = 'source-file-loaded',
  AddedToSourceTree = 'source-tree-file-added',
}

let nextEventHandlerId = 0;
export async function waitForSourceFiles<T>(
    eventName: SourceFileEvents, waitCondition: (files: string[]) => boolean | Promise<boolean>,
    action: () => T): Promise<T> {
  const {frontend} = getBrowserAndPages();
  const eventHandlerId = nextEventHandlerId++;

  // Install new listener for the event
  await frontend.evaluate((eventName, eventHandlerId) => {
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

  await waitForFunction(async () => {
    const files =
        await frontend.evaluate(eventHandlerId => window.__sourceFileEvents.get(eventHandlerId)?.files, eventHandlerId);
    assertNotNullOrUndefined(files);
    return await waitCondition(files);
  });

  await frontend.evaluate((eventName, eventHandlerId) => {
    const handler = window.__sourceFileEvents.get(eventHandlerId);
    if (!handler) {
      throw new Error('handler unexpectandly unregistered');
    }
    window.__sourceFileEvents.delete(eventHandlerId);
    window.removeEventListener(eventName, handler.handler);
  }, eventName, eventHandlerId);

  return result;
}

export async function captureAddedSourceFiles(count: number, action: () => Promise<void>): Promise<string[]> {
  let capturedFileNames!: string[];
  await waitForSourceFiles(SourceFileEvents.AddedToSourceTree, files => {
    capturedFileNames = files;
    return files.length >= count;
  }, action);
  return capturedFileNames.map(f => new URL(`http://${f}`).pathname);
}

export async function reloadPageAndWaitForSourceFile(target: puppeteer.Page, sourceFile: string) {
  await waitForSourceFiles(
      SourceFileEvents.SourceFileLoaded, files => files.some(f => f.endsWith(sourceFile)), () => target.reload());
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
export type NestedFileSelector = {
  rootSelector: string,
  domainSelector: string,
  folderSelector?: string, fileSelector: string,
};

export function createSelectorsForWorkerFile(
    workerName: string, folderName: string, fileName: string, workerIndex = 1): NestedFileSelector {
  const rootSelector = new Array(workerIndex).fill(`[aria-label="${workerName}, worker"]`).join(' ~ ');
  const domainSelector = `${rootSelector} + ol > [aria-label="localhost:${getTestServerPort()}, domain"]`;
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

export async function expandSourceTreeItem(selector: string) {
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
  const sourceTreeItem = await waitFor(selector);
  if (!await isExpanded(sourceTreeItem)) {
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(50);
    await doubleClickSourceTreeItem(selector);
  }
}

export async function expandFileTree(selectors: NestedFileSelector) {
  await expandSourceTreeItem(selectors.rootSelector);
  await expandSourceTreeItem(selectors.domainSelector);
  if (selectors.folderSelector) {
    await expandSourceTreeItem(selectors.folderSelector);
  }
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
  return await waitFor(selectors.fileSelector);
}

export async function readSourcesTreeView(): Promise<string[]> {
  const items = await $$('.navigator-folder-tree-item,.navigator-file-tree-item');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

export async function readIgnoreListedSources(): Promise<string[]> {
  const items = await $$('.navigator-folder-tree-item.is-ignore-listed,.navigator-file-tree-item.is-ignore-listed');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = await Promise.all(promises);
  return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
}

async function hasPausedEvents(frontend: puppeteer.Page): Promise<boolean> {
  const events = await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT);
  return Boolean(events && events.length);
}

export async function stepThroughTheCode() {
  const {frontend} = getBrowserAndPages();
  await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT);
  await frontend.keyboard.press('F9');
  await waitForFunction(() => hasPausedEvents(frontend));
  await waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepIn() {
  const {frontend} = getBrowserAndPages();
  await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT);
  await frontend.keyboard.press('F11');
  await waitForFunction(() => hasPausedEvents(frontend));
  await waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepOver() {
  const {frontend} = getBrowserAndPages();
  await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT);
  await frontend.keyboard.press('F10');
  await waitForFunction(() => hasPausedEvents(frontend));
  await waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function stepOut() {
  const {frontend} = getBrowserAndPages();
  await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT);
  await frontend.keyboard.down('Shift');
  await frontend.keyboard.press('F11');
  await frontend.keyboard.up('Shift');
  await waitForFunction(() => hasPausedEvents(frontend));

  await waitFor(PAUSE_INDICATOR_SELECTOR);
}

export async function openNestedWorkerFile(selectors: NestedFileSelector) {
  await expandFileTree(selectors);
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
  await click(selectors.fileSelector);
}

export async function clickOnContextMenu(selector: string, label: string) {
  // Find the selected node, right click.
  await click(selector, {clickOptions: {button: 'right'}});

  // Wait for the context menu option, and click it.
  const labelSelector = `.soft-context-menu > [aria-label="${label}"]`;
  await waitFor(labelSelector);
  await click(labelSelector);
}

export async function inspectMemory(variableName: string) {
  await clickOnContextMenu(
      `[data-object-property-name-for-test="${variableName}"]`, 'Reveal in Memory Inspector panel');
}

export async function typeIntoSourcesAndSave(text: string) {
  const pane = await waitFor('.sources');
  await pane.type(text);

  await pressKey('s', {control: true});
}

export async function getScopeNames() {
  const scopeElements = await $$('.scope-chain-sidebar-pane-section-title');
  const scopeNames = await Promise.all(scopeElements.map(nodes => nodes.evaluate(n => n.textContent)));
  return scopeNames;
}

export async function getValuesForScope(scope: string, expandCount: number, waitForNoOfValues: number) {
  const scopeSelector = `[aria-label="${scope}"]`;
  await waitFor(scopeSelector);
  for (let i = 0; i < expandCount; i++) {
    const unexpandedSelector = `${scopeSelector} + ol li[aria-expanded=false]`;
    await waitFor(unexpandedSelector);
    await click(unexpandedSelector);
  }
  const valueSelector = `${scopeSelector} + ol .name-and-value`;
  const valueSelectorElements = await waitForFunction(async () => {
    const elements = await $$(valueSelector);
    if (elements.length >= waitForNoOfValues) {
      return elements;
    }
    return undefined;
  });
  const values = await Promise.all(valueSelectorElements.map(elem => elem.evaluate(n => n.textContent as string)));
  return values;
}

export async function getPausedMessages() {
  const {frontend} = getBrowserAndPages();
  const messageElement = await frontend.waitForSelector('.paused-message');
  if (!messageElement) {
    assert.fail('getPausedMessages: did not find .paused-message element.');
  }
  const statusMain = await waitFor('.status-main', messageElement);
  const statusSub = await waitFor('.status-sub', messageElement);
  return {
    statusMain: await statusMain.evaluate(x => x.textContent),
    statusSub: await statusSub.evaluate(x => x.textContent),
  };
}

export async function getWatchExpressionsValues() {
  const {frontend} = getBrowserAndPages();
  await waitForFunction(async () => {
    const expandedOption = await $('[aria-label="Watch"].expanded');
    if (expandedOption) {
      return true;
    }
    await click('[aria-label="Watch"]');
    // Wait for the click event to settle.
    await timeout(100);
    return expandedOption !== null;
  });
  await frontend.keyboard.press('ArrowRight');
  const watchExpressionValue = await $(WATCH_EXPRESSION_VALUE_SELECTOR);
  if (!watchExpressionValue) {
    return null;
  }
  const values = await $$(WATCH_EXPRESSION_VALUE_SELECTOR) as puppeteer.ElementHandle<HTMLElement>[];
  return await Promise.all(values.map(value => value.evaluate(element => element.innerText)));
}

export async function runSnippet() {
  const {frontend} = getBrowserAndPages();
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.press('Enter');
  await frontend.keyboard.up(modifierKey);
}

export async function evaluateSelectedTextInConsole() {
  const {frontend} = getBrowserAndPages();
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.down('Shift');
  await frontend.keyboard.press('E');
  await frontend.keyboard.up(modifierKey);
  await frontend.keyboard.up('Shift');
}

export async function addSelectedTextToWatches() {
  const {frontend} = getBrowserAndPages();
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.down('Shift');
  await frontend.keyboard.press('A');
  await frontend.keyboard.up(modifierKey);
  await frontend.keyboard.up('Shift');
}

export async function refreshDevToolsAndRemoveBackendState(target: puppeteer.Page) {
  // Navigate to a different site to make sure that back-end state will be removed.
  await target.goto('about:blank');
  await reloadDevTools({selectedPanel: {name: 'sources'}});
}

export async function enableLocalOverrides() {
  await click(MORE_TABS_SELECTOR);
  await click(OVERRIDES_TAB_SELECTOR);
  await click(ENABLE_OVERRIDES_SELECTOR);
  await waitFor(CLEAR_CONFIGURATION_SELECTOR);
}

export type LabelMapping = {
  label: string,
  moduleOffset: number,
  bytecode: number,
  sourceLine: number,
  labelLine: number,
  labelColumn: number,
};

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
    const testSuitePath = requireTestRunnerConfigSetting<string>('test-suite-path');
    const target = requireTestRunnerConfigSetting<string>('target');
    const mapFileName = path.join('out', target, testSuitePath, 'resources', `${wasm}.map.json`);
    const mapFile = JSON.parse(fs.readFileSync(mapFileName, {encoding: 'utf-8'})) as Array<{
                      source: string,
                      generatedLine: number,
                      generatedColumn: number,
                      bytecodeOffset: number,
                      originalLine: number,
                      originalColumn: number,
                    }>;
    const sourceFileName = path.join('out', target, testSuitePath, 'resources', source);
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
      const labelLine = m.originalLine as number;
      const labelColumn = m.originalColumn as number;
      const sourceLine = labels.get(`${m.source}:${labelLine}:${labelColumn}`);
      assertNotNullOrUndefined(sourceLine);
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
    const mappedLines = this.#mappings.get(label);
    assertNotNullOrUndefined(mappedLines);

    const pauseLocation = await retrieveTopCallFrameWithoutResuming();
    const pausedLine = mappedLines.find(
        line => pauseLocation === `${path.basename(this.#wasm)}:0x${line.moduleOffset.toString(16)}` ||
            pauseLocation === `${path.basename(this.#source)}:${line.sourceLine}`);
    assertNotNullOrUndefined(pausedLine);
    return pausedLine;
  }

  async addBreakpointsForLabelInSource(label: string) {
    const {frontend} = getBrowserAndPages();
    const mappedLines = this.#mappings.get(label);
    assertNotNullOrUndefined(mappedLines);
    await openFileInEditor(path.basename(this.#source));
    for (const line of mappedLines) {
      await addBreakpointForLine(frontend, line.sourceLine);
    }
  }

  async addBreakpointsForLabelInWasm(label: string) {
    const {frontend} = getBrowserAndPages();
    const mappedLines = this.#mappings.get(label);
    assertNotNullOrUndefined(mappedLines);
    await openFileInEditor(path.basename(this.#wasm));
    const visibleLines = await $$(CODE_LINE_SELECTOR);
    const lineNumbers = await Promise.all(visibleLines.map(line => line.evaluate(node => node.textContent)));
    const lineNumberLabels = new Map(lineNumbers.map(label => [Number(label), label]));

    for (const line of mappedLines) {
      const lineNumberLabel = lineNumberLabels.get(line.moduleOffset);
      assertNotNullOrUndefined(lineNumberLabel);
      await addBreakpointForLine(frontend, lineNumberLabel);
    }
  }

  async setBreakpointInSourceAndRun(label: string, script: string) {
    const {target} = getBrowserAndPages();
    await this.addBreakpointsForLabelInSource(label);

    target.evaluate(script);
    await this.checkLocationForLabel(label);
  }

  async setBreakpointInWasmAndRun(label: string, script: string) {
    const {target} = getBrowserAndPages();
    await this.addBreakpointsForLabelInWasm(label);

    target.evaluate(script);
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

export async function retrieveCodeMirrorEditorContent(): Promise<Array<string>> {
  const editor = await waitFor('[aria-label="Code editor"]');
  return await editor.evaluate(
      node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

export async function waitForLines(lineCount: number): Promise<void> {
  await waitFor(new Array(lineCount).fill('.cm-line').join(' ~ '));
}

export async function isPrettyPrinted(): Promise<boolean> {
  const prettyButton = await waitFor('[aria-label="Pretty print"]');
  const isPretty = await prettyButton.evaluate(e => e.ariaPressed);
  return isPretty === 'true';
}
