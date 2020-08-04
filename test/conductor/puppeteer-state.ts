// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';
declare module 'puppeteer' {
  interface QueryHandler {
    queryOne?: (element: Element|Document, selector: string) => Element | null;
    queryAll?: (element: Element|Document, selector: string) => Element[] | NodeListOf<Element>;
  }

  function __experimental_registerCustomQueryHandler(name: string, queryHandler: QueryHandler): void;
  function __experimental_unregisterCustomQueryHandler(name: string): void;
  function __experimental_customQueryHandlers(): Map<string, QueryHandler>;
  function __experimental_clearQueryHandlers(): void;
}

import {querySelectorShadowAll, querySelectorShadowOne, querySelectorShadowTextAll, querySelectorShadowTextOne} from './custom-query-handlers.js';

let target: puppeteer.Page;
let frontend: puppeteer.Page;
let browser: puppeteer.Browser;

// Set when we launch the hosted mode server. It will be different for each
// sub-process runner when running in parallel.
let hostedModeServerPort: number;

export interface BrowserAndPages {
  target: puppeteer.Page;
  frontend: puppeteer.Page;
  browser: puppeteer.Browser;
}

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

export const setHostedModeServerPort = (port: number) => {
  if (hostedModeServerPort) {
    throw new Error('Can\'t set the hosted mode server port twice.');
  }
  hostedModeServerPort = port;
};

export const getHostedModeServerPort = () => {
  if (!hostedModeServerPort) {
    throw new Error(
        'Unable to locate hosted mode server port. Was it stored first?' +
        '\nYou might be calling this function at module instantiation time, instead of ' +
        'at runtime when the port is available.');
  }
  return hostedModeServerPort;
};

export const registerHandlers = () => {
  puppeteer.__experimental_registerCustomQueryHandler('pierceShadow', {
    queryOne: querySelectorShadowOne,
    queryAll: querySelectorShadowAll,
  });
  puppeteer.__experimental_registerCustomQueryHandler('pierceShadowText', {
    queryOne: querySelectorShadowTextOne,
    queryAll: querySelectorShadowTextAll,
  });
};
