// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();
async function initializeGlobalActions(): Promise<void> {
  const UI = await import('../../../../../front_end/ui/legacy/legacy.js');
  const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
  UI.ShortcutRegistry.ShortcutRegistry.instance({
    forceNew: true,
    actionRegistry,
  });
}

await initializeGlobalActions();

const component1 = new RecorderComponents.CreateRecordingView.CreateRecordingView();
document.getElementById('container')?.appendChild(component1);

const component2 = new RecorderComponents.CreateRecordingView.CreateRecordingView();
document.getElementById('container')?.appendChild(component2);
component2.shadowRoot?.querySelector('devtools-control-button')?.click();
