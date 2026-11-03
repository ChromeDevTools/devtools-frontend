// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AiUtils from '../ai-utils/ai-utils.js';

import * as AiCodeGeneration from './AiCodeGeneration.js';

export function debugLog(...log: unknown[]): void {
  AiUtils.Debug.debugCodeGenCompleteLog(...log);
}

export {
  AiCodeGeneration,
};
