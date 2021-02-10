// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new Components.IconButton.IconButton();

component.data = {
  clickHandler: (): void => {},
  groups: [{iconName: 'feedback_thin_16x16_icon', iconColor: 'black', text: '1 item'}],
};

document.getElementById('container')?.appendChild(component);

const component2 = new Components.IconButton.IconButton();

component2.data = {
  clickHandler: (): void => {},
  groups: [
    {iconName: 'feedback_thin_16x16_icon', iconColor: 'blue', text: 'Test'},
    {iconName: 'warning_icon', iconColor: '', text: '1'},
  ],
};

document.getElementById('container')?.appendChild(component2);
