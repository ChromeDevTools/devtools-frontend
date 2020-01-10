// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @enum {number} */
export const CPUThrottlingRates = {
  NoThrottling: 1,
  MidTierMobile: 4,
  LowEndMobile: 6,
};

/** @type {!MobileThrottling.Conditions} */
export const NoThrottlingConditions = {
  title: SDK.NetworkManager.NoThrottlingConditions.title,
  description: Common.UIString('No throttling'),
  network: SDK.NetworkManager.NoThrottlingConditions,
  cpuThrottlingRate: CPUThrottlingRates.NoThrottling,
};

/** @type {!MobileThrottling.Conditions} */
export const OfflineConditions = {
  title: SDK.NetworkManager.OfflineConditions.title,
  description: Common.UIString('No internet connectivity'),
  network: SDK.NetworkManager.OfflineConditions,
  cpuThrottlingRate: CPUThrottlingRates.NoThrottling,
};

/** @type {!MobileThrottling.Conditions} */
export const LowEndMobileConditions = {
  title: Common.UIString('Low-end mobile'),
  description: Common.UIString('Slow 3G & 6x CPU slowdown'),
  network: SDK.NetworkManager.Slow3GConditions,
  cpuThrottlingRate: CPUThrottlingRates.LowEndMobile,
};

/** @type {!MobileThrottling.Conditions} */
export const MidTierMobileConditions = {
  title: Common.UIString('Mid-tier mobile'),
  description: Common.UIString('Fast 3G & 4x CPU slowdown'),
  network: SDK.NetworkManager.Fast3GConditions,
  cpuThrottlingRate: CPUThrottlingRates.MidTierMobile,
};

/** @type {!MobileThrottling.PlaceholderConditions} */
export const CustomConditions = {
  title: Common.UIString('Custom'),
  description: Common.UIString('Check Network and Performance panels'),
};

/** @type {!Array.<!MobileThrottling.Conditions>} */
export const mobilePresets = [MidTierMobileConditions, LowEndMobileConditions, CustomConditions];

/** @type {!Array.<!MobileThrottling.Conditions>} */
export const advancedMobilePresets = [
  OfflineConditions,
];

/** @type {!Array<!SDK.NetworkManager.Conditions>} */
export const networkPresets = [
  SDK.NetworkManager.Fast3GConditions,
  SDK.NetworkManager.Slow3GConditions,
  SDK.NetworkManager.OfflineConditions,
];

/** @type {!Array<!CPUThrottlingRates>} */
export const cpuThrottlingPresets = [
  CPUThrottlingRates.NoThrottling,
  CPUThrottlingRates.MidTierMobile,
  CPUThrottlingRates.LowEndMobile,
];
