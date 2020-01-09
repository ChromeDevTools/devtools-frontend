// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDKModule from './browser_sdk.js';

self.BrowserSDK = self.BrowserSDK || {};
BrowserSDK = BrowserSDK || {};

/** @constructor */
BrowserSDK.LogManager = BrowserSDKModule.LogManager.LogManager;

BrowserSDK.logManager = BrowserSDKModule.logManager;
