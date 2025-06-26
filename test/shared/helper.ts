// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AssertionError} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../conductor/async-scope.js';
import type {DevToolsFrontendReloadOptions} from '../conductor/frontend_tab.js';
import {getDevToolsFrontendHostname, reloadDevTools} from '../conductor/hooks.js';
import {getBrowserAndPages} from '../conductor/puppeteer-state.js';
import {getTestServerPort} from '../conductor/server_port.js';
import type {DevToolsPage} from '../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../e2e_non_hosted/shared/target-helper.js';

import {getBrowserAndPagesWrappers} from './non_hosted_wrappers.js';

export {platform} from '../conductor/mocha-interface-helpers.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pendingEvents: Map<string, Event[]>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __eventHandlers: WeakMap<Element, Map<string, Promise<void>>>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __getRenderCoordinatorPendingFrames(): number;
  }
}

// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

export interface ClickOptions {
  root?: puppeteer.ElementHandle;
  clickOptions?: puppeteer.ClickOptions;
  maxPixelsFromLeft?: number;
}

export const withControlOrMetaKey = async (action: () => Promise<void>, root = getBrowserAndPages().frontend) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.withControlOrMetaKey(action, root);
};

export const click = async (selector: string, options?: ClickOptions) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.click(selector, options);
};

export const hover = async (selector: string, options?: {root?: puppeteer.ElementHandle}) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.hover(selector, options);
};

/**
 * Schedules a task in the frontend page that ensures that previously
 * handled tasks have been handled.
 */
export async function drainFrontendTaskQueue(): Promise<void> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.drainTaskQueue();
}

/**
 * @deprecated This method is not able to recover from unstable DOM. Use click(selector) instead.
 */
export async function clickElement(element: puppeteer.ElementHandle, options?: ClickOptions): Promise<void> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.clickElement(element, options);
}

/**
 * @deprecated This method is not able to recover from unstable DOM. Use hover(selector) instead.
 */
export async function hoverElement(element: puppeteer.ElementHandle): Promise<void> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  // Retries here just in case the element gets connected to DOM / becomes visible.
  await devToolsPage.hoverElement(element);
}

export const doubleClick =
    async (selector: string, options?: {root?: puppeteer.ElementHandle, clickOptions?: puppeteer.ClickOptions}) => {
  const devToolsPage = getBrowserAndPagesWrappers().devToolsPage;
  return await devToolsPage.doubleClick(selector, options);
};

export const typeText = async (text: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.typeText(text);
};

export const pressKey = async (
    key: puppeteer.KeyInput, modifiers?: {control?: boolean, alt?: boolean, shift?: boolean},
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.pressKey(key, modifiers);
};

export const pasteText = async (text: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.pasteText(text);
};

export const $ = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, root?: puppeteer.ElementHandle, handler = 'pierce') => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.$<ElementType, Selector>(selector, root, handler);
};

// Get multiple element handles. Uses `pierce` handler per default for piercing Shadow DOM.
export const $$ = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, root?: puppeteer.JSHandle, handler = 'pierce', devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  return await devToolsPage.$$<ElementType, Selector>(selector, root, handler);
};

/**
 * Search for an element based on its textContent.
 *
 * @param textContent The text content to search for.
 * @param root The root of the search.
 */
export const $textContent = async (textContent: string, root?: puppeteer.ElementHandle) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.$textContent(textContent, root);
};

/**
 * Search for all elements based on their textContent
 *
 * @param textContent The text content to search for.
 * @param root The root of the search.
 */
export const $$textContent = async (textContent: string, root?: puppeteer.ElementHandle) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.$$textContent(textContent, root);
};

export const timeout = (duration: number) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.timeout(duration);
};

export const getTextContent =
    async<ElementType extends Element = Element>(selector: string, root?: puppeteer.ElementHandle) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.getTextContent<ElementType>(selector, root);
};

export const getAllTextContents =
    async(selector: string, root?: puppeteer.JSHandle, handler = 'pierce'): Promise<Array<string|null>> => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.getAllTextContents(selector, root, handler);
};

/**
 * Match multiple elements based on a selector and return their textContents, but only for those
 * elements that are visible.
 *
 * @param selector jquery selector to match
 * @returns array containing text contents from visible elements
 */
export const getVisibleTextContents =
    async (selector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.getVisibleTextContents(selector);
};

export const waitFor = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitFor<ElementType, Selector>(selector, root, asyncScope, handler);
};

export const waitForVisible = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForVisible<ElementType, Selector>(selector, root, asyncScope, handler);
};

export const waitForMany = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, count: number, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(),
    handler?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForMany<ElementType, Selector>(selector, count, root, asyncScope, handler);
};

export const waitForNone =
    async (selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForNone(selector, root, asyncScope, handler);
};

export const waitForAria = <ElementType extends Element = Element>(
    selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.waitForAria<ElementType>(selector, root, asyncScope);
};

export const waitForAriaNone = (selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.waitForAriaNone(selector, root, asyncScope);
};

export const waitForElementWithTextContent =
    (textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
      const {devToolsPage} = getBrowserAndPagesWrappers();
      return devToolsPage.waitForElementWithTextContent(textContent, root, asyncScope);
    };

export const waitForElementsWithTextContent =
    (textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
      const {devToolsPage} = getBrowserAndPagesWrappers();
      return devToolsPage.waitForElementsWithTextContent(textContent, root, asyncScope);
    };

export const waitForNoElementsWithTextContent =
    (textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
      const {devToolsPage} = getBrowserAndPagesWrappers();
      return devToolsPage.waitForNoElementsWithTextContent(textContent, root, asyncScope);
    };

export const waitForFunction =
    async<T>(fn: () => Promise<T|undefined>, asyncScope = new AsyncScope(), description?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForFunction(fn, asyncScope, description);
};

export const waitForFunctionWithTries = async<T>(
    fn: () => Promise<T|undefined>, options: {tries: number} = {
      tries: Number.MAX_SAFE_INTEGER,
    },
    asyncScope = new AsyncScope()) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForFunctionWithTries(fn, options, asyncScope);
};

export const waitForWithTries = async (
    selector: string, root?: puppeteer.ElementHandle, options: {tries: number} = {
      tries: Number.MAX_SAFE_INTEGER,
    },
    asyncScope = new AsyncScope(), handler?: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForWithTries(selector, root, options, asyncScope, handler);
};

export const debuggerStatement = (_frontend: puppeteer.Page) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.debuggerStatement();
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

async function setExperimentEnabled(experiment: string, enabled: boolean, options?: DevToolsFrontendReloadOptions) {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(`(async () => {
    const Root = await import('./core/root/root.js');
    Root.Runtime.experiments.setEnabled('${experiment}', ${enabled});
  })()`);
  await reloadDevTools(options);
}

export const enableExperiment = (experiment: string, options?: DevToolsFrontendReloadOptions) =>
    setExperimentEnabled(experiment, true, options);

export const disableExperiment = (experiment: string, options?: DevToolsFrontendReloadOptions) =>
    setExperimentEnabled(experiment, false, options);

export const setDevToolsSettings = async (settings: Record<string, string>) => {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(settings => {
    for (const name in settings) {
      globalThis.InspectorFrontendHost.setPreference(name, JSON.stringify(settings[name]));
    }
  }, settings);
  await reloadDevTools();
};

export async function goToHtml(html: string) {
  const {inspectedPage} = getBrowserAndPagesWrappers();
  return await inspectedPage.goTo(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

export const goTo = async (url: string, options: puppeteer.WaitForOptions = {}) => {
  const {inspectedPage} = getBrowserAndPagesWrappers();
  await inspectedPage.goTo(url, options);
};

export const overridePermissions =
    async (permissions: puppeteer.Permission[], inspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  await inspectedPage.page.browserContext().overridePermissions(
      `https://localhost:${inspectedPage.serverPort}`, permissions);
};

export const clearPermissionsOverride = async (inspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  await inspectedPage.page.browserContext().clearPermissionOverrides();
};

export const goToResource =
    async (path: string, options: puppeteer.WaitForOptions&{inspectedPage?: InspectedPage} = {}) => {
  const inspectedPage = options.inspectedPage ?? getBrowserAndPagesWrappers().inspectedPage;
  await inspectedPage.goToResource(path, options);
};

export const goToResourceWithCustomHost = async (host: string, path: string) => {
  const {inspectedPage} = getBrowserAndPagesWrappers();
  await inspectedPage.goToResourceWithCustomHost(host, path);
};

export const getResourcesPath = (host = 'localhost') => {
  const {inspectedPage} = getBrowserAndPagesWrappers();
  return inspectedPage.getResourcesPath(host);
};

export const step = async<T = unknown>(description: string, step: () => Promise<T>| T): Promise<Awaited<T>> => {
  try {
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
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.waitForAnimationFrame();
};

export const activeElement = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.activeElement();
};

export const activeElementTextContent = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.activeElementTextContent();
};

export const activeElementAccessibleName = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.activeElementAccessibleName();
};

export const tabForward = async (page?: puppeteer.Page) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.tabForward(page);
};

export const tabBackward = async (page?: puppeteer.Page) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.tabBackward(page);
};

export const clickMoreTabsButton = async (
    root?: puppeteer.ElementHandle<Element>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.clickMoreTabsButton(root);
};

export const closePanelTab =
    async (panelTabSelector: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.closePanelTab(panelTabSelector);
};

export const closeAllCloseableTabs = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.closeAllCloseableTabs();
};

// Noisy! Do not leave this in your test but it may be helpful
// when debugging.
export const enableCDPLogging = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.enableCDPLogging();
};

export const enableCDPTracking = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.enableCDPTracking();
};

export const logOutstandingCDP = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.logOutstandingCDP();
};

export const selectOption = async (select: puppeteer.ElementHandle<HTMLSelectElement>, value: string) => {
  await select.evaluate(async (node: HTMLSelectElement, _value: string) => {
    node.value = _value;
    const event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);
    node.dispatchEvent(event);
  }, value);
};

export const scrollElementIntoView = async (
    selector: string, root?: puppeteer.ElementHandle,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.scrollElementIntoView(selector, root);
};

export const installEventListener = function(_frontend: puppeteer.Page, eventType: string) {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.installEventListener(eventType);
};

export const getPendingEvents = function(_frontend: puppeteer.Page, eventType: string): Promise<Event[]|undefined> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return devToolsPage.getPendingEvents(eventType);
};

export function prepareWaitForEvent(element: puppeteer.ElementHandle, eventType: string): Promise<void> {
  return element.evaluate((element: Element, eventType: string) => {
    window.__eventHandlers = window.__eventHandlers || new WeakMap();

    const eventHandlers = (() => {
      const eventHandlers = window.__eventHandlers.get(element);
      if (eventHandlers) {
        return eventHandlers;
      }
      const newMap = new Map<string, Promise<void>>();
      window.__eventHandlers.set(element, newMap);
      return newMap;
    })();

    if (eventHandlers.has(eventType)) {
      throw new Error(`Event listener for ${eventType}' has already been installed.`);
    }
    eventHandlers.set(eventType, new Promise<void>(resolve => {
                        const handler = () => {
                          element.removeEventListener(eventType, handler);
                          resolve();
                        };
                        element.addEventListener(eventType, handler);
                      }));
  }, eventType);
}

export function waitForEvent(element: puppeteer.ElementHandle, eventType: string): Promise<void> {
  return element.evaluate((element: Element, eventType: string) => {
    if (!('__eventHandlers' in window)) {
      throw new Error(`Event listener for '${eventType}' has not been installed.`);
    }
    const handler = window.__eventHandlers.get(element)?.get(eventType);
    if (!handler) {
      throw new Error(`Event listener for '${eventType}' has not been installed.`);
    }
    return handler;
  }, eventType);
}

export const hasClass = async (element: puppeteer.ElementHandle<Element>, classname: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.hasClass(element, classname);
};

export const waitForClass = async (element: puppeteer.ElementHandle<Element>, classname: string) => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  return await devToolsPage.waitForClass(element, classname);
};

/**
 * This is useful to keep TypeScript happy in a test - if you have a value
 * that's potentially `null` you can use this function to assert that it isn't,
 * and satisfy TypeScript that the value is present.
 */
export function assertNotNullOrUndefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === null || val === undefined) {
    throw new Error(`Expected given value to not be null/undefined but it was: ${val}`);
  }
}

export {getBrowserAndPages, getDevToolsFrontendHostname, getTestServerPort, reloadDevTools};

export function matchString(actual: string, expected: string|RegExp): true|string {
  if (typeof expected === 'string') {
    if (actual !== expected) {
      return `Expected item "${actual}" to equal "${expected}"`;
    }
  } else if (!expected.test(actual)) {
    return `Expected item "${actual}" to match "${expected}"`;
  }
  return true;
}

export function matchArray<A, E>(
    actual: A[], expected: E[], comparator: (actual: A, expected: E) => true | string): true|string {
  if (actual.length !== expected.length) {
    return `Expected [${actual.map(x => `"${x}"`).join(', ')}] to have length ${expected.length}`;
  }

  for (let i = 0; i < expected.length; ++i) {
    const result = comparator(actual[i], expected[i]);
    if (result !== true) {
      return `Mismatch in row ${i}: ${result}`;
    }
  }
  return true;
}

export function assertOk<Args extends unknown[]>(check: (...args: Args) => true | string) {
  return (...args: Args) => {
    const result = check(...args);
    if (result !== true) {
      throw new AssertionError(result);
    }
  };
}

export function matchTable<A, E>(
    actual: A[][], expected: E[][], comparator: (actual: A, expected: E) => true | string) {
  return matchArray(actual, expected, (actual, expected) => matchArray<A, E>(actual, expected, comparator));
}

export const matchStringArray = (actual: string[], expected: Array<string|RegExp>) =>
    matchArray(actual, expected, matchString);

export const assertMatchArray = assertOk(matchStringArray);

export const matchStringTable = (actual: string[][], expected: Array<Array<string|RegExp>>) =>
    matchTable(actual, expected, matchString);

export async function renderCoordinatorQueueEmpty(): Promise<void> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.renderCoordinatorQueueEmpty();
}

export async function setCheckBox(selector: string, wantChecked: boolean): Promise<void> {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.setCheckBox(selector, wantChecked);
}

export const summonSearchBox = async () => {
  const {devToolsPage} = getBrowserAndPagesWrappers();
  await devToolsPage.summonSearchBox();
};

export const replacePuppeteerUrl = (value: string) => {
  return value.replace(/pptr:.*:([0-9]+)$/, (_, match) => {
    return `(index):${match}`;
  });
};

/**
 * @deprecated Use devToolsPage.raf or inspectedPage.raf instead
 */
export async function raf(page: puppeteer.Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
  });
}

export async function readClipboard() {
  const {devToolsPage, browserWrapper} = getBrowserAndPagesWrappers();
  return await devToolsPage.readClipboard(browserWrapper);
}
