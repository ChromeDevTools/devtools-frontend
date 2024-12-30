// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../legacy/legacy.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
function sliderExample({min, max, tabIndex, disabled}: {
  min: number,
  max: number,
  tabIndex: number,
  disabled: boolean,
}): HTMLElement {
  const example = document.createElement('div');
  example.style.marginTop = '20px';
  const minExplanation = document.createElement('div');
  const maxExplanation = document.createElement('div');
  const valueExplanation = document.createElement('div');
  const disabledExplanation = document.createElement('div');
  const tabbableExplanation = document.createElement('div');
  const component = UI.UIUtils.createSlider(min, max, tabIndex);
  component.disabled = disabled;
  minExplanation.textContent = `min: ${min}`;
  maxExplanation.textContent = `max: ${max}`;
  valueExplanation.textContent = `value: ${component.value}`;
  disabledExplanation.textContent = `is disabled? ${component.disabled}`;
  tabbableExplanation.textContent = `is tabbable? ${component.tabIndex >= 0}`;

  component.addEventListener('change', () => {
    valueExplanation.textContent = `value: ${component.value}`;
  });
  example.appendChild(component);
  example.appendChild(minExplanation);
  example.appendChild(maxExplanation);
  example.appendChild(valueExplanation);
  example.appendChild(disabledExplanation);
  example.appendChild(tabbableExplanation);
  return example;
}

function init(): void {
  const container = document.getElementById('container');
  if (!container) {
    return;
  }

  container.style.padding = '42px 42px';
  container.style.margin = '42px 42px';
  container.style.border = '1px solid rgb(0 0 0 / 20%)';

  // Basic
  container.appendChild(sliderExample({min: 0, max: 100, tabIndex: 0, disabled: false}));

  // Not tab reachable
  container.appendChild(sliderExample({min: 0, max: 100, tabIndex: -1, disabled: false}));

  // Disabled
  container.appendChild(sliderExample({min: 0, max: 100, tabIndex: 0, disabled: true}));
}

init();
