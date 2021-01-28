// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Help from './help.js';

export const UIStrings = {
  /**
  *@description Title of the 'What's New' tool in the bottom drawer
  */
  whatsNew: 'What\'s New',
  /**
  *@description Command for showing the 'What's New' tool in the bottom drawer
  */
  showWhatsNew: 'Show What\'s New',
  /**
  *@description Title of an action in the help tool to release notes
  */
  releaseNotes: 'Release notes',
  /**
  *@description Title of an action in the help tool to file an issue
  */
  reportADevtoolsIssue: 'Report a DevTools issue',
  /**
  *@description A search term referring to a software defect (i.e. bug) that can be entered in the command menu
  */
  bug: 'bug',
  /**
  *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
  */
  showWhatsNewAfterEachUpdate: 'Show What\'s New after each update',
  /**
  *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
  */
  doNotShowWhatsNewAfterEachUpdate: 'Do not show What\'s New after each update',
};
const str_ = i18n.i18n.registerUIStrings('help/help-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedHelpModule: (typeof Help|undefined);

async function loadHelpModule(): Promise<typeof Help> {
  if (!loadedHelpModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('help');
    loadedHelpModule = await import('./help.js');
  }
  return loadedHelpModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'release-note',
  title: i18nString(UIStrings.whatsNew),
  commandPrompt: i18nString(UIStrings.showWhatsNew),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 1,
  async loadView() {
    const Help = await loadHelpModule();
    return Help.ReleaseNoteView.ReleaseNoteView.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.HELP,
  actionId: 'help.release-notes',
  title: i18nString(UIStrings.releaseNotes),
  async loadActionDelegate() {
    const Help = await loadHelpModule();
    return Help.Help.ReleaseNotesActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.HELP,
  actionId: 'help.report-issue',
  title: i18nString(UIStrings.reportADevtoolsIssue),
  async loadActionDelegate() {
    const Help = await loadHelpModule();
    return Help.Help.ReportIssueActionDelegate.instance();
  },
  tags: [i18nString(UIStrings.bug)],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: i18nString(UIStrings.showWhatsNewAfterEachUpdate),
  settingName: 'help.show-release-note',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.showWhatsNewAfterEachUpdate),
    },
    {
      value: false,
      title: i18nString(UIStrings.doNotShowWhatsNewAfterEachUpdate),
    },
  ],
});
