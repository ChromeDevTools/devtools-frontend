// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as UI from '../../../ui/legacy/legacy.js';

import * as LinearMemoryInspectorComponents from './components.js';

const DISPLAY_SELECTOR = 'devtools-linear-memory-inspector-interpreter-display';
const TOOLBAR_SELECTOR = '.settings-toolbar';
export const ENDIANNESS_SELECTOR = '[data-endianness]';

function assertSettingsRenders(
    component: LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter) {
  const widget = component.shadowRoot?.querySelector<
      UI.Widget.WidgetElement<LinearMemoryInspectorComponents.ValueInterpreterSettings.ValueInterpreterSettings>>(
      'devtools-widget');
  assert.instanceOf(
      widget?.getWidget(), LinearMemoryInspectorComponents.ValueInterpreterSettings.ValueInterpreterSettings);
}

function assertDisplayRenders(component: HTMLElement) {
  const display = getElementWithinComponent(
      component, DISPLAY_SELECTOR, LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay);
  assert.isNotNull(display);
}

function clickSettingsButton(
    component: LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter) {
  const settingsButton = getElementWithinComponent(component, '[data-settings]', Buttons.Button.Button);
  settingsButton.click();
}

describe('LinearMemoryValueInterpreter', () => {
  setupLocaleHooks();
  function setUpComponent() {
    const buffer = new Uint8Array([34, 234, 12, 3]).buffer;
    const component = new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter();
    component.data = {
      value: buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8]),
      memoryLength: buffer.byteLength,
    };
    renderElementIntoDOM(component);
    return component;
  }

  it('renders the settings toolbar', () => {
    const component = setUpComponent();
    const settingsToolbar = getElementWithinComponent(component, TOOLBAR_SELECTOR, HTMLDivElement);
    assert.isNotNull(settingsToolbar);
  });

  it('renders value display as default', () => {
    const component = setUpComponent();
    assertDisplayRenders(component);
  });

  it('switches between value display and value settings', () => {
    const component = setUpComponent();
    assertDisplayRenders(component);

    clickSettingsButton(component);

    assertSettingsRenders(component);
  });

  it('listens on TypeToggleEvents', async () => {
    const component = setUpComponent();
    clickSettingsButton(component);

    // After clicking settings, it should render devtools-widget with ValueInterpreterSettings
    const widget = component.shadowRoot?.querySelector<
        UI.Widget.WidgetElement<LinearMemoryInspectorComponents.ValueInterpreterSettings.ValueInterpreterSettings>>(
        'devtools-widget');
    const settingsWidget = widget?.getWidget();
    assert.isNotNull(settingsWidget);

    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.ValueTypeToggledEvent>(
            component, 'valuetypetoggled');

    const expectedType = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8;
    const expectedChecked = false;  // Assuming it's initially checked

    settingsWidget?.onToggle(expectedType, expectedChecked);

    const event = await eventPromise;
    assert.strictEqual(event.data.type, expectedType);
    assert.strictEqual(event.data.checked, expectedChecked);
  });

  it('renders the endianness options', () => {
    const component = setUpComponent();
    const input = getElementWithinComponent(component, ENDIANNESS_SELECTOR, HTMLSelectElement);
    assert.deepEqual(input.value, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE);
    const options = input.querySelectorAll('option');
    const endiannessSettings = Array.from(options).map(option => option.value);
    assert.deepEqual(endiannessSettings, [
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG,
    ]);
  });

  it('triggers an event on changing endianness', async () => {
    const component = setUpComponent();
    const input = getElementWithinComponent(component, ENDIANNESS_SELECTOR, HTMLSelectElement);

    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.EndiannessChangedEvent>(
            component, 'endiannesschanged');
    const changeEvent = new Event('change');
    input.dispatchEvent(changeEvent);

    const event = await eventPromise;
    assert.deepEqual(event.data, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE);
  });
});
