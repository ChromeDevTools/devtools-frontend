// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const fs = require('fs');

const DEVTOOLS_SETTINGS_LOCATION = path.join(process.cwd(), '.vscode', 'devtools-workspace-settings.json');
const VSCODE_SETTINGS_LOCATION = path.join(process.cwd(), '.vscode', 'settings.json');

if (!fs.existsSync(DEVTOOLS_SETTINGS_LOCATION)) {
  // If there are no settings to copy and paste, return and do nothing.
  return;
}
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
