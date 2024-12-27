// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es-modules-import
import * as Dialogs from '../../dialogs/dialogs.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
shortcutDialog.data = {
  shortcuts: [
    {
      title: 'First Shortcut Title',
      bindings: [['Ctrl+E']],
    },
    {
      title: 'Second Shortcut Title',
      bindings: [['Ctrl', 'Enter'], ['F8']],
    },
  ],
};
document.getElementById('container')?.appendChild(shortcutDialog);
