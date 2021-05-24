// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const fs = require('fs');

const DEVTOOLS_SETTINGS_LOCATION = path.join(process.cwd(), '.vscode', 'devtools-workspace-settings.json');
const VSCODE_SETTINGS_LOCATION = path.join(process.cwd(), '.vscode', 'settings.json');

// If there are no settings to copy and paste, or the user has opted out of updates,
// return and do nothing.
if (!fs.existsSync(DEVTOOLS_SETTINGS_LOCATION) || Boolean(process.env['SKIP_VSCODE_SETTINGS_SYNC'])) {
  return;
}

try {
  const devtoolsSettings = require(DEVTOOLS_SETTINGS_LOCATION);
  let preExistingSettings = {};
  if (fs.existsSync(VSCODE_SETTINGS_LOCATION)) {
    preExistingSettings = require(VSCODE_SETTINGS_LOCATION);
  }

  const updatedSettings = {
    ...devtoolsSettings,
    // Any setting specified by the engineer will always take precedence over the defaults
    ...preExistingSettings,
  };

  fs.writeFileSync(VSCODE_SETTINGS_LOCATION, JSON.stringify(updatedSettings, null, 2));
} catch (err) {
  console.warn('Unable to update VSCode settings - skipping');
  console.warn(err.stack);
}
