// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../../buttons/buttons.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const testIcon = 'file-image';
const toggledIconName = 'file-document';
const plusIcon = 'plus';
const minusIcon = 'minus';

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
const secondarymicroButton = new Buttons.Button.Button();
secondarymicroButton.innerText = 'Click me';
secondarymicroButton.onclick = () => alert('clicked');
secondarymicroButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
  size: Buttons.Button.Size.MICRO,
};
appendButton(secondarymicroButton);

// Secondary
const secondaryButton = new Buttons.Button.Button();
secondaryButton.innerText = 'Click me';
secondaryButton.onclick = () => alert('clicked');
secondaryButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
};
appendButton(secondaryButton);

// Secondary spinner
const secondarySpinnerButton = new Buttons.Button.Button();
secondarySpinnerButton.innerText = 'Click me';
secondarySpinnerButton.onclick = () => alert('clicked');
secondarySpinnerButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
  spinner: true,
};
appendButton(secondarySpinnerButton);

// Secondary spinner
const textButton = new Buttons.Button.Button();
textButton.innerText = 'Click me';
textButton.onclick = () => alert('clicked');
textButton.data = {
  variant: Buttons.Button.Variant.TEXT,
};
appendButton(textButton);

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
  variant: Buttons.Button.Variant.OUTLINED,
  disabled: true,
};
appendButton(disabledSecondaryButton);

// Secondary spinner
const disabledSpinnerSecondaryButton = new Buttons.Button.Button();
disabledSpinnerSecondaryButton.innerText = 'Cannot click me';
disabledSpinnerSecondaryButton.onclick = () => alert('clicked');
disabledSpinnerSecondaryButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
  disabled: true,
  spinner: true,
};
appendButton(disabledSpinnerSecondaryButton);

// Primary Icon
const primaryIconButton = new Buttons.Button.Button();
primaryIconButton.innerText = 'Click me';
primaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconName: testIcon,
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
  variant: Buttons.Button.Variant.OUTLINED,
  iconName: testIcon,
};
appendButton(secondaryIconButton);

// Text Icon
const textIconButton = new Buttons.Button.Button();
textIconButton.innerText = 'Click me';
textIconButton.onclick = () => alert('clicked');
textIconButton.data = {
  variant: Buttons.Button.Variant.TEXT,
  iconName: testIcon,
};
appendButton(textIconButton);

// Secondary Icon Micro
const secondaryMicroIconButton = new Buttons.Button.Button();
secondaryMicroIconButton.innerText = 'Click me';
secondaryMicroIconButton.onclick = () => {
  primaryButton.focus();
};
secondaryMicroIconButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
  iconName: testIcon,
  size: Buttons.Button.Size.MICRO,
};
appendButton(secondaryMicroIconButton);

// Primary Icon Only
const primaryIconOnlyButton = new Buttons.Button.Button();
primaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconName: testIcon,
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
  variant: Buttons.Button.Variant.OUTLINED,
  iconName: testIcon,
};
appendButton(secondaryIconOnlyButton);

// Primary Toggle
const primaryToggleIconButton = new Buttons.Button.Button();
primaryToggleIconButton.style.width = '24px';
primaryToggleIconButton.data = {
  variant: Buttons.Button.Variant.ICON_TOGGLE,
  toggleType: Buttons.Button.ToggleType.PRIMARY,
  iconName: testIcon,
  toggledIconName,
  toggled: false,
};
appendButton(primaryToggleIconButton);

// Red Toggle
const redToggleIconButton = new Buttons.Button.Button();
redToggleIconButton.style.width = '24px';
redToggleIconButton.data = {
  variant: Buttons.Button.Variant.ICON_TOGGLE,
  toggleType: Buttons.Button.ToggleType.RED,
  iconName: testIcon,
  toggledIconName,
  toggled: true,
};
appendButton(redToggleIconButton);

// Small Primary Icon
const smallPrimaryIconButton = new Buttons.Button.Button();
smallPrimaryIconButton.innerText = 'Click me';
smallPrimaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconName: testIcon,
  size: Buttons.Button.Size.SMALL,
};
smallPrimaryIconButton.onclick = () => alert('clicked');
appendButton(smallPrimaryIconButton);

// Small Secondary Icon Only
const smallSecondaryIconOnlyButton = new Buttons.Button.Button();
smallSecondaryIconOnlyButton.onclick = () => alert('clicked');
smallSecondaryIconOnlyButton.style.width = '18px';
smallSecondaryIconOnlyButton.data = {
  variant: Buttons.Button.Variant.OUTLINED,
  iconName: testIcon,
  size: Buttons.Button.Size.SMALL,
};
appendButton(smallSecondaryIconOnlyButton);

// Disabled Primary Icon
const disabledPrimaryIconButton = new Buttons.Button.Button();
disabledPrimaryIconButton.innerText = 'Cannot click me';
disabledPrimaryIconButton.data = {
  variant: Buttons.Button.Variant.PRIMARY,
  iconName: testIcon,
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
  variant: Buttons.Button.Variant.OUTLINED,
  iconName: testIcon,
  size: Buttons.Button.Size.SMALL,
  disabled: true,
};
appendButton(disabledSecondaryIconOnlyButton);

// Round Button
const roundButton = new Buttons.Button.Button();
roundButton.data = {
  variant: Buttons.Button.Variant.ICON,
  iconName: testIcon,
};
roundButton.title = 'Round Button';
roundButton.onclick = () => alert('clicked');
appendButton(roundButton);

// Disabled Round Button
const roundButtonDisabled = new Buttons.Button.Button();
roundButtonDisabled.data = {
  variant: Buttons.Button.Variant.ICON,
  iconName: testIcon,
  disabled: true,
};
roundButtonDisabled.title = 'Disabled Round Button';
roundButtonDisabled.onclick = () => alert('clicked');
appendButton(roundButtonDisabled);

// Small Round Buttons
const roundIcons = [
  {iconName: testIcon},
  {iconName: plusIcon},
  {iconName: minusIcon},
];
for (const roundIcon of roundIcons) {
  const smallRoundButton = new Buttons.Button.Button();
  smallRoundButton.data = {
    variant: Buttons.Button.Variant.ICON,
    size: Buttons.Button.Size.SMALL,
    ...roundIcon,
  };
  smallRoundButton.title = 'Small Round Button';
  smallRoundButton.onclick = () => alert('clicked');
  appendButton(smallRoundButton);
}

// Small Disabled Round Button
const smallRoundButtonDisabled = new Buttons.Button.Button();
smallRoundButtonDisabled.data = {
  variant: Buttons.Button.Variant.ICON,
  iconName: testIcon,
  disabled: true,
  size: Buttons.Button.Size.SMALL,
};
smallRoundButtonDisabled.title = 'Small Disabled Round Button';
smallRoundButtonDisabled.onclick = () => alert('clicked');
appendButton(smallRoundButtonDisabled);

// Tonal
const tonalButton = new Buttons.Button.Button();
tonalButton.data = {
  variant: Buttons.Button.Variant.TONAL,
};
tonalButton.innerText = 'Click me';
tonalButton.title = 'Custom title';
tonalButton.onclick = () => alert('clicked');
appendButton(tonalButton);

for (let i = 0; i < 6; i++) {
  // Regular Toolbar Button
  const toolbarButton = new Buttons.Button.Button();
  toolbarButton.onclick = () => alert('clicked');
  toolbarButton.data = {
    variant: i % 2 === 1 ? Buttons.Button.Variant.TOOLBAR : Buttons.Button.Variant.PRIMARY_TOOLBAR,
    iconName: testIcon,
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
  iconName: testIcon,
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
    iconName: testIcon,
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
  variant: Buttons.Button.Variant.OUTLINED,
  type: 'reset',
};
resetButton.innerText = 'Reset';
document.querySelector('#form')?.append(resetButton);
