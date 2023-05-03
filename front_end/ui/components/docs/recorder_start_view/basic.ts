// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const startView = new RecorderComponents.StartView.StartView();
document.getElementById('container')?.appendChild(startView);
