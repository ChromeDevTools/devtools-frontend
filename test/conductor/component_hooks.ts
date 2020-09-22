// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';
import {setBrowserAndPages} from './puppeteer-state';

const EMPTY_PAGE = 'data:text/html,';

const width = 1280;
const height = 720;
const headless = !process.env['DEBUG'];

/* eslint-disable no-console */

before(async function() {
  // It can take arbitrarly long on bots to boot up a server and
  // startup DevTools. Since this timeout only applies for this
  // hook, we can let it arbitrarily take a long time, while still
  // enforcing tests to run reasonably quick (2 seconds by default).
  this.timeout(0);

  await globalSetup();

  if (process.env['DEBUG']) {
    console.log('Running in debug mode.');
    console.log(' - Press any key to run the test suite.');
    console.log(' - Press ctrl + c to quit.');

    await new Promise(resolve => {
      const {stdin} = process;

      stdin.on('data', () => {
        stdin.pause();
        resolve();
      });
    });
  }
});

let hasShutdown = false;

async function shutdown() {
  if (hasShutdown) {
    return;
  }
  hasShutdown = true;
  await globalTeardown();
}

process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);

after(async () => {
  await shutdown();
});

let browser: puppeteer.Browser;
let page: puppeteer.Page;

async function globalSetup() {
  const launchArgs = [];
  const opts: puppeteer.LaunchOptions = {
    headless,
    defaultViewport: null,
  };

  // Toggle either viewport or window size depending on headless vs not.
  if (headless) {
    opts.defaultViewport = {width, height};
  } else {
    launchArgs.push(`--window-size=${width},${height}`);
  }

  opts.args = launchArgs;

  browser = await puppeteer.launch(opts);

  await browser.defaultBrowserContext().overridePermissions(
      'http://localhost:8000/', ['clipboard-read', 'clipboard-write']);

  // Load the target page.
  page = await browser.newPage();
  await page.goto(EMPTY_PAGE, {waitUntil: ['domcontentloaded']});

  setBrowserAndPages({browser, target: page, frontend: page});
}

async function globalTeardown() {
  await browser.close();
}
