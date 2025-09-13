// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {EmulateNetworkConditionsStep, SetViewportStep} from './Schema.js';

export interface RecordingSettings {
  viewportSettings?: SetViewportStep;
  networkConditionsSettings?: EmulateNetworkConditionsStep&{
    title?: string,
    i18nTitleKey?: string,
  };
  timeout?: number;
}
