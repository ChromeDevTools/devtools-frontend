// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {PageWrapper} from './page-wrapper.js';

export class InspectedPage extends PageWrapper {
  // Place to port current "target" page helper functions to.
}

export async function setupInspectedPage(context: puppeteer.BrowserContext) {
  const target = await context.newPage();
  return new InspectedPage(target);
}
