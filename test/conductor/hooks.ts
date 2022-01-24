// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer');

import type {CoverageMapData} from 'istanbul-lib-coverage';

import {clearPuppeteerState, getBrowserAndPages, registerHandlers, setBrowserAndPages, setTestServerPort} from './puppeteer-state.js';
import {getTestRunnerConfigSetting} from './test_runner_config.js';

// Workaround for mismatching versions of puppeteer types and puppeteer library.
declare module 'puppeteer' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ConsoleMessage {
    stackTrace(): ConsoleMessageLocation[];
  }
}

const EMPTY_PAGE = 'data:text/html,<!DOCTYPE html>';
const DEFAULT_TAB = {
  name: 'elements',
  selector: '.elements',
};

const viewportWidth = 1280;
const viewportHeight = 720;
// Adding some offset to the window size used in the headful mode
// so to account for the size of the browser UI.
// Values are choosen by trial and error to make sure that the window
// size is not much bigger than the viewport but so that the entire
// viewport is visible.
const windowWidth = viewportWidth + 50;
const windowHeight = viewportHeight + 200;
let unhandledRejectionSet = false;

const headless = !process.env['DEBUG_TEST'];
const envSlowMo = process.env['STRESS'] ? 50 : undefined;
const envThrottleRate = process.env['STRESS'] ? 3 : 1;

// When loading DevTools with target.goto, we wait for it to be fully loaded using these events.
const DEVTOOLS_WAITUNTIL_EVENTS: puppeteer.PuppeteerLifeCycleEvent[] = ['networkidle2', 'domcontentloaded'];
// When loading an empty page (including within the devtools window), we wait for it to be loaded using these events.
const EMPTY_PAGE_WAITUNTIL_EVENTS: puppeteer.PuppeteerLifeCycleEvent[] = ['domcontentloaded'];

const TEST_SERVER_TYPE = getTestRunnerConfigSetting<string>('test-server-type', 'hosted-mode');

// TODO: move this into a file
const ALLOWED_ASSERTION_FAILURES = [
  // Failure during shutdown. crbug.com/1145969
  'Session is unregistering, can\'t dispatch pending call to Debugger.setBlackboxPatterns',
  // Failure during shutdown. crbug.com/1199322
  'Session is unregistering, can\'t dispatch pending call to DOM.getDocument',
  // Expected failures in assertion_test.ts
  'expected failure 1',
  'expected failure 2',
  // A failing fetch isn't itself a real error.
  // TODO(https://crbug.com/124534) Remove once those messages are not printed anymore.
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  // Every letter "typed" into the console can trigger a preview `Runtime.evaluate` call.
  // There is no way for an e2e test to know whether all of them have resolved or if there are
  // still pending calls. If the test finishes too early, the JS context is destroyed and pending
  // evaluations will fail. We ignore these kinds of errors. Tests have to make sure themselves
  // that all assertions and success criteria are met (e.g. autocompletions etc).
  // See: https://crbug.com/1192052
  'Request Runtime.evaluate failed. {"code":-32602,"message":"uniqueContextId not found"}',
  'uniqueContextId not found',
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

const envChromeBinary = getTestRunnerConfigSetting<string>('chrome-binary-path', process.env['CHROME_BIN'] || '');
const envChromeFeatures = getTestRunnerConfigSetting<string>('chrome-features', process.env['CHROME_FEATURES'] || '');

function launchChrome() {
  // Use port 0 to request any free port.
  const enabledFeatures = ['Portals', 'PortalsCrossOrigin', 'PartitionedCookies'];
  const launchArgs = [
    '--remote-debugging-port=0', '--enable-experimental-web-platform-features',
    // This fingerprint may be generated from the certificate using
    // openssl x509 -noout -pubkey -in scripts/hosted_mode/cert.pem | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
    '--ignore-certificate-errors-spki-list=KLy6vv6synForXwI6lDIl+D3ZrMV6Y1EMTY6YpOcAos=',
    '--site-per-process',  // Default on Desktop anyway, but ensure that we always use out-of-process frames when we intend to.
    '--host-resolver-rules=MAP *.test 127.0.0.1', '--disable-gpu',
    '--enable-blink-features=CSSContainerQueries',  // TODO(crbug.com/1218390) Remove globally enabled flag and conditionally enable it
  ];
  const opts: puppeteer.LaunchOptions&puppeteer.BrowserLaunchArgumentOptions&puppeteer.BrowserConnectOptions = {
    headless,
    executablePath: envChromeBinary,
    dumpio: !headless,
    slowMo: envSlowMo,
  };

  // Always set the default viewport because setting only the window size for
  // headful mode would result in much smaller actual viewport.
  opts.defaultViewport = {width: viewportWidth, height: viewportHeight};
  // Toggle either viewport or window size depending on headless vs not.
  if (!headless) {
    launchArgs.push(`--window-size=${windowWidth},${windowHeight}`);
  }

  if (envChromeFeatures) {
    enabledFeatures.push(envChromeFeatures);
  }
  launchArgs.push(`--enable-features=${enabledFeatures.join(',')}`);

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

async function loadTargetPageAndFrontend(testServerPort: number) {
  /**
   * In hosted mode we run the DevTools and test against it.
   */
  const needToLoadDevTools = TEST_SERVER_TYPE === 'hosted-mode';

  browser = await launchChrome();
  let stdout = '', stderr = '';
  const browserProcess = browser.process();
  if (browserProcess) {
    if (browserProcess.stderr) {
      browserProcess.stderr.setEncoding('utf8');
      browserProcess.stderr.on('data', data => {
        stderr += data;
      });
    }

    if (browserProcess.stdout) {
      browserProcess.stdout.setEncoding('utf8');
      browserProcess.stdout.on('data', data => {
        stdout += data;
      });
    }
  }

  // Load the target page.
  const srcPage = await browser.newPage();
  await srcPage.goto(EMPTY_PAGE);

  // Create the frontend - the page that will be under test. This will be either
  // DevTools Frontend in hosted mode, or the component docs in docs test mode.
  const frontend = await browser.newPage();

  if (needToLoadDevTools) {
    const chromeDebugPort = getDebugPort(browser);
    console.log(`Opened chrome with debug port: ${chromeDebugPort}`);
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

    /**
     * In hosted mode the frontend points to DevTools, so let's load it up.
     */

    const devToolsAppURL =
        getTestRunnerConfigSetting<string>('hosted-server-devtools-url', 'front_end/devtools_app.html');
    if (!devToolsAppURL) {
      throw new Error('Could not load DevTools. hosted-server-devtools-url config not found.');
    }
    frontendUrl =
        `https://localhost:${testServerPort}/${devToolsAppURL}?ws=localhost:${chromeDebugPort}/devtools/page/${id}`;
    await frontend.goto(frontendUrl, {waitUntil: DEVTOOLS_WAITUNTIL_EVENTS});
  }

  if (TEST_SERVER_TYPE === 'component-docs') {
    /**
     * In the component docs mode it points to the page where we load component
     * doc examples, so let's just set it to an empty page for now.
     */
    await frontend.goto(EMPTY_PAGE);
  }

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
    if (!browserProcess) {
      throw new Error('browserProcess is unexpectedly not defined.');
    }
    browserProcess.on('unhandledRejection', error => {
      throw new Error(`Unhandled rejection in Frontend: ${error}`);
    });
    unhandledRejectionSet = true;
  }

  frontend.on('console', async msg => {
    const logLevel = logLevels[msg.type() as keyof typeof logLevels] as string;
    if (logLevel) {
      if (logLevel === 'E') {
        let message = `${logLevel}> `;
        if (msg.text() === 'JSHandle@error') {
          const errorHandle: puppeteer.JSHandle<Error> = msg.args()[0];
          message += await errorHandle.evaluate(error => {
            return error.stack;
          });
          await errorHandle.dispose();
        } else {
          message += msg.text();
          for (const frame of msg.stackTrace()) {
            message += '\n' + formatStackFrame(frame);
          }
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
  if (!stackFrame || !stackFrame.url) {
    return '<unknown>';
  }
  const filename = stackFrame.url.replace(/^.*\//, '');
  return `${filename}:${stackFrame.lineNumber}:${stackFrame.columnNumber}`;
}

export async function resetPages() {
  const {target, frontend} = getBrowserAndPages();
  // Reload the target page.
  await loadEmptyPageAndWaitForContent(target);

  // Under stress conditions throttle the CPU down.
  await throttleCPUIfRequired();

  if (TEST_SERVER_TYPE === 'hosted-mode') {
    // Clear any local storage settings.
    await frontend.evaluate(() => localStorage.clear());

    await reloadDevTools();
  } else if (TEST_SERVER_TYPE === 'component-docs') {
    // Reset the frontend back to an empty page for the component docs server.
    await loadEmptyPageAndWaitForContent(frontend);
  }
}

type ReloadDevToolsOptions = {
  selectedPanel?: {name: string, selector?: string},
  canDock?: boolean,
  queryParams?: {panel?: string},
};

async function throttleCPUIfRequired(): Promise<void> {
  const {frontend} = getBrowserAndPages();
  // Under stress conditions throttle the CPU down.
  if (envThrottleRate !== 1) {
    console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);

    const client = await frontend.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {rate: envThrottleRate});
  }
}

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
  await loadEmptyPageAndWaitForContent(frontend);
  // omit "can_dock=" when it's false because appending "can_dock=false"
  // will make getElementPosition in shared helpers unhappy
  let url = canDock ? `${frontendUrl}&can_dock=true` : frontendUrl;

  if (queryParams.panel) {
    url += `&panel=${queryParams.panel}`;
  }

  await frontend.goto(url, {waitUntil: DEVTOOLS_WAITUNTIL_EVENTS});

  if (!queryParams.panel && selectedPanel.selector) {
    await frontend.waitForSelector(selectedPanel.selector);
  }
}

async function loadEmptyPageAndWaitForContent(target: puppeteer.Page) {
  await target.goto(EMPTY_PAGE, {waitUntil: EMPTY_PAGE_WAITUNTIL_EVENTS});
}

// Can be run multiple times in the same process.
export async function preFileSetup(serverPort: number) {
  setTestServerPort(serverPort);
  registerHandlers();
  await loadTargetPageAndFrontend(serverPort);
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

export function collectCoverageFromPage(): Promise<CoverageMapData|undefined> {
  const {frontend} = getBrowserAndPages();

  return frontend.evaluate('window.__coverage__');
}

export const fatalErrors: string[] = [];
export const expectedErrors: string[] = [];
