// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

import {getBrowserAndPages, setBrowserAndPages} from './puppeteer-state.js';

const HOSTED_MODE_SERVER_PATH = path.join(__dirname, '..', '..', 'scripts', 'hosted_mode', 'server.js');
const EMPTY_PAGE = 'data:text/html,';
const DEFAULT_TAB = {
  name: 'elements',
  selector: '.elements',
};

const cwd = path.join(__dirname, '..', '..');
const {execPath} = process;
const width = 1280;
const height = 720;

const envPort = 9222;
const headless = !process.env['DEBUG'];
const envSlowMo = process.env['STRESS'] ? 50 : undefined;
const envThrottleRate = process.env['STRESS'] ? 3 : 1;

let hostedModeServer: ChildProcessWithoutNullStreams;
let browser: puppeteer.Browser;
let frontendUrl: string;

interface DevToolsTarget {
  url: string;
  id: string;
}

function handleHostedModeError(error: Error) {
  throw new Error(`Hosted mode server: ${error}`);
}

const envChromeBinary = process.env['CHROME_BIN'];

async function loadTargetPageAndDevToolsFrontend() {
  const launchArgs = [`--remote-debugging-port=${envPort}`];
  const opts: puppeteer.LaunchOptions = {
    headless,
    executablePath: envChromeBinary,
    defaultViewport: null,
    dumpio: !headless,
    slowMo: envSlowMo,
  };

  // Toggle either viewport or window size depending on headless vs not.
  if (headless) {
    opts.defaultViewport = {width, height};
  } else {
    launchArgs.push(`--window-size=${width},${height}`);
  }

  opts.args = launchArgs;

  browser = await puppeteer.launch(opts);
  // Load the target page.
  const srcPage = await browser.newPage();
  await srcPage.goto(EMPTY_PAGE);

  // Now get the DevTools listings.
  const devtools = await browser.newPage();
  await devtools.goto(`http://localhost:${envPort}/json`);

  // Find the appropriate item to inspect the target page.
  const listing = await devtools.$('pre');
  const json = await devtools.evaluate(listing => listing.textContent, listing);
  const targets: DevToolsTarget[] = JSON.parse(json);
  const target = targets.find(target => target.url === EMPTY_PAGE);
  if (!target) {
    throw new Error(`Unable to find target page: ${EMPTY_PAGE}`);
  }

  const {id} = target;
  await devtools.close();

  // Connect to the DevTools frontend.
  const frontend = await browser.newPage();
  frontendUrl = `http://localhost:8090/front_end/devtools_app.html?ws=localhost:${envPort}/devtools/page/${id}`;
  await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});

  frontend.on('error', error => {
    throw new Error(`Error in Frontend: ${error}`);
  });

  frontend.on('pageerror', error => {
    throw new Error(`Page error in Frontend: ${error}`);
  });

  setBrowserAndPages({target: srcPage, frontend, browser});
}

export async function resetPages() {
  const {target, frontend} = getBrowserAndPages();
  // Reload the target page.
  await target.goto(EMPTY_PAGE, {waitUntil: ['domcontentloaded']});

  // Clear any local storage settings.
  await frontend.evaluate(() => localStorage.clear());

  await reloadDevTools();
}

export async function reloadDevTools(
    options: {selectedPanel?: {name: string, selector?: string}, canDock?: boolean} = {}) {
  const {frontend} = getBrowserAndPages();

  // For the unspecified case wait for loading, then wait for the elements panel.
  const {selectedPanel = DEFAULT_TAB, canDock = false} = options;

  if (selectedPanel.name !== DEFAULT_TAB.name) {
    await frontend.evaluate(name => {
      // @ts-ignore
      globalThis.localStorage.setItem('panel-selectedTab', `"${name}"`);
    }, selectedPanel.name);
  }

  // Reload the DevTools frontend and await the elements panel.
  await frontend.goto(EMPTY_PAGE, {waitUntil: ['domcontentloaded']});
  // omit "can_dock=" when it's false because appending "can_dock=false"
  // will make getElementPosition in shared helpers unhappy
  const url = canDock ? `${frontendUrl}&can_dock=true` : frontendUrl;
  await frontend.goto(url, {waitUntil: ['domcontentloaded']});

  if (selectedPanel.selector) {
    await frontend.waitForSelector(selectedPanel.selector);
  }

  // Under stress conditions throttle the CPU down.
  if (envThrottleRate !== 1) {
    console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);

    const client = await frontend.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {rate: envThrottleRate});
  }
}

export async function globalSetup() {
  console.log('Spawning hosted mode server');

  hostedModeServer = spawn(execPath, [HOSTED_MODE_SERVER_PATH], {cwd});
  hostedModeServer.on('error', handleHostedModeError);
  hostedModeServer.stderr.on('data', handleHostedModeError);

  await loadTargetPageAndDevToolsFrontend();
}

export async function globalTeardown() {
  console.log('Stopping hosted mode server');
  hostedModeServer.kill();

  await browser.close();
}
