// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Help from '../../../../../front_end/panels/help/help.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {initializeGlobalVars, deinitializeGlobalVars} from '../../helpers/EnvironmentHelpers.js';

describe('Release Note', () => {
  before(async () => {
    Help.Help.setReleaseNotesForTest([
      {
        version: 99,
        header: 'Highlights from Chrome 100 update',
        highlights: [
          {
            title: 'Improved Performance and Memory panels',
            subtitle: '',
            link: 'https://developer.chrome.com/docs/devtools/',
          },
          {
            title: 'Edit cookies directly from the Application panel',
            subtitle: '',
            link: 'https://developer.chrome.com/docs/devtools/',
          },
        ],
        link: 'https://developer.chrome.com/docs/devtools/',
      },
    ]);

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
        return Help.ReleaseNoteView.ReleaseNoteView.instance();
      },
    });
    await initializeGlobalVars({reset: false});
  });

  after(async () => await deinitializeGlobalVars());

  it('sets and gets the last seen release note version correctly', () => {
    const releaseNoteVersionSetting = Help.Help.getReleaseNoteVersionSetting();
    assert.strictEqual(releaseNoteVersionSetting.get(), 0);
    releaseNoteVersionSetting.set(1);
    assert.strictEqual(releaseNoteVersionSetting.get(), 1);
  });

  it('updates the last seen version when the release notes are shown', () => {
    assert.strictEqual(Help.Help.getReleaseNoteVersionSetting().get(), 1);
    Help.Help.showReleaseNoteIfNeeded();
    assert.strictEqual(Help.Help.getReleaseNoteVersionSetting().get(), 99);
  });

  it('shows the release notes only when needed', () => {
    assert.isTrue(Help.Help.innerShowReleaseNoteIfNeeded(98, Help.Help.latestReleaseNote().version, true));
    assert.isFalse(Help.Help.innerShowReleaseNoteIfNeeded(99, Help.Help.latestReleaseNote().version, true));
    assert.isFalse(Help.Help.innerShowReleaseNoteIfNeeded(0, Help.Help.latestReleaseNote().version, true));
    assert.isFalse(Help.Help.innerShowReleaseNoteIfNeeded(98, Help.Help.latestReleaseNote().version, false));
  });
});
