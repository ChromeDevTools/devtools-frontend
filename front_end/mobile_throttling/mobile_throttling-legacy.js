// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as MobileThrottlingModule from './mobile_throttling.js';

self.MobileThrottling = self.MobileThrottling || {};
MobileThrottling = MobileThrottling || {};

/** @constructor */
MobileThrottling.MobileThrottlingSelector = MobileThrottlingModule.MobileThrottlingSelector.MobileThrottlingSelector;

/** @constructor */
MobileThrottling.NetworkPanelIndicator = MobileThrottlingModule.NetworkPanelIndicator.NetworkPanelIndicator;

/** @constructor */
MobileThrottling.NetworkThrottlingSelector = MobileThrottlingModule.NetworkThrottlingSelector.NetworkThrottlingSelector;

/** @constructor */
MobileThrottling.ThrottlingManager = MobileThrottlingModule.ThrottlingManager.ThrottlingManager;

MobileThrottling.ThrottlingManager.Events = MobileThrottlingModule.ThrottlingManager.Events;

/** @constructor */
MobileThrottling.ThrottlingManager.ActionDelegate = MobileThrottlingModule.ThrottlingManager.ActionDelegate;

MobileThrottling.throttlingManager = MobileThrottlingModule.ThrottlingManager.throttlingManager;

/** @enum {number} */
MobileThrottling.CPUThrottlingRates = MobileThrottlingModule.ThrottlingPresets.CPUThrottlingRates;

MobileThrottling.NoThrottlingConditions = MobileThrottlingModule.ThrottlingPresets.NoThrottlingConditions;
MobileThrottling.OfflineConditions = MobileThrottlingModule.ThrottlingPresets.OfflineConditions;
MobileThrottling.LowEndMobileConditions = MobileThrottlingModule.ThrottlingPresets.LowEndMobileConditions;
MobileThrottling.MidTierMobileConditions = MobileThrottlingModule.ThrottlingPresets.MidTierMobileConditions;
MobileThrottling.CustomConditions = MobileThrottlingModule.ThrottlingPresets.CustomConditions;

MobileThrottling.mobilePresets = MobileThrottlingModule.ThrottlingPresets.mobilePresets;
MobileThrottling.advancedMobilePresets = MobileThrottlingModule.ThrottlingPresets.advancedMobilePresets;
MobileThrottling.networkPresets = MobileThrottlingModule.ThrottlingPresets.networkPresets;
MobileThrottling.cpuThrottlingPresets = MobileThrottlingModule.ThrottlingPresets.cpuThrottlingPresets;

/** @constructor */
MobileThrottling.ThrottlingSettingsTab = MobileThrottlingModule.ThrottlingSettingsTab.ThrottlingSettingsTab;

MobileThrottling.throughputText = MobileThrottlingModule.ThrottlingSettingsTab.throughputText;
