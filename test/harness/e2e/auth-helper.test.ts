// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {TestConfig} from '../../conductor/test_config.js';
import {chromeLogin, getOtaPassword, typeTextIn} from '../../e2e/shared/auth-helper.js';
import {DEFAULT_BROWSER_SETTINGS, Launcher} from '../../e2e/shared/browser-helper.js';

describe('Auth Helper', () => {
  const otaIt = TestConfig.otaUsername ? it : it.skip;
  otaIt('can successfully fetch an OTA password from stubby', () => {
    const email = TestConfig.otaUsername as string;
    const password = getOtaPassword(email);
    assert.isString(password, 'OTA Password should be a valid string');
    assert.isAbove(password.length, 0, 'OTA Password should not be empty');
  });

  it('throws an error if stubby fails to get OTA password', () => {
    try {
      getOtaPassword('invalid_fake_user_test_1234567890@invalid.com');
      assert.fail('Expected getOtaPassword to throw an error');
    } catch (err: unknown) {
      assert.instanceOf(err, Error);
      assert.include((err as Error).message, 'stubby call blade:identity');
    }
  });

  it('focuses and types text in typeTextIn', async () => {
    const rawBrowser = await Launcher.launchChrome(DEFAULT_BROWSER_SETTINGS, 0);

    try {
      const page = await rawBrowser.newPage();
      await page.setContent('<input id="my_input" type="text" />');

      await typeTextIn(page, '#my_input', 'hello_world');

      const value = await page.evaluate(() => {
        return (document.getElementById('my_input') as HTMLInputElement).value;
      });
      assert.strictEqual(value, 'hello_world');
    } finally {
      await rawBrowser.close();
    }
  });

  it('bypasses password filling if automatically redirected to myaccount.google.com', async () => {
    const calls: string[] = [];
    const mockPage = {
      url: () => 'https://myaccount.google.com/foo',
      evaluate: async () => {},
      waitForNavigation: async () => {},
      bringToFront: async () => {},
      evaluateOnNewDocument: async () => {},
      removeScriptToEvaluateOnNewDocument: async () => {},
      locator: () => ({}),
    } as unknown as puppeteer.Page;

    mockPage.goto = async url => {
      calls.push(`goTo:${url}`);
      return null;
    };

    await chromeLogin(mockPage, 'test_user@invalid.com');
    assert.lengthOf(calls, 1);
    assert.strictEqual(calls[0], 'goTo:https://accounts.google.com');
  });
});
