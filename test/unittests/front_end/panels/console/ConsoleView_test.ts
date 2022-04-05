// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Console from '../../../../../front_end/panels/console/console.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describeWithEnvironment('ConsoleView', () => {
  before(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear');
    UI.ActionRegistration.maybeRemoveActionExtension('console.create-pin');
    UI.ActionRegistration.registerActionExtension({
      actionId: 'console.clear',
      category: UI.ActionRegistration.ActionCategory.CONSOLE,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'console.create-pin',
      category: UI.ActionRegistration.ActionCategory.CONSOLE,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
    });
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  after(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear');
    UI.ActionRegistration.maybeRemoveActionExtension('console.create-pin');
  });

  it('adds a title to every checkbox label in the settings view', async () => {
    const consoleView = Console.ConsoleView.ConsoleView.instance();
    const consoleSettingsCheckboxes =
        consoleView.element.querySelector('.toolbar')?.shadowRoot?.querySelectorAll('.toolbar-item.checkbox');
    if (!consoleSettingsCheckboxes) {
      assert.fail('No checkbox found in console settings');
      return;
    }
    for (const checkbox of consoleSettingsCheckboxes) {
      assert.isTrue(checkbox.shadowRoot?.querySelector('.dt-checkbox-text')?.hasAttribute('title'));
    }
    // This test transitively schedules a task which may cause errors if the task
    // is run without the environments set in this test. Thus wait for its completion
    // before proceding to the next test.
    await consoleView.getScheduledRefreshPromiseForTest();
  });
});
