// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new RecorderComponents.RecordingListView.RecordingListView();
component.recordings = [
  {
    storageName: '1',
    name: 'Title 1',
  },
  {
    storageName: '2',
    name: 'Title 2',
  },
];
const container = document.getElementById('container');
if (container) {
  component.show(container);
}
