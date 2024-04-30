// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CSSOverviewComponents from '../../../../panels/css_overview/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView();

document.getElementById('container')?.appendChild(component);
