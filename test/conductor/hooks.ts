// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

import {ChildProcess, spawn} from 'child_process';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

import {getBrowserAndPages, registerHandlers, setBrowserAndPages, setHostedModeServerPort} from './puppeteer-state.js';

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

const headless = !process.env['DEBUG'];
const envSlowMo = process.env['STRESS'] ? 50 : undefined;
const envThrottleRate = process.env['STRESS'] ? 3 : 1;

const logLevels = {
  log: 'I',
  info: 'I',
  warning: 'I',
  error: 'E',
  exception: 'E',
  assert: 'E',
};

let hostedModeServer: ChildProcess;
let browser: puppeteer.Browser;
let frontendUrl: string;

interface DevToolsTarget {
  url: string;
  id: string;
}

const envChromeBinary = process.env['CHROME_BIN'];

function launchChrome() {
  // Use port 0 to request any free port.
  const launchArgs = ['--remote-debugging-port=0', '--enable-experimental-web-platform-features'];
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
  return puppeteer.launch(opts);
}

function getDebugPort(browser: puppeteer.Browser) {
  const websocketUrl = browser.wsEndpoint();
  const url = new URL(websocketUrl);
  if (url.port) {
    return url.port;
  }
  throw new Error(`Unable to find debug port: ${websocketUrl}`);
}

async function loadTargetPageAndDevToolsFrontend(hostedModeServerPort: number) {
  browser = await launchChrome();
  const chromeDebugPort = getDebugPort(browser);
  console.log(`Opened chrome with debug port: ${chromeDebugPort}`);

  // Load the target page.
  const srcPage = await browser.newPage();
  await srcPage.goto(EMPTY_PAGE);

  // Now get the DevTools listings.
  const devtools = await browser.newPage();
  await devtools.goto(`http://localhost:${chromeDebugPort}/json`);

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
  frontendUrl = `http://localhost:${hostedModeServerPort}/front_end/devtools_app.html?ws=localhost:${
      chromeDebugPort}/devtools/page/${id}`;
  await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});

  frontend.on('error', error => {
    throw new Error(`Error in Frontend: ${error}`);
  });

  frontend.on('pageerror', error => {
    throw new Error(`Page error in Frontend: ${error}`);
  });

  process.on('unhandledRejection', error => {
    throw new Error(`Unhandled rejection in Frontend: ${error}`);
  });

  frontend.on('console', msg => {
    const logLevel = logLevels[msg.type() as keyof typeof logLevels] as string;
    if (logLevel) {
      let filename = '<unknown>';
      if (msg.location() && msg.location().url) {
        filename = msg.location()!.url!.replace(/^.*\//, '');
      }
      const message = `${logLevel}> ${filename}:${msg.location().lineNumber}: ${msg.text()}`;
      if (logLevel === 'E') {
        console.error(message);
        fatalErrors.push(message);
      } else {
        console.log(message);
      }
    }
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

type ReloadDevToolsOptions = {
  selectedPanel?: {name: string, selector?: string},
  canDock?: boolean,
  queryParams?: {panel?: string}
};

export async function reloadDevTools(options: ReloadDevToolsOptions = {}) {
  const {frontend} = getBrowserAndPages();

  // For the unspecified case wait for loading, then wait for the elements panel.
  const {selectedPanel = DEFAULT_TAB, canDock = false, queryParams = {}} = options;

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
  let url = canDock ? `${frontendUrl}&can_dock=true` : frontendUrl;

  if (queryParams.panel) {
    url += `&panel=${queryParams.panel}`;
  }

  await frontend.goto(url, {waitUntil: ['domcontentloaded']});

  if (!queryParams.panel && selectedPanel.selector) {
    await frontend.waitForSelector(selectedPanel.selector);
  }

  // Under stress conditions throttle the CPU down.
  if (envThrottleRate !== 1) {
    console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);

    const client = await frontend.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {rate: envThrottleRate});
  }
}

function startHostedModeServer(): Promise<number> {
  console.log('Spawning hosted mode server');

  function handleHostedModeError(error: Error) {
    throw new Error(`Hosted mode server: ${error}`);
  }

  // Copy the current env and append the port.
  const env = Object.create(process.env);
  env.PORT = 0;  // 0 means request a free port from the OS.
  return new Promise((resolve, reject) => {
    // We open the server with an IPC channel so that it can report the port it
    // used back to us. For parallel test mode, we need to avoid specifying a
    // port directly and instead request any free port, which is what port 0
    // signifies to the OS.
    hostedModeServer = spawn(execPath, [HOSTED_MODE_SERVER_PATH], {cwd, env, stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
    hostedModeServer.on('message', message => {
      if (message === 'ERROR') {
        reject('Could not start hosted mode server');
      } else {
        resolve(parseInt(message, 10));
      }
    });
    hostedModeServer.on('error', handleHostedModeError);
    if (hostedModeServer.stderr) {
      hostedModeServer.stderr.on('data', handleHostedModeError);
    }
  });
}

export async function globalSetup() {
  try {
    const port = await startHostedModeServer();
    console.log(`Started hosted mode server on port ${port}`);
    registerHandlers();
    setHostedModeServerPort(port);
    await loadTargetPageAndDevToolsFrontend(port);
  } catch (message) {
    throw new Error(message);
  }
}

export async function globalTeardown() {
  // We need to kill the browser before we stop the hosted mode server.
  // That's because the browser could continue to make network requests,
  // even after we would have closed the server. If we did so, the requests
  // would fail and the test would crash on closedown. This only happens
  // for the very last test that runs.
  await browser.close();

  console.log('Stopping hosted mode server');
  hostedModeServer.kill();

  if (fatalErrors.length) {
    throw new Error('Fatal errors logged:\n' + fatalErrors.join('\n'));
  }
}

export const fatalErrors: string[] = [];
