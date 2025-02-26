// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

import * as puppeteer from 'puppeteer-core';

import {
  dumpCollectedErrors,
  installPageErrorHandlers,
  setupBrowserProcessIO,
} from './events.js';
import {
  type DevToolsFrontendReloadOptions,
  DevToolsFrontendTab,
  loadEmptyPageAndWaitForContent,
} from './frontend_tab.js';
import {
  clearPuppeteerState,
  getBrowserAndPages,
  registerHandlers,
  setBrowserAndPages,
  setTestServerPort,
} from './puppeteer-state.js';
import {TargetTab} from './target_tab.js';
import {TestConfig} from './test_config.js';

const viewportWidth = 1280;
const viewportHeight = 720;
// Adding some offset to the window size used in the headful mode
// so to account for the size of the browser UI.
// Values are chosen by trial and error to make sure that the window
// size is not much bigger than the viewport but so that the entire
// viewport is visible.
const windowWidth = viewportWidth + 50;
const windowHeight = viewportHeight + 200;

const headless = !TestConfig.debug || TestConfig.headless;
// CDP commands in e2e and interaction should not generally take
// more than 20 seconds.
const protocolTimeout = TestConfig.debug ? 0 : 20_000;

const envSlowMo = process.env['STRESS'] ? 50 : undefined;
const envThrottleRate = process.env['STRESS'] ? 3 : 1;
const envLatePromises = process.env['LATE_PROMISES'] !== undefined ?
    ['true', ''].includes(process.env['LATE_PROMISES'].toLowerCase()) ? 10 : Number(process.env['LATE_PROMISES']) :
    0;

let browser: puppeteer.Browser;
let frontendTab: DevToolsFrontendTab;
let targetTab: TargetTab;

const envChromeFeatures = process.env['CHROME_FEATURES'];

function launchChrome() {
  // Use port 0 to request any free port.
  const enabledFeatures = [
    'Portals',
    'PortalsCrossOrigin',
    'PartitionedCookies',
    'SharedStorageAPI',
    'FencedFrames',
    'PrivacySandboxAdsAPIsOverride',
    'AutofillEnableDevtoolsIssues',
  ];

  const disabledFeatures = [
    'PMProcessPriorityPolicy',                     // crbug.com/361252079
    'MojoChannelAssociatedSendUsesRunOrPostTask',  // crbug.com/376228320
    'RasterInducingScroll',                        // crbug.com/381055647
    'CompositeBackgroundColorAnimation',           // crbug.com/381055647
  ];
  const launchArgs = [
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    '--enable-experimental-web-platform-features',
    // This fingerprint may be generated from the certificate using
    // openssl x509 -noout -pubkey -in scripts/hosted_mode/cert.pem | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
    '--ignore-certificate-errors-spki-list=KLy6vv6synForXwI6lDIl+D3ZrMV6Y1EMTY6YpOcAos=',
    '--site-per-process',  // Default on Desktop anyway, but ensure that we always use out-of-process frames when we intend to.
    '--host-resolver-rules=MAP *.test 127.0.0.1',
    '--disable-gpu',
    '--enable-blink-features=CSSContainerQueries,HighlightInheritance',  // TODO(crbug.com/1218390) Remove globally enabled flags and conditionally enable them
    '--disable-blink-features=WebAssemblyJSPromiseIntegration',  // TODO(crbug.com/325123665) Remove once heap snapshots work again with JSPI
    `--disable-features=${disabledFeatures.join(',')}`,
  ];
  const executablePath = TestConfig.chromeBinary;
  const opts: puppeteer.LaunchOptions = {
    headless,
    executablePath,
    dumpio: !headless || Boolean(process.env['LUCI_CONTEXT']),
    slowMo: envSlowMo,
    protocolTimeout,
  };

  TestConfig.configureChrome(executablePath);

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

async function loadTargetPageAndFrontend(testServerPort: number) {
  browser = await launchChrome();
  setupBrowserProcessIO(browser);

  // Load the target page.
  targetTab = await TargetTab.create(browser);

  // Create the frontend - the page that will be under test. This will be either
  // DevTools Frontend in hosted mode, or the component docs in docs test mode.
  let frontend: puppeteer.Page;

  if (TestConfig.serverType === 'hosted-mode') {
    /**
     * In hosted mode we run the DevTools and test against it.
     */
    frontendTab = await DevToolsFrontendTab.create({
      browser,
      testServerPort,
      targetId: targetTab.targetId(),
    });
    frontend = frontendTab.page;
  } else if (TestConfig.serverType === 'component-docs') {
    /**
     * In the component docs mode it points to the page where we load component
     * doc examples, so let's just set it to an empty page for now.
     */
    frontend = await browser.newPage();
    installPageErrorHandlers(frontend);
    await loadEmptyPageAndWaitForContent(frontend);
  } else {
    throw new Error(`Unknown TEST_SERVER_TYPE "${TestConfig.serverType}"`);
  }

  setBrowserAndPages({target: targetTab.page, frontend, browser});
}

export async function unregisterAllServiceWorkers() {
  const {target} = getBrowserAndPages();
  await target.evaluate(async () => {
    if (!navigator.serviceWorker) {
      return;
    }
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  });
}

export async function setupPages() {
  const {frontend} = getBrowserAndPages();
  await throttleCPUIfRequired(frontend);
  await delayPromisesIfRequired(frontend);
}

export async function resetPages() {
  const {frontend, target} = getBrowserAndPages();

  await target.bringToFront();
  await targetTab.reset();
  await frontend.bringToFront();

  if (TestConfig.serverType === 'hosted-mode') {
    await frontendTab.reset();
  } else if (TestConfig.serverType === 'component-docs') {
    // Reset the frontend back to an empty page for the component docs server.
    await loadEmptyPageAndWaitForContent(frontend);
  }
}

async function delayPromisesIfRequired(page: puppeteer.Page): Promise<void> {
  if (envLatePromises === 0) {
    return;
  }
  console.log(`Delaying promises by ${envLatePromises}ms`);
  await page.evaluate(delay => {
    globalThis.Promise = class<T> extends Promise<T>{
      constructor(executor: (resolve: (value: T|PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
        super((resolve, reject) => {
          executor(value => setTimeout(() => resolve(value), delay), reason => setTimeout(() => reject(reason), delay));
        });
      }
    };
  }, envLatePromises);
}

async function throttleCPUIfRequired(page: puppeteer.Page): Promise<void> {
  if (envThrottleRate === 1) {
    return;
  }
  console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);
  const client = await page.createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: envThrottleRate,
  });
  await client.detach();
}

export async function reloadDevTools(options?: DevToolsFrontendReloadOptions) {
  await frontendTab.reload(options);
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
  dumpCollectedErrors();
}

export function getDevToolsFrontendHostname(): string {
  return frontendTab.hostname();
}
