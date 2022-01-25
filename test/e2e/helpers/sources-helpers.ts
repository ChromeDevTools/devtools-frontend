// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer';

import {$$, click, getBrowserAndPages, getPendingEvents, getTestServerPort, goToResource, pasteText, platform, pressKey, step, timeout, typeText, waitFor, waitForFunction} from '../../shared/helper.js';

export const ACTIVE_LINE = '.CodeMirror-activeline > pre > span';
export const PAUSE_ON_EXCEPTION_BUTTON = '[aria-label="Pause on exceptions"]';
export const PAUSE_BUTTON = '[aria-label="Pause script execution"]';
export const RESUME_BUTTON = '[aria-label="Resume script execution"]';
export const SOURCES_LINES_SELECTOR = '.CodeMirror-code > div';
export const PAUSE_INDICATOR_SELECTOR = '.paused-status';
export const CODE_LINE_SELECTOR = '.cm-lineNumbers .cm-gutterElement';
export const SCOPE_LOCAL_VALUES_SELECTOR = 'li[aria-label="Local"] + ol';
export const SELECTED_THREAD_SELECTOR = 'div.thread-item.selected > div.thread-item-title';
export const STEP_OVER_BUTTON = '[aria-label="Step over next function call"]';
export const STEP_OUT_BUTTON = '[aria-label="Step out of current function"]';
export const TURNED_OFF_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-off';
export const TURNED_ON_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-on';
export const DEBUGGER_PAUSED_EVENT = 'DevTools.DebuggerPaused';
const WATCH_EXPRESSION_VALUE_SELECTOR = '.watch-expression-tree-item .object-value-string.value';

export async function navigateToLine(frontend: puppeteer.Page, lineNumber: number|string) {
  // Navigating to a line will trigger revealing the current
  // uiSourceCodeFrame. Make sure to consume the 'source-file-loaded'
  // event for this file.
  await listenForSourceFilesLoaded(frontend);

  await frontend.keyboard.down('Control');
  await frontend.keyboard.press('KeyG');
  await frontend.keyboard.up('Control');
  await frontend.keyboard.type(`${lineNumber}`);
  await frontend.keyboard.press('Enter');

  const source = await getSelectedSource();
  await waitForSourceLoadedEvent(frontend, source);
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
  const item = await waitFor(selector);
  await click(item, {clickOptions: {clickCount: 2}, maxPixelsFromLeft: 40});
}

export async function openSourcesPanel() {
  // Locate the button for switching to the sources tab.
  await click('#tab-sources');

  // Wait for the navigation panel to show up
  await waitFor('.navigator-file-tree-item');
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

export async function openFileInEditor(sourceFile: string) {
  const {frontend} = getBrowserAndPages();

  await listenForSourceFilesLoaded(frontend);

  // Open a particular file in the editor
  await doubleClickSourceTreeItem(`[aria-label="${sourceFile}, file"]`);

  await waitForSourceLoadedEvent(frontend, sourceFile);
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

export async function getOpenSources() {
  const sourceTabPane = await waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await waitFor('.tabbed-pane-header-tabs', sourceTabPane);
  const openSources =
      await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
  return openSources;
}

export async function waitForHighlightedLineWhichIncludesText(expectedTextContent: string) {
  await waitForFunction(async () => {
    const selectedLine = await waitFor(ACTIVE_LINE);
    const text = await selectedLine.evaluate(node => node.textContent);
    return (text && text.includes(expectedTextContent)) ? text : undefined;
  });
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
  await navigateToLine(frontend, index);
  const breakpointLine = await getLineNumberElement(index);
  assert.isNotNull(breakpointLine, 'Line is not visible or does not exist');

  await waitForFunction(async () => !(await isBreakpointSet(index)));
  await breakpointLine?.click();

  await waitForFunction(async () => await isBreakpointSet(index));
}

export async function removeBreakpointForLine(frontend: puppeteer.Page, index: number|string) {
  await navigateToLine(frontend, index);
  const breakpointLine = await getLineNumberElement(index);
  assert.isNotNull(breakpointLine, 'Line is not visible or does not exist');

  await waitForFunction(async () => await isBreakpointSet(index));
  await breakpointLine?.click();
  await waitForFunction(async () => !(await isBreakpointSet(index)));
}

export function sourceLineNumberSelector(lineNumber: number) {
  return `div.CodeMirror-code > div:nth-child(${lineNumber}) div.CodeMirror-linenumber.CodeMirror-gutter-elt`;
}

export async function isBreakpointSet(lineNumber: number|string) {
  const breakpointLineParentClasses = await (await getLineNumberElement(lineNumber))?.evaluate(n => n.className);
  return breakpointLineParentClasses?.includes('cm-breakpoint');
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

export async function getExecutionLine() {
  const activeLine = await waitFor('.cm-execution-line-outline');
  return await activeLine.evaluate(n => parseInt(n.textContent as string, 10));
}

export async function getExecutionLineText() {
  const activeLine = await waitFor('.cm-execution-line pre');
  return await activeLine.evaluate(n => n.textContent as string);
}

export async function getCallFrameNames() {
  await waitFor('.call-frame-item-title');
  const items = await $$('.call-frame-item-title');
  const promises = items.map(handle => handle.evaluate(el => el.textContent as string));
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }
  return results;
}

export async function getCallFrameLocations() {
  await waitFor('.call-frame-location');
  const items = await $$('.call-frame-location');
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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window {
    /* eslint-disable @typescript-eslint/naming-convention */
    __sourceFilesAddedEvents: string[];
    __sourceFilesLoadedEvents: string[];
    __sourceFilesLoadedEventListenerAdded: boolean;
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export async function reloadPageAndWaitForSourceFile(
    frontend: puppeteer.Page, target: puppeteer.Page, sourceFile: string) {
  await listenForSourceFilesLoaded(frontend);
  await target.reload();
  await waitForSourceLoadedEvent(frontend, sourceFile);
}

export function listenForSourceFilesLoaded(frontend: puppeteer.Page) {
  return frontend.evaluate(() => {
    if (!window.__sourceFilesLoadedEvents) {
      window.__sourceFilesLoadedEvents = [];
    }
    if (!window.__sourceFilesLoadedEventListenerAdded) {
      window.addEventListener('source-file-loaded', (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        window.__sourceFilesLoadedEvents.push(customEvent.detail);
      });
      window.__sourceFilesLoadedEventListenerAdded = true;
    }
  });
}

export async function waitForSourceLoadedEvent(frontend: puppeteer.Page, fileName: string) {
  const nameRegex = fileName.replace('…', '.*');

  await waitForFunction(async () => {
    return frontend.evaluate(nameRegex => {
      return window.__sourceFilesLoadedEvents.some(x => new RegExp(nameRegex).test(x));
    }, nameRegex);
  });

  await frontend.evaluate(nameRegex => {
    window.__sourceFilesLoadedEvents =
        window.__sourceFilesLoadedEvents.filter(event => !new RegExp(nameRegex).test(event));
  }, nameRegex);
}

export function listenForSourceFilesAdded(frontend: puppeteer.Page) {
  return frontend.evaluate(() => {
    window.__sourceFilesAddedEvents = [];
    window.addEventListener('source-tree-file-added', (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== '/__puppeteer_evaluation_script__') {
        window.__sourceFilesAddedEvents.push(customEvent.detail);
      }
    });
  });
}

export function waitForAdditionalSourceFiles(frontend: puppeteer.Page, count = 1) {
  return waitForFunction(async () => {
    return frontend.evaluate(count => {
      return window.__sourceFilesAddedEvents.length >= count;
    }, count);
  });
}

export function clearSourceFilesAdded(frontend: puppeteer.Page) {
  return frontend.evaluate(() => {
    window.__sourceFilesAddedEvents = [];
  });
}

export function retrieveSourceFilesAdded(frontend: puppeteer.Page) {
  // Strip hostname, to make it agnostic of which server port we use
  return frontend.evaluate(() => window.__sourceFilesAddedEvents.map(file => new URL(`https://${file}`).pathname));
}

// Helpers for navigating the file tree.
export type NestedFileSelector = {
  rootSelector: string,
  domainSelector: string,
  folderSelector: string,
  fileSelector: string,
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

async function expandSourceTreeItem(selector: string) {
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
  const sourceTreeItem = await waitFor(selector);
  const isExpanded = await sourceTreeItem.evaluate(element => {
    return element.getAttribute('aria-expanded') === 'true';
  });
  if (!isExpanded) {
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(50);
    await doubleClickSourceTreeItem(selector);
  }
}

export async function expandFileTree(selectors: NestedFileSelector) {
  await expandSourceTreeItem(selectors.rootSelector);
  await expandSourceTreeItem(selectors.domainSelector);
  await expandSourceTreeItem(selectors.folderSelector);
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
  return await waitFor(selectors.fileSelector);
}

export async function stepThroughTheCode() {
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.press('F9');
  await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
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
  const selectedNode = await waitFor(selector);
  await click(selectedNode, {clickOptions: {button: 'right'}});

  // Wait for the context menu option, and click it.
  const labelSelector = `[aria-label="${label}"]`;
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
  await click('[aria-label="Watch"]');
  await frontend.keyboard.press('ArrowRight');
  await waitFor(WATCH_EXPRESSION_VALUE_SELECTOR);
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
