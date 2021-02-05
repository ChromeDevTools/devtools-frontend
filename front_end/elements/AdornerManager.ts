// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum AdornerCategories {
  Security = 'Security',
  Layout = 'Layout',
  Default = 'Default',
}

export interface AdornerSetting {
  adorner: string;
  isEnabled: boolean;
}

type AdornerSettingsMap = Map<string, boolean>;

// This array serves as the authoritative source for all the adorners
// that can be configured.
export const DefaultAdornerSettings = [
  {
    adorner: 'Grid',
    isEnabled: true,
  },
  {
    adorner: 'Flex',
    isEnabled: true,
  },
  {
    adorner: 'Ad',
    isEnabled: true,
  },
];

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
