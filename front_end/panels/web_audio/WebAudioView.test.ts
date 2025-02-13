// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import {WebAudioView} from './web_audio.js';

describeWithEnvironment('WebAudioView', () => {
  beforeEach(() => {
    UI.ActionRegistration.registerActionExtension({
      actionId: 'components.collect-garbage',
      category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
  });

  it('shows placeholder', () => {
    const view = new WebAudioView.WebAudioView();
    assert.exists(view.contentElement.querySelector('.empty-state'));
    assert.deepEqual(
        view.contentElement.querySelector('.empty-state-header')?.textContent, 'No web audio API usage detected');
    assert.deepEqual(
        view.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'Open a page that uses web audio API to start monitoring.');
  });
});
