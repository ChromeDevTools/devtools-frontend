// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AssertionError} from 'chai';
import * as os from 'os';
import * as puppeteer from 'puppeteer';

import {reloadDevTools} from '../conductor/hooks.js';
import {getBrowserAndPages, getHostedModeServerPort} from '../conductor/puppeteer-state.js';
import {AsyncScope} from './mocha-extensions.js';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

/**
 * Returns an {x, y} position within the element identified by the selector within the root.
 * By default the position is the center of the bounding box. If the element's bounding box
 * extends beyond that of a containing element, this position may not correspond to the element.
 * In this case, specifying maxPixelsFromLeft will constrain the returned point to be close to
 * the left edge of the bounding box.
 */
export const getElementPosition =
    async (selector: string|puppeteer.JSHandle, root?: puppeteer.JSHandle, maxPixelsFromLeft?: number) => {
  let element;
  if (typeof selector === 'string') {
    element = await waitFor(selector, root);
  } else {
    element = selector;
  }

  const rect = await element.evaluate(element => {
    if (!element) {
      return {};
    }

    const {left, top, width, height} = element.getBoundingClientRect();
    return {left, top, width, height};
  });

  if (rect.left === undefined) {
    throw new Error(`Unable to find element with selector "${selector}"`);
  }

  let pixelsFromLeft = rect.width * 0.5;
  if (maxPixelsFromLeft && pixelsFromLeft > maxPixelsFromLeft) {
    pixelsFromLeft = maxPixelsFromLeft;
  }

  return {
    x: rect.left + pixelsFromLeft,
    y: rect.top + rect.height * 0.5,
  };
};

export const click = async (
    selector: string|puppeteer.JSHandle,
    options?: {root?: puppeteer.JSHandle; clickOptions?: puppeteer.ClickOptions; maxPixelsFromLeft?: number;}) => {
  const {frontend} = getBrowserAndPages();
  const clickableElement =
      await getElementPosition(selector, options && options.root, options && options.maxPixelsFromLeft);

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
    async (selector: string, options?: {root?: puppeteer.JSHandle; clickOptions?: puppeteer.ClickOptions}) => {
  const passedClickOptions = (options && options.clickOptions) || {};
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
  await frontend.keyboard.type(text);
};

export const pressKey = async (key: string, modifiers?: {control?: boolean, alt?: boolean, shift?: boolean}) => {
  const {frontend} = getBrowserAndPages();
  if (modifiers) {
    if (modifiers.control) {
      if (platform === 'mac') {
        // Use command key on mac
        await frontend.keyboard.down('Meta');
      } else {
        await frontend.keyboard.down('Control');
      }
    }
    if (modifiers.alt) {
      await frontend.keyboard.down('Alt');
    }
    if (modifiers.shift) {
      await frontend.keyboard.down('Shift');
    }
  }
  await frontend.keyboard.press(key);
  if (modifiers) {
    if (modifiers.shift) {
      await frontend.keyboard.up('Shift');
    }
    if (modifiers.alt) {
      await frontend.keyboard.up('Alt');
    }
    if (modifiers.control) {
      if (platform === 'mac') {
        // Use command key on mac
        await frontend.keyboard.up('Meta');
      } else {
        await frontend.keyboard.up('Control');
      }
    }
  }
};

export const pasteText = async (text: string) => {
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.sendCharacter(text);
};

// Get a single element handle, across Shadow DOM boundaries.
export const $ = async (selector: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  const rootElement = root ? root as puppeteer.ElementHandle : frontend;
  const element = await rootElement.$('pierceShadow/' + selector);
  return element;
};

// Get multiple element handles, across Shadow DOM boundaries.
export const $$ = async (selector: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  const rootElement = root ? root.asElement() || frontend : frontend;
  const elements = await rootElement.$$('pierceShadow/' + selector);
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
  const rootElement = root ? root as puppeteer.ElementHandle : frontend;
  const element = await rootElement.$('pierceShadowText/' + textContent);
  return element;
};

/**
 * Search for all elements based on their textContent
 *
 * @param textContent The text content to search for.
 * @param root The root of the search.
 */
export const $$textContent = async (textContent: string, root?: puppeteer.JSHandle) => {
  const {frontend} = getBrowserAndPages();
  const rootElement = root ? root as puppeteer.ElementHandle : frontend;
  const element = await rootElement.$$('pierceShadowText/' + textContent);
  return element;
};

export const timeout = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

export const waitFor = async (selector: string, root?: puppeteer.JSHandle, asyncScope = new AsyncScope()) => {
  return await asyncScope.exec(() => waitForFunction(async () => {
                                 const element = await $(selector, root);
                                 return (element || undefined);
                               }, asyncScope));
};

export const waitForNone = async (selector: string, root?: puppeteer.JSHandle, asyncScope = new AsyncScope()) => {
  return await asyncScope.exec(() => waitForFunction(async () => {
                                 const elements = await $$(selector, root);
                                 if (elements.length === 0) {
                                   return true;
                                 }
                                 return false;
                               }, asyncScope));
};

export const waitForElementWithTextContent =
    (textContent: string, root?: puppeteer.JSHandle, asyncScope = new AsyncScope()) => {
      return asyncScope.exec(() => waitForFunction(async () => {
                               const elem = await $textContent(textContent, root);
                               return elem || undefined;
                             }, asyncScope));
    };

export const waitForElementsWithTextContent =
    (textContent: string, root?: puppeteer.JSHandle, asyncScope = new AsyncScope()) => {
      return asyncScope.exec(() => waitForFunction(async () => {
                               const elems = await $$textContent(textContent, root);
                               if (elems && elems.length) {
                                 return elems;
                               }

                               return undefined;
                             }, asyncScope));
    };

export const waitForFunction = async<T>(fn: () => Promise<T|undefined>, asyncScope = new AsyncScope()): Promise<T> => {
  return await asyncScope.exec(async () => {
    while (true) {
      const result = await fn();
      if (result) {
        return result;
      }
      await timeout(100);
    }
  });
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

export const overridePermissions = async (permissions: puppeteer.Permission[]) => {
  const {browser} = getBrowserAndPages();
  await browser.defaultBrowserContext().overridePermissions(
      `http://localhost:${getHostedModeServerPort()}`, permissions);
};

export const clearPermissionsOverride = async () => {
  const {browser} = getBrowserAndPages();
  await browser.defaultBrowserContext().clearPermissionOverrides();
};

export const goToResource = async (path: string) => {
  await goTo(`${getResourcesPath()}/${path}`);
};

export const getResourcesPath = () => {
  return `http://localhost:${getHostedModeServerPort()}/test/e2e/resources`;
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

export const waitForAnimationFrame = async () => {
  const {target} = getBrowserAndPages();

  await target.waitForFunction(() => {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  });
};

export const activeElement = async () => {
  const {target} = getBrowserAndPages();

  await waitForAnimationFrame();

  return target.evaluateHandle(() => {
    let activeElement = document.activeElement;

    while (activeElement && activeElement.shadowRoot) {
      activeElement = activeElement.shadowRoot.activeElement;
    }

    return activeElement;
  });
};

export const activeElementTextContent = async () => {
  const element = await activeElement();
  return element.evaluate(node => node.textContent);
};

export const tabForward = async () => {
  const {target} = getBrowserAndPages();

  await target.keyboard.press('Tab');
};

export const tabBackward = async () => {
  const {target} = getBrowserAndPages();

  await target.keyboard.down('Shift');
  await target.keyboard.press('Tab');
  await target.keyboard.up('Shift');
};

export const selectTextFromNodeToNode = async (
    from: puppeteer.JSHandle|Promise<puppeteer.JSHandle>, to: puppeteer.JSHandle|Promise<puppeteer.JSHandle>,
    direction: 'up'|'down') => {
  const {target} = getBrowserAndPages();

  // The clipboard api does not allow you to copy, unless the tab is focused.
  await target.bringToFront();

  return target.evaluate(async (from, to, direction) => {
    const selection = from.getRootNode().getSelection();
    const range = document.createRange();
    if (direction === 'down') {
      range.setStartBefore(from);
      range.setEndAfter(to);
    } else {
      range.setStartBefore(to);
      range.setEndAfter(from);
    }

    selection.removeAllRanges();
    selection.addRange(range);

    document.execCommand('copy');

    return navigator.clipboard.readText();
  }, await from, await to, direction);
};

export const closePanelTab = async (panelTabSelector: string) => {
  // Get close button from tab element
  const selector = `${panelTabSelector} > .tabbed-pane-close-button`;
  await click(selector);
  await waitForNone(selector);
};

export const closeAllCloseableTabs = async () => {
  // get all closeable tools by looking for the available x buttons on tabs
  const selector = '.tabbed-pane-close-button';
  const allCloseButtons = await $$(selector);

  // Get all panel ids
  const panelTabIds = await Promise.all(allCloseButtons.map(button => {
    return button.evaluate(button => button.parentElement ? button.parentElement.id : '');
  }));

  // Close each tab
  for (const tabId of panelTabIds) {
    const selector = `#${tabId}`;
    await closePanelTab(selector);
  }
};

// Noisy! Do not leave this in your test but it may be helpful
// when debugging.
export const enableCDPLogging = async () => {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(() => {
    globalThis.ProtocolClient.test.dumpProtocol = console.log;  // eslint-disable-line no-console
  });
};

export const selectOption = async (select: puppeteer.JSHandle<HTMLSelectElement>, value: string) => {
  await select.evaluate(async (node, _value) => {
    node.value = _value;
    const event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);
    node.dispatchEvent(event);
  }, value);
};

export {getBrowserAndPages, getHostedModeServerPort, reloadDevTools};
