// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ThemeSupport from '../../../legacy/theme_support/theme_support.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const inputField = document.querySelector<HTMLInputElement>('#text-input input');
if (!inputField) {
  throw new Error('could not find input');
}

const setting = FrontendHelpers.createFakeSetting('theme', 'dark');
const themeSupport = ThemeSupport.ThemeSupport.instance({
  forceNew: true,
  setting,
});

inputField.addEventListener('input', (event: Event) => {
  if (!event.target) {
    return;
  }
  let value = (event.target as HTMLInputElement).value;
  if (!value.endsWith(';')) {
    value = value + ';';
  }
  generateCSS(value);
});

let generateCSSID = 0;
function generateCSS(inputValue: string) {
  generateCSSID++;
  const outputBox = document.querySelector<HTMLElement>('#output');
  if (!outputBox) {
    return;
  }
  outputBox.innerText = '';
  const inputText = `fake-element-selector {
    color: ${inputValue};
  }`;
  const result = themeSupport.themeStyleSheet(`fake-stylesheet-${generateCSSID}`, inputText);
  if (!result) {
    return;
  }
  const darkModeColor = /fake-element-selector{color:(.+);}/.exec(result);
  if (!darkModeColor || !darkModeColor[1]) {
    return;
  }
  const darkModeColorValue = darkModeColor[1];
  const outputCSS = `fake-element-selector {
  --override-my-custom-value: ${inputValue};
};

.-theme-with-dark-background fake-element-selector,
:host-context(.-theme-with-dark-background) fake-element-selector {
  --override-my-custom-value: ${darkModeColorValue};
}`;

  outputBox.innerText = outputCSS;
}
