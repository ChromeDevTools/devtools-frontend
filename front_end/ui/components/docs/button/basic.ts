// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Buttons from '../../buttons/buttons.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const testIcon =
    'data:text/plain;charset=utf-8;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik0xMyA1SDEyVjExSDZWMTJIMTJWMThIMTNWMTJIMTlWMTFIMTNWNVoiIGZpbGw9ImJsYWNrIi8+DQo8L3N2Zz4=';

function appendButton(button: Buttons.Button.Button): void {
  document.querySelector('#container')?.appendChild(button);
}

// Primary
const primaryButton = new Buttons.Button.Button();
primaryButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
};
primaryButton.innerText = 'Click me';
primaryButton.onclick = () => alert('clicked');
appendButton(primaryButton);

// Secondary
const secondaryButton = new Buttons.Button.Button();
secondaryButton.innerText = 'Click me';
secondaryButton.onclick = () => alert('clicked');
secondaryButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
};
appendButton(secondaryButton);

// Primary Icon
const primaryIconButton = new Buttons.Button.Button();
primaryIconButton.innerText = 'Click me';
primaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconUrl: testIcon,
};
primaryIconButton.onclick = () => alert('clicked');
appendButton(primaryIconButton);

// Secondary Icon
const secondaryIconButton = new Buttons.Button.Button();
secondaryIconButton.innerText = 'Focus the first button';
secondaryIconButton.onclick = () => {
  primaryButton.focus();
};
secondaryIconButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  iconUrl: testIcon,
};
appendButton(secondaryIconButton);
