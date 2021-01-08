
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as InlineEditor from '../../inline_editor/inline_editor.js';

const container = document.querySelector('#container');
const picker = document.querySelector<HTMLInputElement>('#picker');

await ComponentHelpers.ComponentServerSetup.setup();

const component = new InlineEditor.ColorSwatch.ColorSwatch();
document.getElementById('container')?.appendChild(component);
component.renderColor('#f06');
container?.insertBefore(component, picker);

picker?.addEventListener('input', e => {
  component.renderColor((e.target as HTMLInputElement).value);
});

component.addEventListener('swatch-click', () => picker?.click());
