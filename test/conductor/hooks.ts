// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

import * as puppeteer from 'puppeteer';

import {clearPuppeteerState, getBrowserAndPages, registerHandlers, setBrowserAndPages, setHostedModeServerPort} from './puppeteer-state.js';

// Workaround for mismatching versions of puppeteer types and puppeteer library.
declare module 'puppeteer' {
  interface ConsoleMessage {
    stackTrace(): ConsoleMessageLocation[];
  }
}

const EMPTY_PAGE = 'data:text/html,';
const DEFAULT_TAB = {
  name: 'elements',
  selector: '.elements',
};

const width = 1280;
const height = 720;
let unhandledRejectionSet = false;

const headless = !process.env['DEBUG'];
const envSlowMo = process.env['STRESS'] ? 50 : undefined;
const envThrottleRate = process.env['STRESS'] ? 3 : 1;

// TODO: move this into a file
const ALLOWED_ASSERTION_FAILURES = [
  // Failure during shutdown. crbug.com/1145969
  'Session is unregistering, can\'t dispatch pending call to Debugger.setBlackboxPatterns',
  // Expected failures in assertion_test.ts
  'expected failure 1',
  'expected failure 2',
];

const logLevels = {
  log: 'I',
  info: 'I',
  warning: 'I',
  error: 'E',
  exception: 'E',
  assert: 'E',
};

let browser: puppeteer.Browser;
let frontendUrl: string;

interface DevToolsTarget {
  url: string;
  id: string;
}

const envChromeBinary = process.env['CHROME_BIN'];

function launchChrome() {
  // Use port 0 to request any free port.
  const launchArgs = [
    '--remote-debugging-port=0',
    '--enable-experimental-web-platform-features',
    '--ignore-certificate-errors',
  ];
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

  let stdout = '', stderr = '';

  const process = browser.process();
  if (process) {
    if (process.stderr) {
      process.stderr.setEncoding('utf8');
      process.stderr.on('data', data => {
        stderr += data;
      });
    }

    if (process.stdout) {
      process.stdout.setEncoding('utf8');
      process.stdout.on('data', data => {
        stdout += data;
      });
    }
  }

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
  frontendUrl = `https://localhost:${hostedModeServerPort}/front_end/devtools_app.html?ws=localhost:${
      chromeDebugPort}/devtools/page/${id}`;
  await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});

  frontend.on('error', error => {
    console.log('STDOUT:');
    console.log(stdout);
    console.log();
    console.log('STDERR:');
    console.log(stderr);
    console.log();
    throw new Error(`Error in Frontend: ${error}`);
  });

  frontend.on('pageerror', error => {
    throw new Error(`Page error in Frontend: ${error}`);
  });

  if (!unhandledRejectionSet) {
    process.on('unhandledRejection', error => {
      throw new Error(`Unhandled rejection in Frontend: ${error}`);
    });
    unhandledRejectionSet = true;
  }

  frontend.on('console', msg => {
    const logLevel = logLevels[msg.type() as keyof typeof logLevels] as string;
    if (logLevel) {
      if (logLevel === 'E') {
        let message = `${logLevel}> ${msg.text()}`;
        for (const frame of msg.stackTrace()) {
          message += '\n' + formatStackFrame(frame);
        }
        if (ALLOWED_ASSERTION_FAILURES.includes(msg.text())) {
          expectedErrors.push(message);
          console.log('(expected) ' + message);
        } else {
          fatalErrors.push(message);
          console.error(message);
        }
      } else {
        console.log(`${logLevel}> ${formatStackFrame(msg.location())}: ${msg.text()}`);
      }
    }
  });

  setBrowserAndPages({target: srcPage, frontend, browser});
}

function formatStackFrame(stackFrame: puppeteer.ConsoleMessageLocation): string {
  if (!stackFrame) {
    return '<unknown>';
  }
  const filename = stackFrame!.url!.replace(/^.*\//, '');
  return `${filename}:${stackFrame.lineNumber}:${stackFrame.columnNumber}`;
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

// Can be run multiple times in the same process.
export async function preFileSetup(hostedModeServerPort: number) {
  setHostedModeServerPort(hostedModeServerPort);
  registerHandlers();
  await loadTargetPageAndDevToolsFrontend(hostedModeServerPort);
}

// Can be run multiple times in the same process.
export async function postFileTeardown() {
  // We need to kill the browser before we stop the hosted mode server.
  // That's because the browser could continue to make network requests,
  // even after we would have closed the server. If we did so, the requests
  // would fail and the test would crash on closedown. This only happens
  // for the very last test that runs.
  await browser.close();

  clearPuppeteerState();

  console.log('Expected errors: ' + expectedErrors.length);
  console.log('   Fatal errors: ' + fatalErrors.length);
  if (fatalErrors.length) {
    throw new Error('Fatal errors logged:\n' + fatalErrors.join('\n'));
  }
}

export const fatalErrors: string[] = [];
export const expectedErrors: string[] = [];
