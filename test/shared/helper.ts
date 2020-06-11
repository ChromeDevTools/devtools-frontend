// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AssertionError} from 'chai';
import * as os from 'os';
import {performance} from 'perf_hooks';
import * as puppeteer from 'puppeteer';

import {reloadDevTools} from '../conductor/hooks.js';
import {getBrowserAndPages} from '../conductor/puppeteer-state.js';

export let platform: string;
switch (os.platform()) {
  case 'darwin':
    platform = 'mac';
    break;

  case 'win32':
    platform = 'win32';
    break;

  default:
    platform = 'linux';
    break;
}

// TODO: Remove once Chromium updates its version of Node.js to 12+.
const globalThis: any = global;

/**
 * Because querySelector is unable to go through shadow roots, we take the opportunity
 * to collect all elements from everywhere in the page, optionally starting at a given
 * root node. This means that when we attempt to locate elements for the purposes of
 * interactions, we can use this flattened list rather than attempting querySelector
 * dances.
 */
const collectAllElementsFromPage = async (root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(root => {
    const container = (self as any);
    container.__elements = [];
    const collect = (root: HTMLElement|ShadowRoot) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      do {
        const currentNode = walker.currentNode as HTMLElement;
        if (currentNode.shadowRoot) {
          collect(currentNode.shadowRoot);
        }
        // We're only interested in actual elements that we can later use for selector
        // matching, so skip shadow roots.
        if (!(currentNode instanceof ShadowRoot)) {
          container.__elements.push(currentNode);
        }
      } while (walker.nextNode());
    };
    collect(root || document.documentElement);
  }, root || '');
};

export const getElementPosition = async (selector: string|puppeteer.JSHandle, root?: puppeteer.JSHandle) => {
  let element: puppeteer.JSHandle;
  if (typeof selector === 'string') {
    element = await $(selector, root);
  } else {
    element = selector;
  }

  const position = await element.evaluate(element => {
    if (!element) {
      return {};
    }
    // Extract the location values.
    const {left, top, width, height} = element.getBoundingClientRect();
    return {
      x: left + width * 0.5,
      y: top + height * 0.5,
    };
  });
  if (position.x === undefined || position.y === undefined) {
    throw new Error(`Unable to find element with selector "${selector}"`);
  }
  return position;
};

export const click = async (
    selector: string|puppeteer.JSHandle,
    options?: {root?: puppeteer.JSHandle, clickOptions?: puppeteer.ClickOptions}) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }
  const clickableElement = await getElementPosition(selector, options && options.root);

  if (!clickableElement) {
    throw new Error(`Unable to locate clickable element "${selector}".`);
  }

  // Click on the button and wait for the console to load. The reason we use this method
  // rather than elementHandle.click() is because the frontend attaches the behavior to
  // a 'mousedown' event (not the 'click' event). To avoid attaching the test behavior
  // to a specific event we instead locate the button in question and ask Puppeteer to
  // click on it instead.
  await frontend.mouse.click(clickableElement.x, clickableElement.y, options && options.clickOptions);
};

export const doubleClick =
    async (selector: string, options?: {root?: puppeteer.JSHandle, clickOptions?: puppeteer.ClickOptions}) => {
  const passedClickOptions = options && options.clickOptions || {};
  const clickOptionsWithDoubleClick: puppeteer.ClickOptions = {
    ...passedClickOptions,
    clickCount: 2,
  };
  return click(selector, {
    ...options,
    clickOptions: clickOptionsWithDoubleClick,
  });
};

export const typeText = async (text: string) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  await frontend.keyboard.type(text);
};

export const pasteText = async (text: string) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  await frontend.keyboard.sendCharacter(text);
};

// Get a single element handle, across Shadow DOM boundaries.
export const $ = async (selector: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }
  await collectAllElementsFromPage(root);
  try {
    const element = await frontend.evaluateHandle(selector => {
      const elements: Element[] = globalThis.__elements;
      return elements.find(element => element.matches(selector));
    }, selector);
    return element;
  } catch (error) {
    throw new Error(`Unable to find element for selector "${selector}": ${error.stack}`);
  }
};

// Get multiple element handles, across Shadow DOM boundaries.
export const $$ = async (selector: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }
  await collectAllElementsFromPage(root);
  const elements = await frontend.evaluateHandle(selector => {
    const elements: Element[] = globalThis.__elements;
    return elements.filter(element => element.matches(selector));
  }, selector);
  return elements;
};

/**
 * Search for an element based on its textContent.
 *
 * @param textContent The text content to search for.
 * @param root The root of the search.
 */
export const $textContent = async (textContent: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }
  await collectAllElementsFromPage(root);
  try {
    const element = await frontend.evaluateHandle((textContent: string) => {
      const elements: Element[] = globalThis.__elements;
      return elements.find(element => ('textContent' in element && element.textContent === textContent));
    }, textContent);
    return element;
  } catch (error) {
    throw new Error(`Unable to find element with textContent "${textContent}": ${error.stack}`);
  }
};

export const timeout = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

export const waitFor = async (selector: string, root?: puppeteer.JSHandle, maxTotalTimeout = 0) => {
  return waitForFunction(async () => {
    const element = await $(selector, root);
    if (element.asElement()) {
      return element;
    }
    return undefined;
  }, `Unable to find element with selector ${selector}`, maxTotalTimeout);
};

export const waitForNone = async (selector: string, root?: puppeteer.JSHandle, maxTotalTimeout = 0) => {
  return waitForFunction(async () => {
    const elements = await $$(selector, root);
    if (elements.evaluate(list => list.length === 0)) {
      return true;
    }
    return false;
  }, `At least one element with selector ${selector} still exists`, maxTotalTimeout);
};

export const waitForElementWithTextContent = (textContent: string, root?: puppeteer.JSHandle, maxTotalTimeout = 0) => {
  return waitForFunction(async () => {
    const element = await $textContent(textContent, root);
    if (element.asElement()) {
      return element;
    }
    return undefined;
  }, `No element with content ${textContent} exists`, maxTotalTimeout);
};

export const waitForFunction =
    async<T>(fn: () => Promise<T|undefined>, errorMessage: string, maxTotalTimeout = 0): Promise<T> => {
  if (maxTotalTimeout === 0) {
    maxTotalTimeout = Number.POSITIVE_INFINITY;
  }

  const start = performance.now();
  do {
    await timeout(100);
    const result = await fn();
    if (result) {
      return result;
    }
  } while (performance.now() - start < maxTotalTimeout);

  throw new Error(errorMessage);
};

export const debuggerStatement = (frontend: puppeteer.Page) => {
  return frontend.evaluate(() => {
    // eslint-disable-next-line no-debugger
    debugger;
  });
};

export const logToStdOut = (msg: string) => {
  if (!process.send) {
    return;
  }

  process.send({
    pid: process.pid,
    details: msg,
  });
};

export const logFailure = () => {
  if (!process.send) {
    return;
  }

  process.send({
    pid: process.pid,
    details: 'failure',
  });
};

export const resourcesPath = 'http://localhost:8090/test/e2e/resources';

export const enableExperiment = async (
    experiment: string, options: {selectedPanel?: {name: string, selector?: string}, canDock?: boolean} = {}) => {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(experiment => {
    // @ts-ignore
    globalThis.Root.Runtime.experiments.setEnabled(experiment, true);
  }, experiment);

  await reloadDevTools(options);
};

export const goTo = async (url: string) => {
  const {target} = getBrowserAndPages();
  await target.goto(url);
};

export const goToResource = async (path: string) => {
  await goTo(`${resourcesPath}/${path}`);
};

export const step = async (description: string, step: Function) => {
  try {
    // eslint-disable-next-line no-console
    console.log(`     Running step "${description}"`);
    return await step();
  } catch (error) {
    if (error instanceof AssertionError) {
      throw new AssertionError(
          `Unexpected Result in Step "${description}"
      ${error.message}`,
          error);
    } else {
      error.message += ` in Step "${description}"`;
      throw error;
    }
  }
};

export const closePanelTab = async (panelTabId: string) => {
  // Get close button from tab element
  const selector = `#${panelTabId} > .tabbed-pane-close-button`;
  await click(selector);
};

export const closeAllCloseableTabs = async () => {
  // get all closeable tools by looking for the available x buttons on tabs
  const selector = '.tabbed-pane-close-button';
  const allCloseButtons = await $$(selector);

  // Get all panel ids
  const panelTabIds = await allCloseButtons.evaluate((buttons: HTMLElement[]) => {
    return buttons.map(button => button.parentElement ? button.parentElement.id : '');
  });

  // Close each tab
  for (const panelTabId of panelTabIds) {
    closePanelTab(panelTabId);
  }
};

export {getBrowserAndPages, reloadDevTools};
