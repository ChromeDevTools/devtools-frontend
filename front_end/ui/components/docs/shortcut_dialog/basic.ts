// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
shortcutDialog.data = {
  shortcuts: [
    {
      title: 'First Shortcut Title',
      bindings: ['Ctrl+E'],
    },
    {
      title: 'Second Shortcut Title',
      bindings: ['Ctrl+Enter', 'F8'],
    },
  ],
};
document.getElementById('container')?.appendChild(shortcutDialog);
