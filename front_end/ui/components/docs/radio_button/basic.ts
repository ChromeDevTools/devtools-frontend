// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../legacy/legacy.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
function radioExample({name, tabbable, disabled}: {
  name: string,
  tabbable: boolean,
  disabled: boolean,
}): HTMLElement {
  const example = document.createElement('fieldset');
  example.style.marginTop = '20px';
  const legend = document.createElement('legend');
  legend.textContent = name;
  const list = document.createElement('div');
  for (let i = 0; i < 3; ++i) {
    const {label, radio} = UI.UIUtils.createRadioButton(name, `Option #${i + 1}`, name);
    radio.tabIndex = tabbable ? 0 : -1;
    radio.disabled = disabled;
    radio.checked = i === 0;
    list.append(label);
  }
  example.append(legend, list);
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
  container.appendChild(radioExample({name: 'basic', tabbable: true, disabled: false}));

  // Not tab reachable
  container.appendChild(radioExample({name: 'not-table-reachable', tabbable: false, disabled: false}));

  // Disabled
  container.appendChild(radioExample({name: 'disabled', tabbable: true, disabled: true}));
}

init();
