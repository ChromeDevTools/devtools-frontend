// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {assertElementScreenshotUnchanged} from '../../shared/screenshots.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

export async function assertScreenshot(
    page: DevToolsPage,
    elementOrSelector: puppeteer.ElementHandle|string,
    filename: string,
    options?: Partial<puppeteer.ScreenshotOptions>,
) {
  if (!page.screenshotAssertionsEnabled) {
    throw new Error(
        'Screenshot assertions are not enabled for this test. Please add `enableScreenshotAssertion: true` to the `setup()` call.');
  }

  let element: puppeteer.ElementHandle|null = null;
  if (typeof elementOrSelector === 'string') {
    element = await page.page.$(elementOrSelector);
  } else {
    element = elementOrSelector;
  }
  if (element) {
    await assertElementScreenshotUnchanged(element, filename, options);
  } else {
    throw new Error(`Could not find element for screenshot: ${filename}`);
  }
}
