// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  type SetViewportStep,
  type EmulateNetworkConditionsStep,
} from './Schema.js';

export interface RecordingSettings {
  viewportSettings?: SetViewportStep;
  networkConditionsSettings?: EmulateNetworkConditionsStep&{
    title?: string,
    i18nTitleKey?: string,
  };
  timeout?: number;
}
