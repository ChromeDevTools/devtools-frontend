// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new RecorderComponents.ControlButton.ControlButton();
component.shape = 'circle';
component.label = 'ControlButton';
document.getElementById('container')?.appendChild(component);
