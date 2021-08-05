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

export function getTestRunnerConfigSetting<T>(settingKey: string, fallbackValue: T): T;
export function getTestRunnerConfigSetting<T>(settingKey: string, fallbackValue: T|undefined): T|undefined {
  const config = getTestRunnerConfig();
  if (config && config.hasOwnProperty(settingKey)) {
    return config[settingKey] as T;
  }
  if (fallbackValue !== undefined) {
    return fallbackValue;
  }
  return undefined;
}

export function requireTestRunnerConfigSetting<T>(settingKey: string, errorMessage?: string): T {
  const config = getTestRunnerConfig();
  if (config[settingKey] === undefined) {
    throw new Error(errorMessage || `Test runner error: could not find required setting ${settingKey}`);
  }

  return config[settingKey] as T;
}
