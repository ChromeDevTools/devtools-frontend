// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import * as Platform from '../../../../front_end/platform/platform.js';
import * as QuickOpen from '../../../../front_end/quick_open/quick_open.js';
import * as UI from '../../../../front_end/ui/ui.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../helpers/EnvironmentHelpers.js';

const {assert} = chai;
let actionExecuted = false;
const actionTitle = 'Mock action';
const actionId = 'mockAction';
class MockActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    actionExecuted = true;
    return actionExecuted;
  }
}

class MockContextType {}

describe('Action registration', () => {
  before(async () => {
    UI.ActionRegistration.registerActionExtension({
      actionId,
      category: UI.ActionRegistration.ActionCategory.ELEMENTS,
      title: (): Platform.UIString.LocalizedString => actionTitle as Platform.UIString.LocalizedString,
      async loadActionDelegate() {
        return new MockActionDelegate();
      },
      contextTypes() {
        return [MockContextType];
      },
    });
    // These settings need to be registered to test the execution of an action from CommandMenu
    Common.Settings.registerSettingExtension({
      defaultValue: '',
      settingType: 'enum',
      settingName: 'activeKeybindSet',
    });
    Common.Settings.registerSettingExtension({
      defaultValue: [],
      settingType: 'array',
      settingName: 'userShortcuts',
    });

    await initializeGlobalVars();
    // A ShortcutRegistry instance is needed to add a command to execute an action to the
    // command menu and an instance of ActionRegistry is needed to instatiate the ShorcutRegistry.
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    UI.Context.Context.instance().setFlavor(MockContextType, new MockContextType());
  });

  after(async () => {
    await deinitializeGlobalVars();
    UI.ActionRegistry.ActionRegistry.removeInstance();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    UI.Context.Context.instance().setFlavor(MockContextType, null);
  });


  it('retrieves a registered action', () => {
    const preRegisteredAction = UI.ActionRegistry.ActionRegistry.instance().action(actionId);
    assert.isNotNull(preRegisteredAction, 'Failed to find action registration');
    if (preRegisteredAction) {
      assert.strictEqual(preRegisteredAction.title(), actionTitle, 'Action title is not returned correctly');
    }
  });

  it('finds a pre registered action as available when its context types are in the current context flavors', () => {
    const availableActions = UI.ActionRegistry.ActionRegistry.instance().availableActions().map(action => action.id());
    assert.notStrictEqual(availableActions.indexOf(actionId), -1);
  });

  it('executes a pre registered action', async () => {
    actionExecuted = false;
    const preRegisteredAction =
        UI.ActionRegistry.ActionRegistry.instance().action(actionId) as UI.ActionRegistration.Action;
    if (preRegisteredAction) {
      await preRegisteredAction.execute();
      assert.isTrue(actionExecuted, 'Action was not executed');
    }
  });

  it('executes a pre registered from the command menu', async () => {
    actionExecuted = false;
    const commandMenuProvider = new QuickOpen.CommandMenu.CommandMenuProvider();
    commandMenuProvider.attach();
    await commandMenuProvider.selectItem(0, '');
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

  it('does not find a pre registered action as available when its context types are not in the current context flavors',
     () => {
       UI.Context.Context.instance().setFlavor(MockContextType, undefined);
       const availableActions =
           UI.ActionRegistry.ActionRegistry.instance().availableActions().map(action => action.id());
       assert.strictEqual(availableActions.indexOf(actionId), -1);
     });
});
