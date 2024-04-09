// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import {
  deinitializeGlobalVars,
  describeWithEnvironment,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';

import * as QuickOpen from './components/quick_open/quick_open.js';
import * as UI from './legacy.js';

describeWithEnvironment('ActionRegistration', () => {
  it('toggling settings affects registered actions', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'test-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });

    // Force new instance for the setting extension to apply.
    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });

    UI.ActionRegistration.registerActionExtension({
      actionId: 'test-action',
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      setting: 'test-setting',
    });

    let list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 0);

    Common.Settings.moduleSetting('test-setting').set(true);
    list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 1);

    Common.Settings.moduleSetting('test-setting').set(false);
    list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 0);
  });
});

describeWithEnvironment('ActionRegistration', () => {
  let actionExecuted = false;
  const actionTitle = 'Mock action';
  const actionId = 'mock.action';
  class MockActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, _actionId: string): boolean {
      actionExecuted = true;
      return actionExecuted;
    }
  }

  class MockContextType {}

  before(async () => {
    UI.ActionRegistration.registerActionExtension({
      actionId,
      category: UI.ActionRegistration.ActionCategory.ELEMENTS,
      title: i18n.i18n.lockedLazyString(actionTitle),
      async loadActionDelegate() {
        return new MockActionDelegate();
      },
      contextTypes() {
        return [MockContextType];
      },
    });
    Root.Runtime.experiments.clearForTest();
    await initializeGlobalVars();
    // A ShortcutRegistry instance is needed to add a command to execute an action to the
    // command menu and an instance of ActionRegistry is needed to instatiate the ShorcutRegistry.
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    UI.Context.Context.instance().setFlavor(MockContextType, new MockContextType());
  });

  after(async () => {
    await deinitializeGlobalVars();
    UI.ActionRegistry.ActionRegistry.reset();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    UI.Context.Context.instance().setFlavor(MockContextType, null);
  });

  describe('hasAction', () => {
    it('yields true for a registered action', () => {
      assert.isTrue(UI.ActionRegistry.ActionRegistry.instance().hasAction(actionId));
    });

    it('yields false for an unknown action', () => {
      assert.isFalse(UI.ActionRegistry.ActionRegistry.instance().hasAction('foo'));
    });
  });

  describe('getAction', () => {
    it('retrieves a registered action', () => {
      const preRegisteredAction = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
      assert.strictEqual(preRegisteredAction.title(), actionTitle, 'Action title is not returned correctly');
    });

    it('throws for unknown actions', () => {
      assert.throws(() => UI.ActionRegistry.ActionRegistry.instance().getAction('foo'));
    });
  });

  it('finds a pre registered action as available when its context types are in the current context flavors', () => {
    const availableActions = UI.ActionRegistry.ActionRegistry.instance().availableActions().map(action => action.id());
    assert.notStrictEqual(availableActions.indexOf(actionId), -1);
  });

  it('executes a pre registered action', async () => {
    actionExecuted = false;
    const preRegisteredAction = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
    await preRegisteredAction.execute();
    assert.isTrue(actionExecuted, 'Action was not executed');
  });

  it('executes a pre registered from the command menu', async () => {
    actionExecuted = false;
    const commandMenuProvider = new QuickOpen.CommandMenu.CommandMenuProvider();
    commandMenuProvider.attach();
    for (let i = 0; i < commandMenuProvider.itemCount(); ++i) {
      if (commandMenuProvider.itemKeyAt(i).includes(actionTitle)) {
        await commandMenuProvider.selectItem(i, '');
      }
    }
    assert.isTrue(actionExecuted, 'Action was not executed from CommandMenu');
  });

  it('throws an error trying to register a duplicated view id', () => {
    assert.throws(() => {
      UI.ActionRegistration.registerActionExtension({
        actionId,
        category: UI.ActionRegistration.ActionCategory.ELEMENTS,
      });
    });
  });

  it('throws an error trying to register an action with an invalid id', () => {
    assert.throws(() => {
      UI.ActionRegistration.registerActionExtension({
        actionId: 'quickOpen.show',
        category: UI.ActionRegistration.ActionCategory.GLOBAL,
      });
    });
  });

  it('does not find a pre registered action as available when its context types are not in the current context flavors',
     () => {
       UI.Context.Context.instance().setFlavor(MockContextType, null);
       const availableActions =
           UI.ActionRegistry.ActionRegistry.instance().availableActions().map(action => action.id());
       assert.strictEqual(availableActions.indexOf(actionId), -1);
     });

  it('deletes a registered action using its id', () => {
    const removalResult = UI.ActionRegistration.maybeRemoveActionExtension(actionId);
    assert.isTrue(removalResult);
    assert.doesNotThrow(() => {
      UI.ActionRegistration.registerActionExtension({
        actionId,
        category: UI.ActionRegistration.ActionCategory.ELEMENTS,
      });
    });
  });
});
