// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new Components.CounterButton.CounterButton();

component.data = {
  clickHandler: (): void => {},
  counters: [{iconName: 'feedback_thin_16x16_icon', iconColor: 'black', count: 12}],
};

document.getElementById('container')?.appendChild(component);

const component2 = new Components.CounterButton.CounterButton();

component2.data = {
  clickHandler: (): void => {},
  counters: [
    {iconName: 'feedback_thin_16x16_icon', iconColor: 'blue', count: 12},
    {iconName: 'warning_icon', iconColor: '', count: 1},
  ],
};

document.getElementById('container')?.appendChild(component2);
