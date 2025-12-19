// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface AdornerSetting {
  adorner: string;
  isEnabled: boolean;
}

type AdornerSettingsMap = Map<string, boolean>;

export enum RegisteredAdorners {
  AD = 'ad',
  CONTAINER = 'container',
  FLEX = 'flex',
  GRID = 'grid',
  GRID_LANES = 'grid-lanes',
  MEDIA = 'media',
  POPOVER = 'popover',
  REVEAL = 'reveal',
  SCROLL = 'scroll',
  SCROLL_SNAP = 'scroll-snap',
  SLOT = 'slot',
  VIEW_SOURCE = 'view-source',
  STARTING_STYLE = 'starting-style',
  SUBGRID = 'subgrid',
  TOP_LAYER = 'top-layer',
}

interface SettingStore<Setting> {
  get(): Setting;
  set(setting: Setting): void;
}

export class AdornerManager {
  #adornerSettings: AdornerSettingsMap = new Map();
  #settingStore: SettingStore<AdornerSetting[]>;

  constructor(settingStore: SettingStore<AdornerSetting[]>) {
    this.#settingStore = settingStore;
    this.#syncSettings();
  }

  updateSettings(settings: AdornerSettingsMap): void {
    this.#adornerSettings = settings;
    this.#persistCurrentSettings();
  }

  getSettings(): Readonly<AdornerSettingsMap> {
    return this.#adornerSettings;
  }

  isAdornerEnabled(adornerText: string): boolean {
    return this.#adornerSettings.get(adornerText) || false;
  }

  #persistCurrentSettings(): void {
    const settingList = [];
    for (const [adorner, isEnabled] of this.#adornerSettings) {
      settingList.push({adorner, isEnabled});
    }
    this.#settingStore.set(settingList);
  }

  #loadSettings(): void {
    const settingList = this.#settingStore.get();
    for (const setting of settingList) {
      this.#adornerSettings.set(setting.adorner, setting.isEnabled);
    }
  }

  #syncSettings(): void {
    this.#loadSettings();

    // Prune outdated adorners and add new ones to the persistence.
    const outdatedAdorners = new Set(this.#adornerSettings.keys());
    for (const adorner of Object.values(RegisteredAdorners)) {
      outdatedAdorners.delete(adorner);
      if (!this.#adornerSettings.has(adorner)) {
        // Only the MEDIA adorner is disabled by default.
        const isEnabled = adorner !== RegisteredAdorners.MEDIA;
        this.#adornerSettings.set(adorner, isEnabled);
      }
    }
    for (const outdatedAdorner of outdatedAdorners) {
      this.#adornerSettings.delete(outdatedAdorner);
    }

    this.#persistCurrentSettings();
  }
}
