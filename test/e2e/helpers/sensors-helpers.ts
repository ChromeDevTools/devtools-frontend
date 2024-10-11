// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle} from 'puppeteer-core';

import {selectOption, waitFor, waitForMany} from '../../shared/helper.js';

export async function setCustomOrientation() {
  const dropDown = await waitFor('.orientation-fields select');
  void selectOption(await dropDown.toElement('select'), 'custom');
}

export async function getInputFieldValue(field: ElementHandle<Element>): Promise<string> {
  return field.evaluate(input => (input as HTMLInputElement).value);
}

export async function getOrientationInputs() {
  return waitForMany('.orientation-axis-input-container input', 3);
}

export async function getOrientationValues() {
  return Promise.all(
      (await getOrientationInputs()).map(i => i.evaluate(i => parseInt((i as HTMLInputElement).value, 10))));
}
