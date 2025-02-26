// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

const UIStrings = {
  /**
   *@description Text for no network throttling
   */
  noThrottling: 'No CPU and no network throttling',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  noInternetConnectivity: 'No internet connectivity',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  lowTierMobile: 'Low-tier mobile',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  slowGXCpuSlowdown: 'Slow 3G & 6x CPU slowdown',
  /**
   * @description Text in Throttling Presets of the Network panel
   * @example {2.2} PH1
   */
  slowGXCpuSlowdownCalibrated: 'Slow 3G & {PH1}x CPU slowdown',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  midtierMobile: 'Mid-tier mobile',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  fastGXCpuSlowdown: 'Fast 3G & 4x CPU slowdown',
  /**
   * @description Text in Throttling Presets of the Network panel
   * @example {2.2} PH1
   */
  fastGXCpuSlowdownCalibrated: 'Fast 3G & {PH1}x CPU slowdown',
  /**
   *@description Text in Network Throttling Selector of the Network panel
   */
  custom: 'Custom',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  checkNetworkAndPerformancePanels: 'Check Network and Performance panels',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/ThrottlingPresets.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ThrottlingPresets {
  static getNoThrottlingConditions(): Conditions {
    const title = typeof SDK.NetworkManager.NoThrottlingConditions.title === 'function' ?
        SDK.NetworkManager.NoThrottlingConditions.title() :
        SDK.NetworkManager.NoThrottlingConditions.title;
    return {
      title,
      description: i18nString(UIStrings.noThrottling),
      network: SDK.NetworkManager.NoThrottlingConditions,
      cpuThrottlingOption: SDK.CPUThrottlingManager.NoThrottlingOption,
      jslogContext: 'no-throttling',
    };
  }

  static getOfflineConditions(): Conditions {
    const title = typeof SDK.NetworkManager.OfflineConditions.title === 'function' ?
        SDK.NetworkManager.OfflineConditions.title() :
        SDK.NetworkManager.OfflineConditions.title;
    return {
      title,
      description: i18nString(UIStrings.noInternetConnectivity),
      network: SDK.NetworkManager.OfflineConditions,
      cpuThrottlingOption: SDK.CPUThrottlingManager.NoThrottlingOption,
      jslogContext: 'offline',
    };
  }

  static getLowEndMobileConditions(): Conditions {
    const useCalibrated = SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption :
                                                SDK.CPUThrottlingManager.LowTierThrottlingOption;
    const description = useCalibrated ?
        i18nString(UIStrings.slowGXCpuSlowdownCalibrated, {PH1: cpuThrottlingOption.rate()}) :
        i18nString(UIStrings.slowGXCpuSlowdown);

    return {
      title: i18nString(UIStrings.lowTierMobile),
      description,
      network: SDK.NetworkManager.Slow3GConditions,
      cpuThrottlingOption,
      jslogContext: 'low-end-mobile',
    };
  }

  static getMidTierMobileConditions(): Conditions {
    const useCalibrated = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption :
                                                SDK.CPUThrottlingManager.MidTierThrottlingOption;
    const description = useCalibrated ?
        i18nString(UIStrings.fastGXCpuSlowdownCalibrated, {PH1: cpuThrottlingOption.rate()}) :
        i18nString(UIStrings.fastGXCpuSlowdown);

    return {
      title: i18nString(UIStrings.midtierMobile),
      description,
      network: SDK.NetworkManager.Slow4GConditions,
      cpuThrottlingOption,
      jslogContext: 'mid-tier-mobile',
    };
  }

  static getCustomConditions(): PlaceholderConditions {
    return {
      title: i18nString(UIStrings.custom),
      description: i18nString(UIStrings.checkNetworkAndPerformancePanels),
      jslogContext: 'custom',
    };
  }

  static getMobilePresets(): Array<Conditions|PlaceholderConditions> {
    return [
      ThrottlingPresets.getMidTierMobileConditions(),
      ThrottlingPresets.getLowEndMobileConditions(),
      ThrottlingPresets.getCustomConditions(),
    ];
  }

  static getAdvancedMobilePresets(): Conditions[] {
    return [
      ThrottlingPresets.getOfflineConditions(),
    ];
  }

  static getRecommendedNetworkPreset(rtt: number): SDK.NetworkManager.Conditions|null {
    const RTT_COMPARISON_THRESHOLD = 200;
    const RTT_MINIMUM = 60;

    if (!Number.isFinite(rtt)) {
      return null;
    }

    if (rtt < RTT_MINIMUM) {
      return null;
    }

    let closestPreset: SDK.NetworkManager.Conditions|null = null;
    let smallestDiff = Infinity;
    for (const preset of ThrottlingPresets.networkPresets) {
      const {targetLatency} = preset;
      if (!targetLatency) {
        continue;
      }

      const diff = Math.abs(targetLatency - rtt);
      if (diff > RTT_COMPARISON_THRESHOLD) {
        continue;
      }

      if (smallestDiff < diff) {
        continue;
      }

      closestPreset = preset;
      smallestDiff = diff;
    }

    return closestPreset;
  }

  static networkPresets: SDK.NetworkManager.Conditions[] = [
    SDK.NetworkManager.Fast4GConditions,
    SDK.NetworkManager.Slow4GConditions,
    SDK.NetworkManager.Slow3GConditions,
    SDK.NetworkManager.OfflineConditions,
  ];

  static cpuThrottlingPresets: SDK.CPUThrottlingManager.CPUThrottlingOption[] = [
    SDK.CPUThrottlingManager.NoThrottlingOption,
    SDK.CPUThrottlingManager.MidTierThrottlingOption,
    SDK.CPUThrottlingManager.LowTierThrottlingOption,
    SDK.CPUThrottlingManager.ExtraSlowThrottlingOption,
    SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption,
    SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption,
  ];
}

// @ts-expect-error exported for Tests.js
globalThis.MobileThrottling = globalThis.MobileThrottling || {};
// @ts-expect-error exported for Tests.js
globalThis.MobileThrottling.networkPresets = ThrottlingPresets.networkPresets;

export interface Conditions {
  title: string;
  description: string;
  network: SDK.NetworkManager.Conditions;
  cpuThrottlingOption: SDK.CPUThrottlingManager.CPUThrottlingOption;
  jslogContext?: string;
}

export interface NetworkThrottlingConditionsGroup {
  title: string;
  items: SDK.NetworkManager.Conditions[];
}

export interface MobileThrottlingConditionsGroup {
  title: string;
  items: Array<Conditions|PlaceholderConditions>;
}

export type ConditionsList = Array<Conditions|PlaceholderConditions|null>;

export interface PlaceholderConditions {
  title: string;
  description: string;
  jslogContext?: string;
}
