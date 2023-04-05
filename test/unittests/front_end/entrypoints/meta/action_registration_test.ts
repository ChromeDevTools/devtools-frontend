// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as QuickOpen from '../../../../../front_end/ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {
  deinitializeGlobalVars,
  describeWithEnvironment,
  initializeGlobalVars,
} from '../../helpers/EnvironmentHelpers.js';

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

describeWithEnvironment('Action registration', () => {
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
