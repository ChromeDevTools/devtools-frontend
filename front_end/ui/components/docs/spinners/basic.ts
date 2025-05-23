
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../spinners/spinners.js';

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = Lit;

await FrontendHelpers.initializeGlobalVars();
await ComponentHelpers.ComponentServerSetup.setup();
const container = document.getElementById('container');

if (!container) {
  throw new Error('No component container found.');
}

Lit.render(html`<devtools-spinner></devtools-spinner>`, container);
