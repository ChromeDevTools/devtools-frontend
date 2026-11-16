// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as Lighthouse from './lighthouse.js';

const UIStrings = {
  /**
   * @description Command for showing the Lighthouse panel.
   */
  showLighthouse: 'Show `Lighthouse`',
  /**
   * @description Title of Lighthouse performance category setting.
   */
  performance: 'Performance',
  /**
   * @description Title of Lighthouse accessibility category setting.
   */
  accessibility: 'Accessibility',
  /**
   * @description Title of Lighthouse best practices category setting.
   */
  bestPractices: 'Best practices',
  /**
   * @description Title of Lighthouse SEO category setting.
   */
  seo: 'SEO',
  /**
   * @description Title of Lighthouse agentic browsing category setting.
   */
  agenticBrowsing: 'Agentic browsing',
  /**
   * @description Title of Lighthouse device type setting.
   */
  device: 'Apply mobile emulation',
  /**
   * @description Title of Lighthouse mode setting.
   */
  mode: 'Lighthouse mode',
  /**
   * @description Title of Lighthouse throttling setting.
   */
  throttling: 'Throttling method',
  /**
   * @description Title of Lighthouse clear storage setting.
   */
  clearStorage: 'Clear storage',
  /**
   * @description Title of Lighthouse JavaScript sampling setting.
   */
  enableSampling: 'Enable JS sampling',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/lighthouse-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedLighthouseModule: (typeof Lighthouse|undefined);

async function loadLighthouseModule(): Promise<typeof Lighthouse> {
  if (!loadedLighthouseModule) {
    loadedLighthouseModule = await import('./lighthouse.js');
  }
  return loadedLighthouseModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'lighthouse',
  title: i18n.i18n.lockedLazyString('Lighthouse'),
  commandPrompt: i18nLazyString(UIStrings.showLighthouse),
  order: 90,
  async loadView() {
    const Lighthouse = await loadLighthouseModule();
    return Lighthouse.LighthousePanel.LighthousePanel.instance();
  },
  tags: [
    i18n.i18n.lockedLazyString('lighthouse'),
    i18n.i18n.lockedLazyString('pwa'),
  ],
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Lighthouse.LighthousePanel.ActiveLighthouseReport,
    ];
  },
  destination: Common.Revealer.RevealerDestination.LIGHTHOUSE_PANEL,
  async loadRevealer() {
    const Lighthouse = await loadLighthouseModule();
    return new Lighthouse.LighthousePanel.ReportRevealer();
  },
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.catPerfSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.performance),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.catA11ySettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.accessibility),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.catBestPracticesSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.bestPractices),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.catSeoSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.seo),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.catAgenticBrowsingSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.agenticBrowsing),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.deviceTypeSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.device),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.modeSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.mode),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.throttlingSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.throttling),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.LighthouseSettings.clearStorageSettingDescriptor, {
  category: Common.Settings.SettingCategory.NONE,
  title: i18nLazyString(UIStrings.clearStorage),
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.enableSampling),
  settingName: 'lighthouse.enable-sampling',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});
