// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$$, click, getBrowserAndPages, getHostedModeServerPort, goToResource, pressKey, step, timeout, typeText, waitFor, waitForFunction} from '../../shared/helper.js';
import {AsyncScope} from '../../shared/mocha-extensions.js';

export const ACTIVE_LINE = '.CodeMirror-activeline > pre > span';
export const PAUSE_ON_EXCEPTION_BUTTON = '[aria-label="Pause on exceptions"]';
export const PAUSE_BUTTON = '[aria-label="Pause script execution"]';
export const RESUME_BUTTON = '[aria-label="Resume script execution"]';
export const SOURCES_LINES_SELECTOR = '.CodeMirror-code > div';
export const PAUSE_INDICATOR_SELECTOR = '.paused-status';
export const CODE_LINE_SELECTOR = '.CodeMirror-code .CodeMirror-linenumber';
export const SCOPE_LOCAL_VALUES_SELECTOR = 'li[aria-label="Local"] + ol';
export const SELECTED_THREAD_SELECTOR = 'div.thread-item.selected > div.thread-item-title';
export const TURNED_OFF_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-off';
export const TURNED_ON_PAUSE_BUTTON_SELECTOR = 'button.toolbar-state-on';

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

export async function openSnippetsSubPane() {
  const root = await waitFor('.navigator-tabbed-pane');

  await waitFor('[aria-label="More tabs"]', root);
  await click('[aria-label="More tabs"]', {root});

  await waitFor('[aria-label="Snippets"]');

  await click('[aria-label="Snippets"]');
  await waitFor('[aria-label="New snippet"]');
}

export async function createNewSnippet(snippetName: string) {
  const {frontend} = await getBrowserAndPages();

  await click('[aria-label="New snippet"]');
  await waitFor('[aria-label^="Script snippet"]');

  await typeText(snippetName);

  await frontend.keyboard.press('Enter');
}

export async function openFileInEditor(sourceFile: string) {
  // Open a particular file in the editor
  await doubleClickSourceTreeItem(`[aria-label="${sourceFile}, file"]`);

  // Wait for the file to be formattable, this process is async after opening a file
  await waitFor(`[aria-label="Pretty print ${sourceFile}"]`);
}

export async function openSourceCodeEditorForFile(sourceFile: string, testInput: string) {
  await openFileInSourcesPanel(testInput);
  await openFileInEditor(sourceFile);
}

export async function getOpenSources() {
  const sourceTabPane = await waitFor('#sources-panel-sources-view .tabbed-pane');
  const sourceTabs = await waitFor('.tabbed-pane-header-tabs', sourceTabPane);
  const openSources =
      await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
  return openSources;
}

export async function waitForhighlightedLineWhichIncludesText(expectedTextContent: string) {
  const selectedLine = await waitFor(ACTIVE_LINE);
  const text = await selectedLine.evaluate(node => node.textContent);
  assert.deepInclude(text, expectedTextContent);
}

// We can't use the click helper, as it is not possible to select a particular
// line number element in CodeMirror.
export async function addBreakpointForLine(frontend: puppeteer.Page, index: number, expectedFail: boolean = false) {
  const asyncScope = new AsyncScope();
  await asyncScope.exec(() => frontend.waitForFunction((index, CODE_LINE_SELECTOR) => {
    return document.querySelectorAll(CODE_LINE_SELECTOR).length >= (index - 1);
  }, {timeout: 0}, index, CODE_LINE_SELECTOR));
  const breakpointLineNumber = await frontend.evaluate((index, CODE_LINE_SELECTOR) => {
    const element = document.querySelectorAll(CODE_LINE_SELECTOR)[index - 1];

    const {left, top, width, height} = element.getBoundingClientRect();
    return {
      x: left + width * 0.5,
      y: top + height * 0.5,
    };
  }, index, CODE_LINE_SELECTOR);

  const currentBreakpointCount = await frontend.$$eval('.cm-breakpoint', nodes => nodes.length);

  await frontend.mouse.click(breakpointLineNumber.x, breakpointLineNumber.y);

  if (expectedFail) {
    return;
  }

  await asyncScope.exec(() => frontend.waitForFunction(bpCount => {
    return document.querySelectorAll('.cm-breakpoint').length > bpCount &&
        document.querySelectorAll('.cm-breakpoint-unbound').length === 0;
  }, {timeout: 0}, currentBreakpointCount));
}

export function sourceLineNumberSelector(lineNumber: number) {
  return `div.CodeMirror-code > div:nth-child(${lineNumber}) div.CodeMirror-linenumber.CodeMirror-gutter-elt`;
}

export function waitForSourceCodeLines(noOfLines: number) {
  return waitForFunction(async () => {
    const elements = await $$(SOURCES_LINES_SELECTOR);
    return elements.length >= noOfLines ? elements : undefined;
  });
}

export async function checkBreakpointIsActive(lineNumber: number) {
  await step(`check that the breakpoint is still active at line ${lineNumber}`, async () => {
    const sourcesLines = await waitForSourceCodeLines(lineNumber);
    const codeLineNums = await Promise.all(sourcesLines.map(elements => {
      return elements.evaluate(el => el.className);
    }));
    assert.deepInclude(codeLineNums[lineNumber - 1], 'cm-breakpoint');
    assert.notDeepInclude(codeLineNums[lineNumber - 1], 'cm-breakpoint-disabled');
    assert.notDeepInclude(codeLineNums[lineNumber - 1], 'cm-breakpoint-unbound');
  });
}

export async function checkBreakpointIsNotActive(lineNumber: number) {
  await step(`check that the breakpoint is not active at line ${lineNumber}`, async () => {
    const sourcesLines = await waitForSourceCodeLines(lineNumber);
    const codeLineNums = await Promise.all(sourcesLines.map(elements => {
      return elements.evaluate(el => el.className);
    }));
    assert.notDeepInclude(codeLineNums[lineNumber - 1], 'cm-breakpoint');
  });
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

export async function getBreakpointDecorators(frontend: puppeteer.Page, disabledOnly = false) {
  const selector = `.cm-breakpoint${disabledOnly ? '-disabled' : ''} .CodeMirror-linenumber`;
  return await frontend.$$eval(selector, nodes => nodes.map(n => parseInt(n.textContent as string, 0)));
}

export async function getNonBreakableLines(frontend: puppeteer.Page) {
  const selector = '.cm-non-breakable-line .CodeMirror-linenumber';
  await waitFor(selector);
  return await frontend.$$eval(selector, nodes => nodes.map(n => parseInt(n.textContent as string, 0)));
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
  await waitFor(PAUSE_INDICATOR_SELECTOR);

  // Retrieve the top level call frame script location name
  const locationHandle = await waitFor('.call-frame-location');
  const scriptLocation = await locationHandle.evaluate(location => location.textContent);

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
  interface Window {
    __sourceFilesAddedEvents: string[];
  }
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
  return frontend.waitForFunction(count => {
    return window.__sourceFilesAddedEvents.length >= count;
  }, undefined, count);
}

export function clearSourceFilesAdded(frontend: puppeteer.Page) {
  return frontend.evaluate(() => {
    window.__sourceFilesAddedEvents = [];
  });
}

export function retrieveSourceFilesAdded(frontend: puppeteer.Page) {
  // Strip hostname, to make it agnostic of which server port we use
  return frontend.evaluate(() => window.__sourceFilesAddedEvents.map(file => new URL(`http://${file}`).pathname));
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
  const domainSelector = `${rootSelector} + ol > [aria-label="localhost:${getHostedModeServerPort()}, domain"]`;
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
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
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

export async function getValuesForScope(scope: string, expandCount = 0, waitForNoOfValues = 0) {
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
