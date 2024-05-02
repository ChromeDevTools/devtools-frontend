// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as InlineEditor from '../../../legacy/components/inline_editor/inline_editor.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const container = document.querySelector('#container');
const picker = document.querySelector<HTMLInputElement>('#picker');

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new InlineEditor.ColorSwatch.ColorSwatch();
document.getElementById('container')?.appendChild(component);
component.renderColor('#f06');
container?.insertBefore(component, picker);

picker?.addEventListener('input', e => {
  component.renderColor((e.target as HTMLInputElement).value);
});

component.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, () => picker?.click());
