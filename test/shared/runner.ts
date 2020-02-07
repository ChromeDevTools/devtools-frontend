// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
import * as puppeteer from 'puppeteer';
import {spawn} from 'child_process';
import {join} from 'path';
import {store} from './helper.js';

const testListPath = process.env['TEST_LIST'];
const envChromeBinary = process.env['CHROME_BIN'];
const envDebug = !!process.env['DEBUG'];
const envPort = process.env['PORT'] || 9222;
const envNoShuffle = !!process.env['NO_SHUFFLE'];
const blankPage = 'data:text/html,';
const headless = !envDebug;
const width = 1280;
const height = 720;

let mochaRun: Mocha.Runner;
let exitCode = 0;

function interruptionHandler() {
  console.log('\n');
  if (mochaRun) {
    console.log('Aborting tests');
    mochaRun.abort();
  }
  exitCode = 1;
  shutdown();
}

function shutdown() {
  console.log('\n');
  console.log('Stopping hosted mode server');
  hostedModeServer.kill();

  console.log(`Exiting with status code ${exitCode}`);
  process.exit(exitCode);
}

process.on('SIGINT', interruptionHandler);
process.on('SIGTERM', interruptionHandler);
process.on('uncaughtException', interruptionHandler);
process.stdin.resume();

// 1. Launch Chromium.
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

const launchedBrowser = puppeteer.launch(opts);
const pages: puppeteer.Page[] = [];

// 2. Start DevTools hosted mode.
function handleHostedModeError(data) {
  console.log('Hosted mode server:');
  console.log(data.toString());
  interruptionHandler();
}

console.log('Spawning hosted mode server');
const serverScriptPath = join(__dirname, '..', '..', 'scripts', 'hosted_mode', 'server.js');
const cwd = join(__dirname, '..', '..');
const {execPath} = process;
const hostedModeServer = spawn(execPath, [serverScriptPath], { cwd, shell: true, detached: true });
hostedModeServer.on('error', handleHostedModeError);
hostedModeServer.stderr.on('data', handleHostedModeError);

// 3. Spin up the test environment
(async function() {
  try {
    const browser = await launchedBrowser;

    // Load the target page.
    const srcPage = await browser.newPage();
    await srcPage.goto(blankPage);
    pages.push(srcPage);

    // Now get the DevTools listings.
    const devtools = await browser.newPage();
    await devtools.goto(`http://localhost:${envPort}/json`);

    // Find the appropriate item to inspect the target page.
    const listing = await devtools.$('pre');
    const json = await devtools.evaluate(listing => listing.textContent, listing);
    const targets = JSON.parse(json);
    const {id} = targets.find((target) => target.url === blankPage);
    await devtools.close();

    // Connect to the DevTools frontend.
    const frontend = await browser.newPage();
    const frontendUrl = `http://localhost:8090/front_end/devtools_app.html?ws=localhost:${envPort}/devtools/page/${id}`;
    await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});

    const resetPages =
        async (...enabledExperiments: string[]) => {
      // Reload the target page.
      await srcPage.goto(blankPage, {waitUntil: ['domcontentloaded']});

      // Clear any local storage settings.
      await frontend.evaluate(() => localStorage.clear());

      await frontend.evaluate((enabledExperiments) => {
        for (const experiment of enabledExperiments) {
          globalThis.Root.Runtime.experiments.setEnabled(experiment, true);
        }
      }, enabledExperiments);

      // Reload the DevTools frontend and await the elements panel.
      await frontend.goto(blankPage, {waitUntil: ['domcontentloaded']});
      await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});
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
    shutdown();
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
    process.stdin.on('data', async (str) => {
      // Listen for ctrl+c to exit.
      if (str.toString() === '\x03') {
        interruptionHandler();
      }
      resolve();
    });
  });
}

async function runTests() {
  const {testList} = await import(testListPath);
  const shuffledTests = shuffleTestFiles(testList);

  return new Promise((resolve) => {
    const mocha = new Mocha();
    for (const test of shuffledTests) {
      mocha.addFile(test);
    }
    mocha.ui('bdd');
    mocha.reporter('list');
    mocha.timeout(envDebug ? 100000 : 4000);

    mochaRun = mocha.run();
    mochaRun.on('end', () => {
      (mocha as any).unloadFiles();
      resolve();
    });

    mochaRun.on('fail', () => {
      exitCode = 1;
    });
  });
}

function logHelp() {
  console.log('Running in debug mode.');
  console.log(' - Press any key to run the test suite.');
  console.log(' - Press ctrl + c to quit.');
}

function shuffleTestFiles(files: string[]) {
  if (envNoShuffle) {
    console.log('Running tests unshuffled');
    return files;
  }

  const swap = (arr, a, b) => {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
  }

  for (let i = files.length; i >= 0; i--) {
    const a = Math.floor(Math.random() * files.length);
    const b = Math.floor(Math.random() * files.length);

    swap(files, a, b);
  }

  console.log(`Running tests in the following order:\n${files.join('\n')}`);
  return files;
}
