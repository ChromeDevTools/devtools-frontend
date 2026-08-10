// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

export interface SettingUIDescriptor {
  /**
   * The category with which the setting is displayed in the UI.
   */
  category?: Common.SettingRegistration.SettingCategory;
  /**
   * Used to sort on screen the settings that belong to the same category.
   */
  order?: number;
  /**
   * The title with which the setting is shown on screen.
   */
  title?: () => Platform.UIString.LocalizedString;
  /**
   * Words used to find a setting in the Command Menu.
   */
  tags?: Array<() => Platform.UIString.LocalizedString>;
  /**
   * The possible values the setting can have, each with a description composed of a title and an optional text.
   */
  options?: Common.SettingRegistration.SettingExtensionOption[];
  /**
   * Whether DevTools must be reloaded for a change in the setting to take effect.
   */
  reloadRequired?: boolean;
  /**
   * See {@link LearnMore} for more info.
   */
  learnMore?: Common.SettingRegistration.LearnMore;
}

export interface RegisteredSettingUI {
  descriptor: Common.Settings.SettingDescriptor<unknown>;
  uiDescriptor: SettingUIDescriptor;
}

const registeredSettings = new Map<string, RegisteredSettingUI>();

export function register(
    settingDescriptor: Common.Settings.SettingDescriptor<unknown>,
    settingUIDescriptor: SettingUIDescriptor,
    ): void {
  const settingName = settingDescriptor.name;
  if (registeredSettings.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  Common.SettingRegistration.registerCategoryOrder(settingUIDescriptor.category, settingUIDescriptor.order);
  registeredSettings.set(settingName, {descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor});
}

export function getRegisteredSettings(): readonly RegisteredSettingUI[] {
  const combined = new Map<string, RegisteredSettingUI>();
  for (const legacy of Common.SettingRegistration.getRegisteredSettings()) {
    combined.set(legacy.settingName, {
      descriptor: {
        name: legacy.settingName,
        type: legacy.settingType,
        defaultValue: legacy.defaultValue,
        storageType: legacy.storageType,
      },
      uiDescriptor: {
        category: legacy.category,
        order: legacy.order,
        title: legacy.title,
        tags: legacy.tags,
        options: legacy.options,
        reloadRequired: legacy.reloadRequired,
        learnMore: legacy.learnMore,
      },
    });
  }

  for (const [name, registeredUI] of registeredSettings) {
    combined.set(name, registeredUI);
  }

  return Array.from(combined.values());
}

export interface SimpleSettingOption {
  value: string|boolean;
  title: Platform.UIString.LocalizedString;
  text?: Platform.UIString.LocalizedString|string;
  raw?: boolean;
}

export class SettingUI {
  readonly #raw: SettingUIDescriptor;

  constructor(raw: SettingUIDescriptor) {
    this.#raw = raw;
  }

  get title(): Platform.UIString.LocalizedString {
    return this.#raw.title?.() ?? ('' as Platform.UIString.LocalizedString);
  }

  get category(): Common.SettingRegistration.SettingCategory|null {
    return this.#raw.category ?? null;
  }

  get order(): number|null {
    return this.#raw.order ?? null;
  }

  get tags(): string {
    return this.#raw.tags ? this.#raw.tags.map(tag => tag()).join('\0') : '';
  }

  get options(): SimpleSettingOption[] {
    return this.#raw.options?.map(opt => ({
                                    value: opt.value,
                                    title: opt.title(),
                                    text: typeof opt.text === 'function' ? opt.text() : opt.text,
                                    raw: opt.raw,
                                  })) ??
        [];
  }

  get reloadRequired(): boolean {
    return Boolean(this.#raw.reloadRequired);
  }

  get learnMore(): Common.SettingRegistration.LearnMore|null {
    return this.#raw.learnMore ?? null;
  }
}

export function maybeResolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUI|null {
  const settingUI = registeredSettings.get(settingDescriptor.name) ??
      getRegisteredSettings().find(registered => registered.descriptor.name === settingDescriptor.name);
  return settingUI ? new SettingUI(settingUI.uiDescriptor) : null;
}

export function resolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUI {
  const ui = maybeResolve(settingDescriptor);
  if (!ui) {
    throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
  }
  return ui;
}

export function resetSettings(): void {
  for (const {uiDescriptor} of registeredSettings.values()) {
    Common.SettingRegistration.removeCategoryOrder(uiDescriptor.category, uiDescriptor.order);
  }
  registeredSettings.clear();
}
