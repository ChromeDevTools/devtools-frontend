// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';

// Export Target as Page for compatibility with existing code
export type Page = SDK.Target.Target;

// Export Target as BrowserContext for now
export type BrowserContext = SDK.Target.Target;

// Export TargetManager as Browser for now
export type Browser = SDK.TargetManager.TargetManager;
