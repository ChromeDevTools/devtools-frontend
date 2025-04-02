// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Dialogs from '../../dialogs/dialogs.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
shortcutDialog.data = {
  shortcuts: [
    {
      title: 'First Shortcut Title',
      rows: [[{key: 'Ctrl'}, {key: 'E'}]],
    },
    {
      title: 'Second Shortcut Title',
      rows: [[{key: 'F8'}]],
    },
  ],
};
document.getElementById('container')?.appendChild(shortcutDialog);
