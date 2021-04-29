// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum AdornerCategories {
  SECURITY = 'Security',
  LAYOUT = 'Layout',
  DEFAULT = 'Default',
}

export interface AdornerSetting {
  adorner: string;
  isEnabled: boolean;
}

export type AdornerSettingsMap = Map<string, boolean>;

// This enum-like const object serves as the authoritative registry for all the
// adorners available.
export const AdornerRegistry = {
  GRID: {
    name: 'grid',
    category: AdornerCategories.LAYOUT,
    enabledByDefault: true,
  },
  FLEX: {
    name: 'flex',
    category: AdornerCategories.LAYOUT,
    enabledByDefault: true,
  },
  AD: {
    name: 'ad',
    category: AdornerCategories.SECURITY,
    enabledByDefault: true,
  },
  SCROLL_SNAP: {
    name: 'scroll-snap',
    category: AdornerCategories.LAYOUT,
    enabledByDefault: true,
  },
} as const;

export const DefaultAdornerSettings = Object.values(AdornerRegistry).map(({name, enabledByDefault}) => ({
                                                                           adorner: name,
                                                                           isEnabled: enabledByDefault,
                                                                         }));

interface SettingStore<Setting> {
  get(): Setting;
  set(setting: Setting): void;
}

export class AdornerManager {
  private adornerSettings: AdornerSettingsMap = new Map();
  private settingStore: SettingStore<AdornerSetting[]>;

  constructor(settingStore: SettingStore<AdornerSetting[]>) {
    this.settingStore = settingStore;
    this.syncSettings();
  }

  updateSettings(settings: AdornerSettingsMap): void {
    this.adornerSettings = settings;
    this.persistCurrentSettings();
  }

  getSettings(): Readonly<AdornerSettingsMap> {
    return this.adornerSettings;
  }

  isAdornerEnabled(adornerText: string): boolean {
    return this.adornerSettings.get(adornerText) || false;
  }

  private persistCurrentSettings(): void {
    const settingList = [];
    for (const [adorner, isEnabled] of this.adornerSettings) {
      settingList.push({adorner, isEnabled});
    }
    this.settingStore.set(settingList);
  }

  private loadSettings(): void {
    const settingList = this.settingStore.get();
    for (const setting of settingList) {
      this.adornerSettings.set(setting.adorner, setting.isEnabled);
    }
  }

  private syncSettings(): void {
    this.loadSettings();

    // Prune outdated adorners and add new ones to the persistence.
    const outdatedAdorners = new Set(this.adornerSettings.keys());
    for (const {adorner, isEnabled} of DefaultAdornerSettings) {
      outdatedAdorners.delete(adorner);
      if (!this.adornerSettings.has(adorner)) {
        this.adornerSettings.set(adorner, isEnabled);
      }
    }
    for (const outdatedAdorner of outdatedAdorners) {
      this.adornerSettings.delete(outdatedAdorner);
    }

    this.persistCurrentSettings();
  }
}
