// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {beforeEachWithTeardown} from '../../testing/TestTeardown.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Profiler from './profiler.js';

const RECORD_ACTION_ID = 'profiler.heap-toggle-recording';
const SIDEBAR_ACTION_IDS = [
  'profiler.clear-all',
  'profiler.load-from-file',
  'profiler.save-to-file',
  'components.collect-garbage',
];

function getProfilerActions(): UI.ActionRegistration.ActionRegistration[] {
  const title = (text: string) => () => text as Platform.UIString.LocalizedString;
  const category = UI.ActionRegistration.ActionCategory.MEMORY;
  return [
    {
      actionId: RECORD_ACTION_ID,
      category,
      title: title('Start/stop recording'),
      iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
      toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
      toggleable: true,
      toggleWithRedColor: true,
    },
    {
      actionId: 'profiler.clear-all',
      category,
      title: title('Clear all profiles'),
      iconClass: UI.ActionRegistration.IconClass.CLEAR,
    },
    {
      actionId: 'profiler.load-from-file',
      category,
      title: title('Load profile…'),
      iconClass: UI.ActionRegistration.IconClass.IMPORT,
    },
    {
      actionId: 'profiler.save-to-file',
      category,
      title: title('Save profile…'),
      iconClass: UI.ActionRegistration.IconClass.DOWNLOAD,
    },
    {
      actionId: 'components.collect-garbage',
      category,
      title: title('Collect garbage'),
      iconClass: UI.ActionRegistration.IconClass.MOP,
    },
  ];
}

function registerProfilerActions(): void {
  for (const action of getProfilerActions()) {
    UI.ActionRegistration.maybeRemoveActionExtension(action.actionId);
    UI.ActionRegistration.registerActionExtension(action);
  }
  const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
  UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry});
}

function unregisterProfilerActions(): void {
  UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
  UI.ActionRegistry.ActionRegistry.reset();
  for (const action of getProfilerActions()) {
    UI.ActionRegistration.maybeRemoveActionExtension(action.actionId);
  }
}

describe('ProfilesPanel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  const {ProfilesPanel} = Profiler.ProfilesPanel;
  let universe: TestUniverse;

  beforeEachWithTeardown(
      () => {
        universe = new TestUniverse();
        setTestUniverseForWidgets(universe);
        sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
        sinon.stub(SDK.IsolateManager.IsolateManager, 'instance').returns(universe.isolateManager);
        sinon.stub(universe.isolateManager, 'observeIsolates');
        sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
        UI.ZoomManager.ZoomManager.instance(
            {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});
        registerProfilerActions();
      },
      async () => {
        // Let pending launcher view updates run before the environment is torn down.
        await UI.Widget.Widget.allUpdatesComplete;
        UI.Context.Context.instance().setFlavor(Profiler.ProfileHeader.ProfileHeader, null);
        UI.Context.Context.instance().setFlavor(ProfilesPanel, null);
        UI.Context.Context.removeInstance();
        UI.ZoomManager.ZoomManager.removeInstance();
        unregisterProfilerActions();
        ProfilesPanel.resetRegistryForTest();
        universe.dispose();
      });

  it('renders the sidebar toolbar buttons', async () => {
    const panel = new ProfilesPanel('heap-profiler', RECORD_ACTION_ID);
    await panel.updateComplete;
    const [recordButton, ...actionButtons] =
        [...panel.element.querySelectorAll<Buttons.Button.Button>('.profiles-tree-sidebar devtools-button')];
    assert.instanceOf(recordButton, Buttons.Button.Button);
    assert.isTrue(recordButton.disabled);
    assert.deepEqual(actionButtons.map(b => b.jslogContext), SIDEBAR_ACTION_IDS);
  });

  it('opens a file selector when showing load from file dialog', () => {
    const panel = new ProfilesPanel('heap-profiler', RECORD_ACTION_ID);
    const click = sinon.stub(HTMLInputElement.prototype, 'click');
    panel.showLoadFromFileDialog();
    sinon.assert.calledOnce(click);
  });

  it('renders and selects the launcher item in the sidebar tree by default', () => {
    const panel = new ProfilesPanel('heap-profiler', RECORD_ACTION_ID);
    const launcherItem = panel.sidebarTree.firstChild();
    assert.isTrue(launcherItem?.selected);
  });

  it('selects newly added profiles in the sidebar tree', () => {
    const panel = new ProfilesPanel('heap-profiler', RECORD_ACTION_ID);
    const profile = new Profiler.HeapSnapshotView.HeapProfileHeader(
        null, ProfilesPanel.registry.heapSnapshotProfileType, 'Snapshot 1');
    panel.addProfileHeader(profile);
    assert.strictEqual(panel.sidebarTree.selectedTreeElement?.listItemElement.querySelector('.title')?.textContent,
                       'Snapshot 1');
  });
});
