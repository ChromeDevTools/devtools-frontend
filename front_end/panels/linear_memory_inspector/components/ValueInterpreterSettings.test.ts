// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getElementsWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as LinearMemoryInspectorComponents from './components.js';

const SETTINGS_LABEL_SELECTOR = 'devtools-checkbox';

describeWithLocale('ValueInterpreterSettings', () => {
  function setUpComponent() {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterSettings.ValueInterpreterSettings();
    const data = {
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      ]),
    };
    component.data = data;
    renderElementIntoDOM(component);
    return {component, data};
  }

  it('renders all checkboxes', () => {
    const {component} = setUpComponent();
    const checkboxes = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, UI.UIUtils.CheckboxLabel);
    const checkboxLabels = Array.from(checkboxes, checkbox => checkbox.getAttribute('title'));
    assert.deepEqual(checkboxLabels, [
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
    ]);
  });

  it('triggers an event on checkbox click', async () => {
    const {component} = setUpComponent();
    const checkboxes = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, UI.UIUtils.CheckboxLabel);

    for (const checkbox of checkboxes) {
      const title = checkbox.title;
      const checked = checkbox.checked;

      const eventPromise = getEventPromise<LinearMemoryInspectorComponents.ValueInterpreterSettings.TypeToggleEvent>(
          component, 'typetoggle');
      checkbox.click();
      const event = await eventPromise;

      assert.strictEqual(`${event.data.type}`, title);
      assert.strictEqual(checkbox.checked, !checked);
    }
  });

  it('correctly shows checkboxes as checked/unchecked', () => {
    const {component, data} = setUpComponent();
    const labels = getElementsWithinComponent(component, SETTINGS_LABEL_SELECTOR, UI.UIUtils.CheckboxLabel);
    const elements = Array.from(labels).map(label => {
      return {title: label.textContent, checked: label.checked};
    });
    assert.isAtLeast(data.valueTypes.size, 1);
    const checkedTitles = new Set(elements.filter(n => n.checked).map(n => n.title));
    const expectedTitles = new Set([...data.valueTypes].map(type => `${type}`));
    assert.deepEqual(checkedTitles, expectedTitles);

    const uncheckedTitles = new Set(elements.filter(n => !n.checked).map(n => n.title));
    const allTypesTitle = [
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
    ];
    const expectedUncheckedTitles = new Set(allTypesTitle.filter(title => !expectedTitles.has(title)));
    assert.deepEqual(uncheckedTitles, expectedUncheckedTitles);
  });
});
