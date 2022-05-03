// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../../../front_end/ui/components/linear_memory_inspector/linear_memory_inspector.js';
import {
  assertElement,
  getElementsWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const SETTINGS_INPUT_SELECTOR = '[data-input]';
const SETTINGS_TITLE_SELECTOR = '[data-title]';
const SETTINGS_LABEL_SELECTOR = '.type-label';

describeWithLocale('ValueInterpreterSettings', () => {
  function setUpComponent() {
    const component = new LinearMemoryInspector.ValueInterpreterSettings.ValueInterpreterSettings();
    const data = {
      valueTypes: new Set([
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int8,
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float64,
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Pointer32,
      ]),
    };
    component.data = data;
    renderElementIntoDOM(component);
    return {component, data};
  }

  it('renders all checkboxes', () => {
    const {component} = setUpComponent();
    const checkboxes = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, HTMLLabelElement);
    const checkboxLabels = Array.from(checkboxes, checkbox => checkbox.getAttribute('title'));
    assert.deepEqual(checkboxLabels, [
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int8,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int16,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int64,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float64,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Pointer32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Pointer64,
    ]);
  });

  it('triggers an event on checkbox click', async () => {
    const {component} = setUpComponent();
    const labels = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, HTMLLabelElement);

    for (const label of labels) {
      const checkbox = label.querySelector(SETTINGS_INPUT_SELECTOR);
      assertElement(checkbox, HTMLInputElement);
      const title = label.querySelector(SETTINGS_TITLE_SELECTOR);
      assertElement(title, HTMLSpanElement);

      const checked = checkbox.checked;

      const eventPromise =
          getEventPromise<LinearMemoryInspector.ValueInterpreterSettings.TypeToggleEvent>(component, 'typetoggle');
      checkbox.click();
      const event = await eventPromise;

      assert.strictEqual(`${event.data.type}`, title.innerText);
      assert.strictEqual(checkbox.checked, !checked);
    }
  });

  it('correctly shows checkboxes as checked/unchecked', () => {
    const {component, data} = setUpComponent();
    const labels = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, HTMLLabelElement);
    const elements = Array.from(labels).map(label => {
      const checkbox = label.querySelector<HTMLInputElement>(SETTINGS_INPUT_SELECTOR);
      const title = label.querySelector<HTMLSpanElement>(SETTINGS_TITLE_SELECTOR);
      assertElement(checkbox, HTMLInputElement);
      assertElement(title, HTMLSpanElement);
      return {title, checked: checkbox.checked};
    });
    assert.isAtLeast(data.valueTypes.size, 1);
    const checkedTitles = new Set(elements.filter(n => n.checked).map(n => n.title.innerText));
    const expectedTitles = new Set([...data.valueTypes].map(type => `${type}`));
    assert.deepEqual(checkedTitles, expectedTitles);

    const uncheckedTitles = new Set(elements.filter(n => !n.checked).map(n => n.title.innerText));
    const allTypesTitle = [
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int8,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int16,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int64,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float64,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Pointer32,
      LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Pointer64,
    ];
    const expectedUncheckedTitles = new Set(allTypesTitle.filter(title => !expectedTitles.has(title)));
    assert.deepEqual(uncheckedTitles, expectedUncheckedTitles);
  });
});
