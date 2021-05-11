// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const fs = require('fs');

const VSCODE_SETTINGS_LOCATION = path.join(__dirname, '..', '..', '.vscode', 'settings.json');
const DEFAULT_VS_CODE_SETTINGS = {
  'eslint.runtime': 'third_party/node/node.py',
};

let preExistingSettings = {};

if (fs.existsSync(VSCODE_SETTINGS_LOCATION)) {
  preExistingSettings = require(VSCODE_SETTINGS_LOCATION);
}

const updatedSettings = {
  ...DEFAULT_VS_CODE_SETTINGS,
  // Any setting specified by the engineer will always take precedence over the defaults
  ...preExistingSettings,
};

fs.writeFileSync(VSCODE_SETTINGS_LOCATION, JSON.stringify(updatedSettings, null, 2));
