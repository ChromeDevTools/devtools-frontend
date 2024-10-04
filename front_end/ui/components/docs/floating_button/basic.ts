// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as FloatingButton from '../../floating_button/floating_button.js';

await FrontendHelpers.initializeGlobalVars();

const component = new FloatingButton.FloatingButton.FloatingButton({
  iconName: 'smart-assistant',
});

const componentDisabled = new FloatingButton.FloatingButton.FloatingButton({
  iconName: 'smart-assistant',
  disabled: true,
});

document.getElementById('container')?.appendChild(component);
document.getElementById('container')?.appendChild(componentDisabled);
