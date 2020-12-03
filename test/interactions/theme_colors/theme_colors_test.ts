// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$$, waitFor} from '../../shared/helper.js';
import {loadComponentDocExample} from '../helpers/shared.js';

async function getListOfColorsFromList(selector: string) {
  await waitFor(`${selector} li`);
  const codeBlocks = await $$(`${selector} li code`);
  const variableNames = await Promise.all(codeBlocks.map(async block => {
    const text = await block.evaluate(code => (code as HTMLElement).innerText);
    return text.split(':')[0];
  }));
  return variableNames;
}

describe('theme colors', () => {
  it('lists the colors in both light and dark mode', async () => {
    await loadComponentDocExample('theme_colors/basic.html');
    const lightModeVariables = await getListOfColorsFromList('.light-mode');
    const darkModeVariables = await getListOfColorsFromList('.dark-mode');
    assert.lengthOf(lightModeVariables, 18);
    assert.deepEqual(lightModeVariables, darkModeVariables);
  });
});
