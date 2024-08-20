// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer-core';

import {querySelectorShadowTextAll, querySelectorShadowTextOne} from './custom-query-handlers.js';

let target: puppeteer.Page|null;
let frontend: puppeteer.Page|null;
let browser: puppeteer.Browser|null;

// Set when we launch the server. It will be different for each
// sub-process runner when running in parallel.
let testServerPort: number|null;

export interface BrowserAndPages {
  target: puppeteer.Page;
  frontend: puppeteer.Page;
  browser: puppeteer.Browser;
}

export const clearPuppeteerState = () => {
  target = null;
  frontend = null;
  browser = null;
  testServerPort = null;
};

export const setBrowserAndPages = (newValues: BrowserAndPages) => {
  if (target || frontend || browser) {
    throw new Error('Can\'t set the puppeteer browser twice.');
  }

  ({target, frontend, browser} = newValues);
};

export const getBrowserAndPages = (): BrowserAndPages => {
  if (!target) {
    throw new Error('Unable to locate target page. Was it stored first?');
  }

  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  if (!browser) {
    throw new Error('Unable to locate browser instance. Was it stored first?');
  }

  return {
    target,
    frontend,
    browser,
  };
};

export const setTestServerPort = (port: number) => {
  if (testServerPort) {
    throw new Error('Can\'t set the test server port twice.');
  }
  testServerPort = port;
};

export const getTestServerPort = () => {
  if (!testServerPort) {
    throw new Error(
        'Unable to locate test server port. Was it stored first?' +
        '\nYou might be calling this function at module instantiation time, instead of ' +
        'at runtime when the port is available.');
  }
  return testServerPort;
};

let handlerRegistered = false;
export const registerHandlers = () => {
  if (handlerRegistered) {
    return;
  }
  puppeteer.Puppeteer.registerCustomQueryHandler('pierceShadowText', {
    queryOne: querySelectorShadowTextOne as ((node: Node, selector: string) => Node | null),
    queryAll: querySelectorShadowTextAll as unknown as ((node: Node, selector: string) => Node[]),
  });
  handlerRegistered = true;
};
