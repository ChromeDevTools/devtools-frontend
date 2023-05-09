// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Buttons from '../../buttons/buttons.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const testIcon = '/front_end/Images/file-image.svg';
const fileIcon = '/front_end/Images/document.svg';
const plusIcon = '/front_end/Images/plus.svg';
const minusIcon = '/front_end/Images/minus.svg';
const trashBinIcon = '/front_end/Images/bin.svg';
const closeIcon = '/front_end/Images/cross.svg';

function appendButton(button: Buttons.Button.Button): void {
  document.querySelector('#container')?.appendChild(button);
}

function appendToToolbar(element: HTMLElement): void {
  document.querySelector('#toolbar')?.appendChild(element);
}

function appendToSmallToolbar(element: HTMLElement): void {
  document.querySelector('#small-toolbar')?.appendChild(element);
}

// Primary
const primaryButton = new Buttons.Button.Button();
primaryButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
};
primaryButton.innerText = 'Click me';
primaryButton.title = 'Custom title';
primaryButton.onclick = () => alert('clicked');
appendButton(primaryButton);

const primaryButtonWithoutRightBorderRadius = new Buttons.Button.Button();
primaryButtonWithoutRightBorderRadius.data = {
  variant: Buttons.Button.Variant.PRIMARY,
};
primaryButtonWithoutRightBorderRadius.style.setProperty('--override-button-no-right-border-radius', '1');
primaryButtonWithoutRightBorderRadius.innerText = 'No right border radius';
primaryButtonWithoutRightBorderRadius.title = 'Custom title';
primaryButtonWithoutRightBorderRadius.onclick = () => alert('clicked');
appendButton(primaryButtonWithoutRightBorderRadius);

// Primary (forced active)
const forcedActive = new Buttons.Button.Button();
forcedActive.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  active: true,
};
forcedActive.innerText = 'Forced active';
forcedActive.onclick = () => alert('clicked');
appendButton(forcedActive);

// Primary (forced spinner)
const forcedSpinner = new Buttons.Button.Button();
forcedSpinner.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  spinner: true,
};
forcedSpinner.innerText = 'Forced spinner';
forcedSpinner.onclick = () => alert('clicked');
appendButton(forcedSpinner);

// Secondary
const secondaryButton = new Buttons.Button.Button();
secondaryButton.innerText = 'Click me';
secondaryButton.onclick = () => alert('clicked');
secondaryButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
};
appendButton(secondaryButton);

// Secondary spinner
const secondarySpinnerButton = new Buttons.Button.Button();
secondarySpinnerButton.innerText = 'Click me';
secondarySpinnerButton.onclick = () => alert('clicked');
secondarySpinnerButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  spinner: true,
};
appendButton(secondarySpinnerButton);

// Primary
const disabledPrimaryButtons = new Buttons.Button.Button();
disabledPrimaryButtons.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  disabled: true,
};
disabledPrimaryButtons.innerText = 'Cannot click me';
disabledPrimaryButtons.onclick = () => alert('clicked');
appendButton(disabledPrimaryButtons);

// Primary spinner
const disabledSpinnerPrimaryButtons = new Buttons.Button.Button();
disabledSpinnerPrimaryButtons.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  disabled: true,
  spinner: true,
};
disabledSpinnerPrimaryButtons.innerText = 'Cannot click me';
disabledSpinnerPrimaryButtons.onclick = () => alert('clicked');
appendButton(disabledSpinnerPrimaryButtons);

// Secondary
const disabledSecondaryButton = new Buttons.Button.Button();
disabledSecondaryButton.innerText = 'Cannot click me';
disabledSecondaryButton.onclick = () => alert('clicked');
disabledSecondaryButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  disabled: true,
};
appendButton(disabledSecondaryButton);

// Secondary spinner
const disabledSpinnerSecondaryButton = new Buttons.Button.Button();
disabledSpinnerSecondaryButton.innerText = 'Cannot click me';
disabledSpinnerSecondaryButton.onclick = () => alert('clicked');
disabledSpinnerSecondaryButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  disabled: true,
  spinner: true,
};
appendButton(disabledSpinnerSecondaryButton);

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
primaryIconOnlyButton.style.width = '24px';
appendButton(primaryIconOnlyButton);

// Primary Icon with a name
const primaryIconByNameButton = new Buttons.Button.Button();
primaryIconByNameButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconName: 'file-image',
};
primaryIconByNameButton.onclick = () => alert('clicked');
primaryIconByNameButton.innerHTML = 'Icon by name';
appendButton(primaryIconByNameButton);

// Secondary Icon Only
const secondaryIconOnlyButton = new Buttons.Button.Button();
secondaryIconOnlyButton.onclick = () => alert('clicked');
secondaryIconOnlyButton.style.width = '24px';
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

// Disabled Primary Icon
const disabledPrimaryIconButton = new Buttons.Button.Button();
disabledPrimaryIconButton.innerText = 'Cannot click me';
disabledPrimaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconUrl: testIcon,
  size: Buttons.Button.Size.SMALL,
  disabled: true,
};
disabledPrimaryIconButton.onclick = () => alert('clicked');
appendButton(disabledPrimaryIconButton);

// Small Disabled Secondary Icon Only
const disabledSecondaryIconOnlyButton = new Buttons.Button.Button();
disabledSecondaryIconOnlyButton.onclick = () => alert('clicked');
disabledSecondaryIconOnlyButton.style.width = '18px';
disabledSecondaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  iconUrl: testIcon,
  size: Buttons.Button.Size.SMALL,
  disabled: true,
};
appendButton(disabledSecondaryIconOnlyButton);

// Round Button
const roundButton = new Buttons.Button.Button();
roundButton.data = {
  variant: Buttons.Button.Variant.ROUND,
  iconUrl: testIcon,
};
roundButton.title = 'Round Button';
roundButton.onclick = () => alert('clicked');
appendButton(roundButton);

// Disabled Round Button
const roundButtonDisabled = new Buttons.Button.Button();
roundButtonDisabled.data = {
  variant: Buttons.Button.Variant.ROUND,
  iconUrl: testIcon,
  disabled: true,
};
roundButtonDisabled.title = 'Disabled Round Button';
roundButtonDisabled.onclick = () => alert('clicked');
appendButton(roundButtonDisabled);

// Small Round Buttons
const roundIcons = [
  {iconUrl: testIcon},
  {iconUrl: fileIcon, iconWidth: '16px', iconHeight: '16px'},
  {iconUrl: plusIcon},
  {iconUrl: minusIcon},
  {iconUrl: trashBinIcon, iconWidth: '10px', iconHeight: '14px'},
  {iconUrl: closeIcon, iconWidth: '10px', iconHeight: '10px'},
];
for (const roundIcon of roundIcons) {
  const smallRoundButton = new Buttons.Button.Button();
  smallRoundButton.data = {
    variant: Buttons.Button.Variant.ROUND,
    size: Buttons.Button.Size.SMALL,
    ...roundIcon,
  };
  smallRoundButton.title = 'Small Round Button';
  smallRoundButton.onclick = () => alert('clicked');
  appendButton(smallRoundButton);
}

// Tiny Round Buttons
const tinyRoundIcons = [
  {iconUrl: plusIcon},
  {iconUrl: minusIcon},
  {iconUrl: closeIcon, iconWidth: '9px', iconHeight: '9px'},
];
for (const roundIcon of tinyRoundIcons) {
  const tinyRoundButton = new Buttons.Button.Button();
  tinyRoundButton.data = {
    variant: Buttons.Button.Variant.ROUND,
    size: Buttons.Button.Size.TINY,
    ...roundIcon,
  };
  tinyRoundButton.title = 'Tiny Round Button';
  tinyRoundButton.onclick = () => alert('clicked');
  appendButton(tinyRoundButton);
}

// Small Disabled Round Button
const smallRoundButtonDisabled = new Buttons.Button.Button();
smallRoundButtonDisabled.data = {
  variant: Buttons.Button.Variant.ROUND,
  iconUrl: testIcon,
  disabled: true,
  size: Buttons.Button.Size.SMALL,
};
smallRoundButtonDisabled.title = 'Small Disabled Round Button';
smallRoundButtonDisabled.onclick = () => alert('clicked');
appendButton(smallRoundButtonDisabled);

for (let i = 0; i < 6; i++) {
  // Regular Toolbar Button
  const toolbarButton = new Buttons.Button.Button();
  toolbarButton.onclick = () => alert('clicked');
  toolbarButton.data = {
    variant: i % 2 === 1 ? Buttons.Button.Variant.TOOLBAR : Buttons.Button.Variant.PRIMARY_TOOLBAR,
    iconUrl: testIcon,
  };
  appendToToolbar(toolbarButton);
  if (i % 3 === 1) {
    const sep = document.createElement('div');
    sep.classList.add('separator');
    appendToToolbar(sep);
  }
}

// Disabled Toolbar Button
const toolbarButton = new Buttons.Button.Button();
toolbarButton.onclick = () => alert('clicked');
toolbarButton.data = {
  variant: Buttons.Button.Variant.TOOLBAR,
  iconUrl: testIcon,
  disabled: true,
};
appendToToolbar(toolbarButton);

for (let i = 0; i < 6; i++) {
  // Small Toolbar Button
  const smallToolbarButton = new Buttons.Button.Button();
  smallToolbarButton.onclick = () => alert('clicked');
  smallToolbarButton.data = {
    variant: Buttons.Button.Variant.TOOLBAR,
    size: Buttons.Button.Size.SMALL,
    iconUrl: testIcon,
  };
  appendToSmallToolbar(smallToolbarButton);
  if (i % 3 === 1) {
    const sep = document.createElement('div');
    sep.classList.add('separator');
    appendToSmallToolbar(sep);
  }
}

// Submit Button
const submitButton = new Buttons.Button.Button();
submitButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  type: 'submit',
};
submitButton.innerText = 'Submit';
document.querySelector('#form')?.append(submitButton);

// Reset Button
const resetButton = new Buttons.Button.Button();
resetButton.data = {
  variant: Buttons.Button.Variant.SECONDARY,
  type: 'reset',
};
resetButton.innerText = 'Reset';
document.querySelector('#form')?.append(resetButton);
