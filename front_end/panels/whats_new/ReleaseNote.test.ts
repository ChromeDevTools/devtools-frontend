// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as WhatsNewModule from './whats_new.js';

const {urlString} = Platform.DevToolsPath;

describe('Release Note', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let WhatsNew: typeof WhatsNewModule;

  before(async () => {
    await initializeGlobalVars();

    WhatsNew = await import('./whats_new.js');
    WhatsNew.ReleaseNoteText.setReleaseNoteForTest(
        {
          version: 99,
          header: 'Highlights from Chrome 100 update',
          markdownLinks: [],
          link: urlString`https://developers.google.com/web/tools/chrome-devtools/`,
          videoLinks: [],
        },
    );

    // We need to add the What's New view so that an error is not thrown when requesting
    // to show the release notes when needed.
    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
      id: 'release-note',
      title: () => 'What\'s New' as Platform.UIString.LocalizedString,
      commandPrompt: () => 'Show What\'s New' as Platform.UIString.LocalizedString,
      persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
      order: 1,
      async loadView() {
        return new WhatsNew.ReleaseNoteView.ReleaseNoteView();
      },
    });

    // This setting is used to determine if the What's New panel needs to be shown.
    Common.Settings.registerSettingsForTest([{
      category: Common.Settings.SettingCategory.APPEARANCE,
      title: () => 'Show What\'s New after each update' as Platform.UIString.LocalizedString,
      settingName: 'help.show-release-note',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
    }]);
    Root.Runtime.experiments.clearForTest();
    await initializeGlobalVars({reset: false});
  });

  after(async () => await deinitializeGlobalVars());

  it('sets and gets the last seen release note version correctly', () => {
    const releaseNoteVersionSetting = WhatsNew.WhatsNew.getReleaseNoteVersionSetting();
    assert.strictEqual(releaseNoteVersionSetting.get(), 0);
    releaseNoteVersionSetting.set(1);
    assert.strictEqual(releaseNoteVersionSetting.get(), 1);
  });

  it('updates the last seen version when the release notes are shown', () => {
    assert.strictEqual(WhatsNew.WhatsNew.getReleaseNoteVersionSetting().get(), 1);
    WhatsNew.WhatsNew.showReleaseNoteIfNeeded();
    assert.strictEqual(WhatsNew.WhatsNew.getReleaseNoteVersionSetting().get(), 99);
  });

  it('shows the release notes only when needed', () => {
    const lastSeenVersionSetting = WhatsNew.WhatsNew.getReleaseNoteVersionSetting();

    lastSeenVersionSetting.set(98);
    assert.isTrue(WhatsNew.WhatsNew.showReleaseNoteIfNeeded());

    lastSeenVersionSetting.set(99);
    assert.isFalse(WhatsNew.WhatsNew.showReleaseNoteIfNeeded());

    lastSeenVersionSetting.set(0);
    assert.isFalse(WhatsNew.WhatsNew.showReleaseNoteIfNeeded());

    lastSeenVersionSetting.set(100);
    assert.isFalse(WhatsNew.WhatsNew.showReleaseNoteIfNeeded());
  });
});
