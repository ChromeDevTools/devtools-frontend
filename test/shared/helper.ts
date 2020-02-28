// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';
import {performance} from 'perf_hooks';
import * as puppeteer from 'puppeteer';
import * as os from 'os';

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

interface BrowserAndPages {
  browser: puppeteer.Browser;
  target: puppeteer.Page;
  frontend: puppeteer.Page;
  screenshot?: puppeteer.Page;
}

const targetPage = Symbol('TargetPage');
const frontEndPage = Symbol('DevToolsPage');
const screenshotPage = Symbol('ScreenshotPage');
const browserInstance = Symbol('BrowserInstance');

export let resetPages: (...enabledExperiments: string[]) => void;

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
  const frontend: puppeteer.Page = globalThis[frontEndPage];
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

export const getElementPosition = async (selector: string, root?: puppeteer.JSHandle) => {
  const element = await $(selector, root);
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

export const click =
    async (selector: string, options?: {root?: puppeteer.JSHandle, clickOptions?: puppeteer.ClickOptions}) => {
  const frontend: puppeteer.Page = globalThis[frontEndPage];
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

// Get a single element handle, across Shadow DOM boundaries.
export const $ = async (selector: string, root?: puppeteer.JSHandle) => {
  const frontend: puppeteer.Page = globalThis[frontEndPage];
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
  } catch (e) {
    throw new Error(`Unable to find element for selector "${selector}": ${e.stack}`);
  }
};

// Get a multiple element handles, across Shadow DOM boundaries.
export const $$ = async (selector: string, root?: puppeteer.JSHandle) => {
  const frontend: puppeteer.Page = globalThis[frontEndPage];
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

export const timeout = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

export const waitFor =
    async (selector: string, root?: puppeteer.JSHandle, maxTotalTimeout = 0) => {
  if (maxTotalTimeout === 0) {
    maxTotalTimeout = Number.POSITIVE_INFINITY;
  }

  const start = performance.now();
  do {
    await timeout(100);
    const element = await $(selector, root);
    if (element.asElement()) {
      return element;
    }
  } while (performance.now() - start < maxTotalTimeout);

  throw new Error(`Unable to find element with selector ${selector}`);
};

export const debuggerStatement = (frontend: puppeteer.Page) => {
  return frontend.evaluate(() => {
    // eslint-disable-next-line no-debugger
    debugger;
  });
};

export const store =
    (browser: puppeteer.Browser, target: puppeteer.Page, frontend: puppeteer.Page, screenshot: puppeteer.Page | undefined,
     reset: (...enabledExperiments: string[]) => void) => {
      globalThis[browserInstance] = browser;
      globalThis[targetPage] = target;
      globalThis[frontEndPage] = frontend;
      globalThis[screenshotPage] = screenshot;
      resetPages = reset;
    };

export const getBrowserAndPages = (): BrowserAndPages => {
  if (!globalThis[targetPage]) {
    throw new Error('Unable to locate target page. Was it stored first?');
  }

  if (!globalThis[frontEndPage]) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  if (!globalThis[browserInstance]) {
    throw new Error('Unable to locate browser instance. Was it stored first?');
  }

  return {
    browser: globalThis[browserInstance],
    target: globalThis[targetPage],
    frontend: globalThis[frontEndPage],
    screenshot: globalThis[screenshotPage],
  };
};

export const resourcesPath = 'http://localhost:8090/test/e2e/resources';

export function mkdirp(root: string, parts: string[]) {
  let target = root;
  for (const part of parts) {
    const newTarget = join(target, part);
    if (!fs.existsSync(newTarget)) {
      fs.mkdirSync(newTarget);
    }

    target = newTarget;
  }
}
