// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';
import * as puppeteer from 'puppeteer-core';
import {dumpCollectedErrors} from 'test/conductor/events.js';
import * as MochaHooks from 'test/conductor/mocha_hooks.js';
import {
  clearPuppeteerState,
  getBrowserAndPages,
  registerHandlers,
  setBrowserAndPages,
  setTestServerPort,
} from 'test/conductor/puppeteer-state.js';
import {TestConfig} from 'test/conductor/test_config.js';
import {click} from 'test/shared/helper.js';

const EXTENSION_DIR = path.join(__dirname, '..', '..', '..', 'DevTools_CXX_Debugging.stage2', 'gen');
const DEVTOOLS_DIR = path.join(__dirname, '..', '..', '..', 'devtools-frontend', 'gen');

async function beforeAll() {
  setTestServerPort(Number(process.env.testServerPort));
  registerHandlers();

  const executablePath = TestConfig.chromeBinary;

  const defaultViewport = {
    width: 1280,
    height: 760,
  };

  const browser = await puppeteer.launch({
    headless: !TestConfig.debug,
    devtools: true,
    dumpio: !TestConfig.debug,
    executablePath,
    defaultViewport,
    args: [
      // The fingerprint should match devtools-frontend's
      '--ignore-certificate-errors-spki-list=KLy6vv6synForXwI6lDIl+D3ZrMV6Y1EMTY6YpOcAos=',
      `--load-extension=${EXTENSION_DIR}`,
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--window-size=${defaultViewport.width + 20, defaultViewport.height + 100}`,
      `--custom-devtools-frontend=${new URL(`${DEVTOOLS_DIR}/front_end`, 'file://').href}`,
      '--enable-features=DevToolsVeLogging:testing/true',
    ],
  });

  const connectOptions = {browserWSEndpoint: browser.wsEndpoint()};
  const conn = await puppeteer.connect(connectOptions);

  const newTabTarget =
      await conn.waitForTarget(target => target.url() === 'chrome://newtab/' || target.url() === 'about:blank');
  const target = await newTabTarget?.page();
  if (!target) {
    throw new Error('Could not find target page');
  }
  const devtoolsTarget = await conn.waitForTarget(target => target.url().startsWith('devtools://'));
  const frontend = await devtoolsTarget?.page();
  if (!frontend) {
    throw new Error('Could not find frontend page');
  }
  await frontend.setViewport(defaultViewport);

  setBrowserAndPages({frontend, target, browser: conn});
}

async function afterAll() {
  const {browser} = getBrowserAndPages();
  await browser.close();

  clearPuppeteerState();
  dumpCollectedErrors();
}

async function beforeEach() {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(() => {
    localStorage.clear();
    const experiments = JSON.parse(localStorage.getItem('experiments') ?? '{}');
    experiments['instrumentationBreakpoints'] = true;
    localStorage.setItem('experiments', JSON.stringify(experiments));
  });
  await frontend.reload();
  await click('[aria-label="Customize and control DevTools"]');
  await click('[aria-label="Undock into separate window"]');
}

async function afterEach() {
  const {frontend, target} = getBrowserAndPages();
  await frontend.reload();
  await target.goto('about:blank');
}

export function mochaGlobalTeardown() {
  return MochaHooks.mochaGlobalTeardown();
}
export function mochaGlobalSetup(this: Mocha.Suite) {
  return MochaHooks.mochaGlobalSetup.call(this);
}
export const mochaHooks = {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
};
