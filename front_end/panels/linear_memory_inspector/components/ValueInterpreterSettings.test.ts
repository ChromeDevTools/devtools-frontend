// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

describeWithEnvironment('ValueInterpreterSettings', () => {
  setupLocaleHooks();

  it('renders the settings', async () => {
    const target = document.createElement('div');
    target.style.width = 'var(--sys-size-30)';
    target.style.height = 'var(--sys-size-30)';
    renderElementIntoDOM(target);

    const valueTypes = new Set([
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
    ]);

    LinearMemoryInspectorComponents.ValueInterpreterSettings.DEFAULT_VIEW(
        {valueTypes, onToggle: () => {}}, undefined, target);

    await assertScreenshot('linear_memory_inspector/value-interpreter-settings.png');
  });
});
