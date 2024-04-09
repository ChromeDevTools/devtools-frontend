// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as QuickOpen from './components/quick_open/quick_open.js';
import * as UI from './legacy.js';

class MockView extends UI.Widget.Widget implements UI.View.ViewLocationResolver {
  resolveLocation(_location: string) {
    return UI.ViewManager.ViewManager.instance().createStackLocation();
  }
}
const viewId = 'mock-view';
const viewTitle = 'Mock';
const commandPrompt = 'Show Mock';
const order = 10;

describeWithEnvironment('ViewRegistration', () => {
  before(() => {
    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.PANEL,
      id: viewId,
      commandPrompt: i18n.i18n.lockedLazyString(commandPrompt),
      title: i18n.i18n.lockedLazyString(viewTitle),
      order,
      persistence: UI.ViewManager.ViewPersistence.PERMANENT,
      hasToolbar: false,
      async loadView() {
        return new MockView();
      },
    });
    // The location resolver needs to be registered to add the command to show a view
    // from the command menu.
    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.PANEL,
      category: UI.ViewManager.ViewLocationCategory.PANEL,
      async loadResolver() {
        return new MockView();
      },
    });
  });

  it('retrieves a registered view', async () => {
    const preRegisteredView = UI.ViewManager.ViewManager.instance().view(viewId) as UI.ViewManager.PreRegisteredView;
    const mockWidget = await preRegisteredView.widget();
    assert.instanceOf(mockWidget, MockView, 'View did not load correctly');
    assert.strictEqual(preRegisteredView.title(), viewTitle, 'View title is not returned correctly');
    assert.strictEqual(preRegisteredView.commandPrompt(), commandPrompt, 'Command for view is not returned correctly');
  });

  it('adds command for showing a pre registered view', () => {
    const allCommands = QuickOpen.CommandMenu.CommandMenu.instance({forceNew: true}).commands();
    const filteredCommands = allCommands.filter(
        command =>
            command.title === commandPrompt && command.isPanelOrDrawer === QuickOpen.CommandMenu.PanelOrDrawer.PANEL);
    assert.strictEqual(filteredCommands.length, 1, 'Command for showing a preregistered view was not added correctly');
  });

  it('deletes a registered view using its id', () => {
    const removalResult = UI.ViewManager.maybeRemoveViewExtension(viewId);
    assert.isTrue(removalResult);
    assert.doesNotThrow(() => {
      UI.ViewManager.registerViewExtension({
        id: viewId,
        commandPrompt: i18n.i18n.lockedLazyString(commandPrompt),
        title: i18n.i18n.lockedLazyString(viewTitle),
        async loadView() {
          return new MockView();
        },
      });
    });
  });
});
