// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

let target: puppeteer.Page;
let frontend: puppeteer.Page;
let browser: puppeteer.Browser;

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
