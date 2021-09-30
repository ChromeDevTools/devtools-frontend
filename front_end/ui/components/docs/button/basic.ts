// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Buttons from '../../buttons/buttons.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const testIcon = '/front_end/Images/ic_file_image.svg';

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

// Primary Icon Only
const primaryIconOnlyButton = new Buttons.Button.Button();
primaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconUrl: testIcon,
};
primaryIconOnlyButton.onclick = () => alert('clicked');
primaryIconOnlyButton.style.width = '25px';
appendButton(primaryIconOnlyButton);

// Secondary Icon Only
const secondaryIconOnlyButton = new Buttons.Button.Button();
secondaryIconOnlyButton.onclick = () => alert('clicked');
secondaryIconOnlyButton.style.width = '25px';
secondaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  iconUrl: testIcon,
};
appendButton(secondaryIconOnlyButton);

// Small Primary Icon
const smallPrimaryIconButton = new Buttons.Button.Button();
smallPrimaryIconButton.innerText = 'Click me';
smallPrimaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconUrl: testIcon,
  size: Buttons.Button.Size.SMALL,
};
smallPrimaryIconButton.onclick = () => alert('clicked');
appendButton(smallPrimaryIconButton);

// Small Secondary Icon Only
const smallSecondaryIconOnlyButton = new Buttons.Button.Button();
smallSecondaryIconOnlyButton.onclick = () => alert('clicked');
smallSecondaryIconOnlyButton.style.width = '18px';
smallSecondaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  iconUrl: testIcon,
  size: Buttons.Button.Size.SMALL,
};
appendButton(smallSecondaryIconOnlyButton);
