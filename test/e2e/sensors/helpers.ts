// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle} from 'puppeteer-core';

import type {DevToolsPage} from '../shared/DevToolsPage.js';

export async function setCustomOrientation(devtoolsPage: DevToolsPage): Promise<void> {
  const dropDown = await devtoolsPage.waitFor('.orientation-fields select');
  await (await dropDown.toElement('select')).select('custom');
  // The inputs exist before the orientation override is enabled. Wait until the view has updated.
  await devtoolsPage.waitFor('.device-orientation-override-section:not([disabled])');
}

export async function getInputFieldValue(field: ElementHandle<Element>): Promise<string> {
  return await field.evaluate(input => (input as HTMLInputElement).value);
}

export async function getOrientationInputs(devtoolsPage: DevToolsPage):
    Promise<Array<ElementHandle<HTMLInputElement>>> {
  return await devtoolsPage.waitForMany('.orientation-axis-input-container input', 3);
}

export async function getOrientationValues(devtoolsPage: DevToolsPage): Promise<number[]> {
  return await Promise.all(
      (await getOrientationInputs(devtoolsPage)).map(i => i.evaluate(input => parseInt(input.value, 10))));
}
