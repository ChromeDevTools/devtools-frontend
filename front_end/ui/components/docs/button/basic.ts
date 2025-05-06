// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../../buttons/buttons.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const BUTTONS_SECTION = '#buttons';
const PRIMARY_SECTION = '#primary-buttons';
const TONAL_SECTION = '#tonal-buttons';
const OUTLINED_SECTION = '#outlined-buttons';
const TEXT_SECTION = '#text-buttons';
const ICON_SECTION = '#icon-buttons';
const FLOATING_SECTION = '#floating-buttons';

const DEFAULT_TEXT = 'Default';
const WITH_ICON_TEXT = 'With icon';
const MICRO_TEXT = 'Micro';

function append(section: string, element: HTMLElement): void {
  document.querySelector(section)?.appendChild(element);
}

// Buttons
{
  const primaryButton = new Buttons.Button.Button();
  primaryButton.data = {
    variant: Buttons.Button.Variant.PRIMARY,
  };
  primaryButton.innerText = 'Primary button';
  append(BUTTONS_SECTION, primaryButton);

  const tonalButton = new Buttons.Button.Button();
  tonalButton.data = {
    variant: Buttons.Button.Variant.TONAL,
  };
  tonalButton.innerText = 'Tonal button';
  append(BUTTONS_SECTION, tonalButton);

  const outlinedButton = new Buttons.Button.Button();
  outlinedButton.data = {
    variant: Buttons.Button.Variant.OUTLINED,
  };
  outlinedButton.innerText = 'Outlined button';
  append(BUTTONS_SECTION, outlinedButton);

  const textButton = new Buttons.Button.Button();
  textButton.data = {
    variant: Buttons.Button.Variant.TEXT,
  };
  textButton.innerText = 'Text button';
  append(BUTTONS_SECTION, textButton);

  const iconButton = new Buttons.Button.Button();
  iconButton.data = {
    variant: Buttons.Button.Variant.ICON,
    iconName: 'gear',
  };
  append(BUTTONS_SECTION, iconButton);
}

// Primary buttons
{
  const primaryDefault = new Buttons.Button.Button();
  primaryDefault.data = {
    variant: Buttons.Button.Variant.PRIMARY,
  };
  primaryDefault.innerText = DEFAULT_TEXT;
  append(PRIMARY_SECTION, primaryDefault);

  const primaryWithIcon = new Buttons.Button.Button();
  primaryWithIcon.innerText = WITH_ICON_TEXT;
  primaryWithIcon.data = {
    variant: Buttons.Button.Variant.PRIMARY,
    iconName: 'plus',
  };
  append(PRIMARY_SECTION, primaryWithIcon);
}

// Tonal buttons
{
  const tonalDefault = new Buttons.Button.Button();
  tonalDefault.data = {
    variant: Buttons.Button.Variant.TONAL,
  };
  tonalDefault.innerText = DEFAULT_TEXT;
  append(TONAL_SECTION, tonalDefault);

  const tonalWithIcon = new Buttons.Button.Button();
  tonalWithIcon.innerText = WITH_ICON_TEXT;

  tonalWithIcon.data = {
    variant: Buttons.Button.Variant.PRIMARY,
    iconName: 'plus',
  };
  append(TONAL_SECTION, tonalWithIcon);
}

// Outlined buttons
{
  const outlinedDefault = new Buttons.Button.Button();
  outlinedDefault.data = {
    variant: Buttons.Button.Variant.OUTLINED,
  };
  outlinedDefault.innerText = DEFAULT_TEXT;
  append(OUTLINED_SECTION, outlinedDefault);

  const outlinedWithIcon = new Buttons.Button.Button();
  outlinedWithIcon.innerText = WITH_ICON_TEXT;
  outlinedWithIcon.data = {
    variant: Buttons.Button.Variant.OUTLINED,
    iconName: 'plus',
  };
  append(OUTLINED_SECTION, outlinedWithIcon);

  const outlinedMicro = new Buttons.Button.Button();
  outlinedMicro.innerText = MICRO_TEXT;
  outlinedMicro.data = {
    variant: Buttons.Button.Variant.OUTLINED,
    size: Buttons.Button.Size.MICRO,
  };
  append(OUTLINED_SECTION, outlinedMicro);
}

// Text buttons
{
  const textDefault = new Buttons.Button.Button();
  textDefault.innerText = DEFAULT_TEXT;
  textDefault.data = {
    variant: Buttons.Button.Variant.TEXT,
  };
  append(TEXT_SECTION, textDefault);

  const textWithIcon = new Buttons.Button.Button();
  textWithIcon.innerText = WITH_ICON_TEXT;

  textWithIcon.data = {
    variant: Buttons.Button.Variant.TEXT,
    iconName: 'plus',
  };
  append(TEXT_SECTION, textWithIcon);
}

// Icon buttons
{
  const iconDefault = new Buttons.Button.Button();
  iconDefault.data = {
    variant: Buttons.Button.Variant.ICON,
    iconName: 'gear',
  };
  append(ICON_SECTION, iconDefault);

  const iconToggle = new Buttons.Button.Button();
  iconToggle.data = {
    variant: Buttons.Button.Variant.ICON_TOGGLE,
    iconName: 'gear',
    toggledIconName: 'gear',
    toggled: true,
    toggleType: Buttons.Button.ToggleType.PRIMARY,
  };
  const toggledWithLabel = document.createElement('span');
  toggledWithLabel.textContent = '(Toggle)';
  append(ICON_SECTION, iconToggle);
  append(ICON_SECTION, toggledWithLabel);
}

// Floating buttons
{
  const floatingButton = Buttons.FloatingButton.create('smart-assistant', 'Ask AI!');
  append(FLOATING_SECTION, floatingButton);
}
