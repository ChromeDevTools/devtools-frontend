// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getTestRunnerConfig() {
  if (!process.env.TEST_RUNNER_JSON_CONFIG) {
    return null;
  }

  try {
    return JSON.parse(process.env.TEST_RUNNER_JSON_CONFIG);
  } catch {
    // Return an empty object so any lookups return undefined
    return {};
  }
}

export function getTestRunnerConfigSetting<T>(settingKey: string, fallbackValue: T): T {
  const config = getTestRunnerConfig();
  if (config && config.hasOwnProperty(settingKey)) {
    return config[settingKey];
  }
  return fallbackValue;
}
