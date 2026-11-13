// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { once } from 'node:events';
import puppeteer from 'puppeteer-core';

import { chromeLogin } from '../test/e2e/shared/auth-helper.ts';

/**
 * Splits positional rest arguments into extra Chrome flags (`--foo`) and target URLs.
 *
 * @param {Array<string|number>} restArgs
 */
export function splitRestArgs(restArgs) {
  /** @type {string[]} */
  const extraChromeFlags = [];
  /** @type {string[]} */
  const targetUrls = [];
  for (const arg of restArgs) {
    if (typeof arg !== 'string' || arg.length === 0) {
      continue;
    }
    if (arg.startsWith('-')) {
      extraChromeFlags.push(arg);
    } else {
      targetUrls.push(arg);
    }
  }
  return { extraChromeFlags, targetUrls };
}

/**
 * Launches Chrome via Puppeteer, signs into the requested OTA Google account,
 * opens requested target URLs (or a fresh New Tab page), disconnects CDP, and
 * keeps the session alive until Chrome exits.
 *
 * @param {{
 *   binary: string,
 *   baseArgs: string[],
 *   env?: NodeJS.ProcessEnv,
 *   extraChromeFlags?: string[],
 *   loginFn?: typeof chromeLogin,
 *   onSignedIn?: (context: {browserProcess: import('node:child_process').ChildProcess|null, profileDir: string}) => Promise<void>|void,
 *   otaPassword?: string,
 *   otaUsername: string,
 *   remoteDebuggingPort?: number,
 *   targetUrls?: string[],
 *   userDataDir: string,
 *   verbose?: boolean,
 * }} options
 */
export async function launchWithOtaSignIn(options) {
  const {
    binary,
    baseArgs,
    env = process.env,
    extraChromeFlags = [],
    loginFn = chromeLogin,
    onSignedIn,
    otaPassword = '',
    otaUsername,
    remoteDebuggingPort,
    targetUrls = [],
    userDataDir,
    verbose = false,
  } = options;

  if (!userDataDir) {
    throw new Error(
      'The `--ota-username` command line switch must be accompanied by the `--user-data-dir` switch.',
    );
  }

  const launchArgs = [
    ...baseArgs,
    `--user-data-dir=${userDataDir}`,
    '--auto-accept-browser-signin-for-tests',
    '--allow-browser-signin=true',
    ...extraChromeFlags,
    'about:blank',
  ];

  if (verbose) {
    console.debug(
      'Launch Chrome with OTA sign-in: %s %s',
      binary,
      launchArgs.join(' '),
    );
  }

  const browser = await puppeteer.launch({
    executablePath: binary,
    ignoreDefaultArgs: true,
    pipe: remoteDebuggingPort === undefined,
    defaultViewport: null,
    dumpio: verbose,
    env,
    args: launchArgs,
  });

  try {
    const pages = await browser.pages();
    const loginPage = pages[0] ?? (await browser.newPage());
    console.log(`Signing in to Chrome as ${otaUsername}...`);
    await loginFn(loginPage, otaUsername, otaPassword || undefined);

    // Open target tabs before closing `loginPage` so Chrome never observes
    // zero open tabs and exits prematurely.
    const urlsToOpen =
      targetUrls.length > 0 ? targetUrls : ['chrome://newtab/'];
    const cdp = await browser.target().createCDPSession();
    try {
      for (const targetUrl of urlsToOpen) {
        await cdp.send('Target.createTarget', { url: targetUrl });
      }
    } finally {
      await cdp.detach().catch(() => {});
    }

    await loginPage.close().catch(() => {});
    console.log(`Signed in to Chrome as ${otaUsername}.`);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }

  // Puppeteer is only needed for the initial few seconds to run `chromeLogin()`
  // and open the initial tab(s). After sign-in completes, the developer uses
  // Chrome interactively to test DevTools. Leaving Puppeteer connected for the
  // whole session keeps `TargetManager`'s `Target.setAutoAttach`
  // (`waitForDebuggerOnStart: true`) and `Target.setDiscoverTargets` active
  // across every tab/worker/DevTools target the user opens, which can
  // interfere with DevTools' own CDP sessions and accumulate state in Node.
  //
  // Disarm TargetManager's auto-attach and target discovery on the root
  // connection before disconnecting so pipe-mode sessions (whose fds remain
  // open while Chrome runs) do not pause newly created non-page targets.
  const rootConnection =
    /** @type {{send?: (method: string, params?: object) => Promise<unknown>}} */ (
      /** @type {unknown} */ (browser)
    )._connection;
  if (rootConnection && typeof rootConnection.send === 'function') {
    await rootConnection
      .send('Target.setAutoAttach', {
        autoAttach: false,
        waitForDebuggerOnStart: false,
        flatten: true,
      })
      .catch(() => {});
    await rootConnection
      .send('Target.setDiscoverTargets', {
        discover: false,
      })
      .catch(() => {});
  }

  const browserProcess = browser.process();
  await browser.disconnect();

  if (onSignedIn) {
    await onSignedIn({
      browserProcess,
      profileDir: userDataDir,
    });
  }

  if (
    browserProcess &&
    browserProcess.exitCode === null &&
    browserProcess.signalCode === null
  ) {
    await once(browserProcess, 'exit');
  }
}
