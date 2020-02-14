// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/** @enum {number} */
export const CPUThrottlingRates = {
  NoThrottling: 1,
  MidTierMobile: 4,
  LowEndMobile: 6,
};

/** @type {!Conditions} */
export const NoThrottlingConditions = {
  title: SDK.NetworkManager.NoThrottlingConditions.title,
  description: Common.UIString.UIString('No throttling'),
  network: SDK.NetworkManager.NoThrottlingConditions,
  cpuThrottlingRate: CPUThrottlingRates.NoThrottling,
};

/** @type {!Conditions} */
export const OfflineConditions = {
  title: SDK.NetworkManager.OfflineConditions.title,
  description: Common.UIString.UIString('No internet connectivity'),
  network: SDK.NetworkManager.OfflineConditions,
  cpuThrottlingRate: CPUThrottlingRates.NoThrottling,
};

/** @type {!Conditions} */
export const LowEndMobileConditions = {
  title: Common.UIString.UIString('Low-end mobile'),
  description: Common.UIString.UIString('Slow 3G & 6x CPU slowdown'),
  network: SDK.NetworkManager.Slow3GConditions,
  cpuThrottlingRate: CPUThrottlingRates.LowEndMobile,
};

/** @type {!Conditions} */
export const MidTierMobileConditions = {
  title: Common.UIString.UIString('Mid-tier mobile'),
  description: Common.UIString.UIString('Fast 3G & 4x CPU slowdown'),
  network: SDK.NetworkManager.Fast3GConditions,
  cpuThrottlingRate: CPUThrottlingRates.MidTierMobile,
};

/** @type {!PlaceholderConditions} */
export const CustomConditions = {
  title: Common.UIString.UIString('Custom'),
  description: Common.UIString.UIString('Check Network and Performance panels'),
};

/** @type {!Array.<!Conditions>} */
export const mobilePresets = [MidTierMobileConditions, LowEndMobileConditions, CustomConditions];

/** @type {!Array.<!Conditions>} */
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

/**
 * @typedef {{
  *   title: string,
  *   description: string,
  *   network: !SDK.NetworkManager.Conditions,
  *   cpuThrottlingRate: !CPUThrottlingRates
  * }}
  **/
export let Conditions;

/** @typedef {!{title: string, items: !Array<!SDK.NetworkManager.Conditions>}} */
export let NetworkThrottlingConditionsGroup;

/** @typedef {!{title: string, items: !Array<!Conditions|!PlaceholderConditions>}} */
export let MobileThrottlingConditionsGroup;

/** @typedef {!Array<?Conditions|!PlaceholderConditions>} */
export let ConditionsList;

/**
 * @typedef {{
  *   title: string,
  *   description: string
  * }}
  **/
export let PlaceholderConditions;
