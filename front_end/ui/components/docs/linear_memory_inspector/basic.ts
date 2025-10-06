// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspectorComponents from '../../../../panels/linear_memory_inspector/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../legacy/legacy.js';
import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const {render, html} = Lit;
const {widgetConfig} = UI.Widget;

const array = [];
const string = 'Hello this is a string from the memory buffer!';

for (let i = 0; i < string.length; ++i) {
  array.push(string.charCodeAt(i));
}

for (let i = -1000; i < 1000; ++i) {
  array.push(i);
}

const memory = new Uint8Array(array);

const container = document.getElementById('container');
if (container) {
  render(
      html`
    <devtools-widget .widgetConfig=${
          widgetConfig(LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector, {
            memory,
            address: 0,
            memoryOffset: 0,
            outerMemoryLength: memory.length,
          })}>
    </devtools-widget>
  `,
      container);
}
