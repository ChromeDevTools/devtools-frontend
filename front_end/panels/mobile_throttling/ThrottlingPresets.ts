// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

const UIStrings = {
  /**
   *@description Text for no network throttling
   */
  noThrottling: 'No throttling',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  noInternetConnectivity: 'No internet connectivity',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  lowendMobile: 'Low-end mobile',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  slowGXCpuSlowdown: 'Slow 3G & 6x CPU slowdown',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  midtierMobile: 'Mid-tier mobile',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  fastGXCpuSlowdown: 'Fast 3G & 4x CPU slowdown',
  /**
   *@description Text in Network Throttling Selector of the Network panel
   */
  custom: 'Custom',
  /**
   *@description Text in Throttling Presets of the Network panel
   */
  checkNetworkAndPerformancePanels: 'Check Network and Performance panels',
};

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
      cpuThrottlingRate: SDK.CPUThrottlingManager.CPUThrottlingRates.NoThrottling,
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
      cpuThrottlingRate: SDK.CPUThrottlingManager.CPUThrottlingRates.NoThrottling,
      jslogContext: 'offline',
    };
  }

  static getLowEndMobileConditions(): Conditions {
    return {
      title: i18nString(UIStrings.lowendMobile),
      description: i18nString(UIStrings.slowGXCpuSlowdown),
      network: SDK.NetworkManager.Slow3GConditions,
      cpuThrottlingRate: SDK.CPUThrottlingManager.CPUThrottlingRates.LowEndMobile,
      jslogContext: 'low-end-mobile',
    };
  }

  static getMidTierMobileConditions(): Conditions {
    return {
      title: i18nString(UIStrings.midtierMobile),
      description: i18nString(UIStrings.fastGXCpuSlowdown),
      network: SDK.NetworkManager.Fast3GConditions,
      cpuThrottlingRate: SDK.CPUThrottlingManager.CPUThrottlingRates.MidTierMobile,
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

  static getMobilePresets(): (Conditions|PlaceholderConditions)[] {
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

  static networkPresets: SDK.NetworkManager.Conditions[] = [
    SDK.NetworkManager.Fast3GConditions,
    SDK.NetworkManager.Slow3GConditions,
    SDK.NetworkManager.OfflineConditions,
  ];

  static cpuThrottlingPresets: SDK.CPUThrottlingManager.CPUThrottlingRates[] = [
    SDK.CPUThrottlingManager.CPUThrottlingRates.NoThrottling,
    SDK.CPUThrottlingManager.CPUThrottlingRates.MidTierMobile,
    SDK.CPUThrottlingManager.CPUThrottlingRates.LowEndMobile,
  ];
}

// @ts-ignore exported for Tests.js
globalThis.MobileThrottling = globalThis.MobileThrottling || {};
// @ts-ignore exported for Tests.js
globalThis.MobileThrottling.networkPresets = ThrottlingPresets.networkPresets;

export interface Conditions {
  title: string;
  description: string;
  network: SDK.NetworkManager.Conditions;
  cpuThrottlingRate: number;
  jslogContext?: string;
}

export interface NetworkThrottlingConditionsGroup {
  title: string;
  items: SDK.NetworkManager.Conditions[];
}

export interface MobileThrottlingConditionsGroup {
  title: string;
  items: (Conditions|PlaceholderConditions)[];
}

export type ConditionsList = (Conditions|PlaceholderConditions|null)[];

export interface PlaceholderConditions {
  title: string;
  description: string;
  jslogContext?: string;
}
