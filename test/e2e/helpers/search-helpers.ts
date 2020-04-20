// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {platform} from '../../shared/helper.js';

export async function triggerFindDialog(frontend: puppeteer.Page) {
  switch (platform) {
    case 'mac':
      await frontend.keyboard.down('Meta');
      await frontend.keyboard.down('Alt');
      break;

    default:
      await frontend.keyboard.down('Control');
      await frontend.keyboard.down('Shift');
  }

  await frontend.keyboard.press('f');

  switch (platform) {
    case 'mac':
      await frontend.keyboard.up('Meta');
      await frontend.keyboard.up('Alt');
      break;

    default:
      await frontend.keyboard.up('Control');
      await frontend.keyboard.up('Shift');
  }
}
