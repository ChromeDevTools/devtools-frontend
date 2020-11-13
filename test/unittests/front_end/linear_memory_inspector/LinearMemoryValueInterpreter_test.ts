// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';

import {Endianness, ValueType} from '../../../../front_end/linear_memory_inspector/ValueInterpreterDisplayUtils.js';
import {getElementWithinComponent, getEventPromise, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

const DISPLAY_SELECTOR = 'devtools-linear-memory-inspector-interpreter-display';
const SETTINGS_SELECTOR = 'devtools-linear-memory-inspector-interpreter-settings';
const TOOLBAR_SELECTOR = '.settings-toolbar';

function assertSettingsRenders(component: HTMLElement) {
  const settings = getElementWithinComponent(
      component, SETTINGS_SELECTOR, LinearMemoryInspector.ValueInterpreterSettings.ValueInterpreterSettings);
  assert.isNotNull(settings);
}

function assertDisplayRenders(component: HTMLElement) {
  const display = getElementWithinComponent(
      component, DISPLAY_SELECTOR, LinearMemoryInspector.ValueInterpreterDisplay.ValueInterpreterDisplay);
  assert.isNotNull(display);
}

function clickSettingsButton(
    component: LinearMemoryInspector.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter) {
  const settingsButton = getElementWithinComponent(component, '[data-settings]', HTMLButtonElement);
  settingsButton.click();
}

describe('LinearMemoryValueInterpreter', () => {
  function setUpComponent() {
    const buffer = new Uint8Array([34, 234, 12, 3]).buffer;
    const component = new LinearMemoryInspector.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter();
    component.data = {
      value: buffer,
      endianness: Endianness.Little,
      valueTypes: new Set([ValueType.Int8]),
    };
    renderElementIntoDOM(component);
    return component;
  }

  it('renders settings toolbar', async () => {
    const component = setUpComponent();
    const settingsToolbar = getElementWithinComponent(component, TOOLBAR_SELECTOR, HTMLDivElement);
    assert.isNotNull(settingsToolbar);
  });

  it('renders value display as default', async () => {
    const component = setUpComponent();
    assertDisplayRenders(component);
  });

  it('switches between value display and value settings', async () => {
    const component = setUpComponent();
    assertDisplayRenders(component);

    clickSettingsButton(component);

    assertSettingsRenders(component);
  });

  it('listens on TypeToggleEvents', async () => {
    const component = setUpComponent();
    clickSettingsButton(component);

    const settings = getElementWithinComponent(
        component, SETTINGS_SELECTOR, LinearMemoryInspector.ValueInterpreterSettings.ValueInterpreterSettings);
    const eventPromise = getEventPromise<LinearMemoryInspector.LinearMemoryValueInterpreter.ValueTypeToggleEvent>(
        component, 'value-type-toggle');
    const expectedType = ValueType.Boolean;
    const expectedChecked = true;
    const typeToggleEvent =
        new LinearMemoryInspector.ValueInterpreterSettings.TypeToggleEvent(expectedType, expectedChecked);
    settings.dispatchEvent(typeToggleEvent);

    const event = await eventPromise;
    assert.strictEqual(event.data.type, expectedType);
    assert.strictEqual(event.data.checked, expectedChecked);
  });
});
