// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer-core';

import {querySelectorShadowTextAll, querySelectorShadowTextOne} from './custom-query-handlers.js';
import {clearServerPort} from './server_port.js';

let target: puppeteer.Page|null;
let frontend: puppeteer.Page|null;
let browser: puppeteer.Browser|null;

export interface BrowserAndPages {
  target: puppeteer.Page;
  frontend: puppeteer.Page;
  browser: puppeteer.Browser;
}

export const clearPuppeteerState = () => {
  target = null;
  frontend = null;
  browser = null;
  clearServerPort();
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
