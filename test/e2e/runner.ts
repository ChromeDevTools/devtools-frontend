// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
import {join} from 'path';
import * as puppeteer from 'puppeteer';

import {store} from './helper.js';
import {testList} from './test-list.js';

const envChromeBinary = process.env['CHROME_BIN'];
const envDebug = !!process.env['DEBUG'];
const envPort = process.env['PORT'] || 9222;
const targetUrl = 'about:blank';
const headless = !envDebug;
const width = 1280;
const height = 720;

const opts: puppeteer.LaunchOptions = {
  headless,
  executablePath: envChromeBinary,
  args: [`--remote-debugging-port=${envPort}`],
  defaultViewport: null,
};

// Toggle either viewport or window size depending on headless vs not.
if (headless) {
  opts.defaultViewport = {width, height};
}
else {
  opts.args.push(`--window-size=${width},${height}`);
}

// 1. Launch Chromium.
const launchedBrowser = puppeteer.launch(opts);
const pages: puppeteer.Page[] = [];

// 2. Spin up the test environment
(async function() {
  try {
    const browser = await launchedBrowser;

    // Load the target page.
    const srcPage = await browser.newPage();
    await srcPage.goto(targetUrl);
    pages.push(srcPage);

    // Now get the DevTools listings.
    const devtools = await browser.newPage();
    await devtools.goto(`http://localhost:${envPort}/json`);

    // Find the appropriate item to inspect the target page.
    const listing = await devtools.$('pre');
    const json = await devtools.evaluate(listing => listing.textContent, listing);
    const targets = JSON.parse(json);
    const {id} = targets.find((target) => target.url === targetUrl);
    await devtools.close();

    // Connect to the DevTools frontend.
    const frontend = await browser.newPage();
    const frontendUrl = `http://localhost:8090/front_end/devtools_app.html?ws=localhost:${envPort}/devtools/page/${id}`;
    frontend.goto(frontendUrl);

    const resetPages =
        async () => {
      // Reload the target page.
      await srcPage.reload({waitUntil: ['networkidle2', 'domcontentloaded']});

      // Clear any local storage settings.
      await frontend.evaluate(() => localStorage.clear());

      // Reload the DevTools frontend and await the elements panel.
      await frontend.reload({waitUntil: ['networkidle2', 'domcontentloaded']});
      await frontend.waitForSelector('.elements');
    }

    store(browser, srcPage, frontend, resetPages);

    // 3. Run tests.
    do {
      if (envDebug) {
        logHelp();
      }

      await waitForInput();
      await runTests();
      if (envDebug) {
        await resetPages();
      }
    } while (envDebug);

  } catch (err) {
    console.warn(err);
  } finally {
    const browser = await launchedBrowser;
    browser.close();
  }
})();

async function waitForInput() {
  return new Promise((resolve) => {
    if (!envDebug) {
      resolve();
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (str) => {
      // Listen for ctrl+c to exit.
      if (str.toString() === '\x03') {
        process.exit(0);
      }
      resolve();
    });
  });
}

let mochaRun: Mocha.Runner;
async function runTests() {
  return new Promise((resolve) => {
    const mocha = new Mocha();
    for (const test of testList) {
      mocha.addFile(join(__dirname, test));
    }
    mocha.ui('bdd');
    mocha.reporter('list');
    mocha.timeout(envDebug ? 100000 : 4000);

    mochaRun = mocha.run();
    mochaRun.on('suite end', () => {
      (mocha as any).unloadFiles();
      resolve();
    });
  });
}

function logHelp() {
  console.log('Running in debug mode.');
  console.log(' - Press any key to run the test suite.');
  console.log(' - Press ctrl + c to quit.');
}
