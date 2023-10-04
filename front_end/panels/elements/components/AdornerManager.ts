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

export interface RegisteredAdorner {
  readonly name: string;
  readonly category: AdornerCategories;
  readonly enabledByDefault: boolean;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RegisteredAdorners {
  GRID = 'grid',
  SUBGRID = 'subgrid',
  FLEX = 'flex',
  AD = 'ad',
  SCROLL_SNAP = 'scroll-snap',
  CONTAINER = 'container',
  SLOT = 'slot',
  TOP_LAYER = 'top-layer',
  REVEAL = 'reveal',
  MEDIA = 'media',
}

// This enum-like const object serves as the authoritative registry for all the
// adorners available.
export function getRegisteredAdorner(which: RegisteredAdorners): RegisteredAdorner {
  switch (which) {
    case RegisteredAdorners.GRID:
      return {
        name: 'grid',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.SUBGRID:
      return {
        name: 'subgrid',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.FLEX:
      return {
        name: 'flex',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.AD:
      return {
        name: 'ad',
        category: AdornerCategories.SECURITY,
        enabledByDefault: true,
      };
    case RegisteredAdorners.SCROLL_SNAP:
      return {
        name: 'scroll-snap',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.CONTAINER:
      return {
        name: 'container',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.SLOT:
      return {
        name: 'slot',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.TOP_LAYER:
      return {
        name: 'top-layer',
        category: AdornerCategories.LAYOUT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.REVEAL:
      return {
        name: 'reveal',
        category: AdornerCategories.DEFAULT,
        enabledByDefault: true,
      };
    case RegisteredAdorners.MEDIA:
      return {
        name: 'media',
        category: AdornerCategories.DEFAULT,
        enabledByDefault: false,
      };
  }
}

let adornerNameToCategoryMap: Map<string, AdornerCategories>|undefined = undefined;

function getCategoryFromAdornerName(name: string): AdornerCategories {
  if (!adornerNameToCategoryMap) {
    adornerNameToCategoryMap = new Map();
    for (const {name, category} of Object.values(RegisteredAdorners).map(getRegisteredAdorner)) {
      adornerNameToCategoryMap.set(name, category);
    }
  }
  return adornerNameToCategoryMap.get(name) || AdornerCategories.DEFAULT;
}

export const DefaultAdornerSettings: AdornerSetting[] =
    Object.values(RegisteredAdorners).map(getRegisteredAdorner).map(({name, enabledByDefault}) => ({
                                                                      adorner: name,
                                                                      isEnabled: enabledByDefault,
                                                                    }));

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
    for (const {adorner, isEnabled} of DefaultAdornerSettings) {
      outdatedAdorners.delete(adorner);
      if (!this.#adornerSettings.has(adorner)) {
        this.#adornerSettings.set(adorner, isEnabled);
      }
    }
    for (const outdatedAdorner of outdatedAdorners) {
      this.#adornerSettings.delete(outdatedAdorner);
    }

    this.#persistCurrentSettings();
  }
}

const OrderedAdornerCategories = [
  AdornerCategories.SECURITY,
  AdornerCategories.LAYOUT,
  AdornerCategories.DEFAULT,
];

// Use idx + 1 for the order to avoid JavaScript's 0 == false issue
export const AdornerCategoryOrder = new Map(OrderedAdornerCategories.map((category, idx) => [category, idx + 1]));

export function compareAdornerNamesByCategory(nameA: string, nameB: string): number {
  const orderA = AdornerCategoryOrder.get(getCategoryFromAdornerName(nameA)) || Number.POSITIVE_INFINITY;
  const orderB = AdornerCategoryOrder.get(getCategoryFromAdornerName(nameB)) || Number.POSITIVE_INFINITY;
  return orderA - orderB;
}
