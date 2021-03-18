// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getTestRunnerConfig() {
  try {
    return JSON.parse(process.env.TEST_RUNNER_JSON_CONFIG);
  } catch {
    // Return an empty object so any lookups return undefined
    return {};
  }
}
function getTestRunnerConfigSetting(settingKey, fallbackValue) {
  const config = getTestRunnerConfig();
  return config[settingKey] === undefined ? fallbackValue : config[settingKey];
}

module.exports = {getTestRunnerConfigSetting};
