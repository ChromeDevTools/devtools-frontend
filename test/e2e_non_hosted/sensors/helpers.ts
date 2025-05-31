// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle} from 'puppeteer-core';

import {
  selectOption,
} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

export async function setCustomOrientation(devtoolsPage: DevToolsPage) {
  const dropDown = await devtoolsPage.waitFor('.orientation-fields select');
  void selectOption(await dropDown.toElement('select'), 'custom');
}

export async function getInputFieldValue(field: ElementHandle<Element>): Promise<string> {
  return await field.evaluate(input => (input as HTMLInputElement).value);
}

export async function getOrientationInputs(devtoolsPage: DevToolsPage) {
  return await devtoolsPage.waitForMany('.orientation-axis-input-container input', 3);
}

export async function getOrientationValues(devtoolsPage: DevToolsPage) {
  return await Promise.all((await getOrientationInputs(devtoolsPage))
                               .map(i => i.evaluate(i => parseInt((i as HTMLInputElement).value, 10))));
}
