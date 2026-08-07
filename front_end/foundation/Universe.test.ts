// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import type * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import {MockCDPConnection} from '../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../testing/RuntimeHelpers.js';
import {DEFAULT_SETTING_REGISTRATIONS_FOR_TEST} from '../testing/SettingsHelpers.js';
import {createTarget} from '../testing/TargetHelpers.js';
import {TestUniverse} from '../testing/TestUniverse.js';

import * as Foundation from './foundation.js';

describe('Universe', () => {
  setupRuntimeHooks();

  function createSettingsCreationOptions() {
    return {
      syncedStorage: new Common.Settings.SettingsStorage({}),
      globalStorage: new Common.Settings.SettingsStorage({}),
      localStorage: new Common.Settings.SettingsStorage({}),
      settingRegistrations: [...DEFAULT_SETTING_REGISTRATIONS_FOR_TEST],
    };
  }

  it('can be instantiated', () => {
    new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });
  });

  it('returns DeviceModeModel when emulation is supported', () => {
    const settingsOptions = createSettingsCreationOptions();
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: settingsOptions,
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: true,
    });
    assert.isNotNull(universe.deviceModeModel);
  });

  it('returns null for DeviceModeModel when emulation is not supported', () => {
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });
    assert.isNull(universe.deviceModeModel);
  });

  it('returns ProjectSettingsModel when initAutomaticFilesystem is true', () => {
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
      initAutomaticFilesystem: true,
    });
    assert.isNotNull(universe.projectSettingsModel);
    assert.isNotNull(universe.automaticFileSystemManager);
    assert.isNotNull(universe.automaticFileSystemWorkspaceBinding);
  });

  it('returns null for ProjectSettingsModel and throws for automatic file system when initAutomaticFilesystem is false',
     () => {
       const universe = new Foundation.Universe.Universe({
         settingsCreationOptions: createSettingsCreationOptions(),
         hostConfig: {} as Root.Runtime.HostConfig,
         inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
         supportsEmulation: false,
         initAutomaticFilesystem: false,
       });
       assert.isNull(universe.projectSettingsModel);
       assert.throws(() => universe.automaticFileSystemManager);
       assert.throws(() => universe.automaticFileSystemWorkspaceBinding);
     });

  it('handles initAutomaticFilesystem in TestUniverse', () => {
    const defaultUniverse = new TestUniverse();
    assert.isNotNull(defaultUniverse.projectSettingsModel);
    assert.isNotNull(defaultUniverse.automaticFileSystemManager);
    assert.isNotNull(defaultUniverse.automaticFileSystemWorkspaceBinding);

    const disabledUniverse = new TestUniverse({initAutomaticFilesystem: false});
    assert.throws(() => disabledUniverse.projectSettingsModel);
    assert.throws(() => disabledUniverse.automaticFileSystemManager);
    assert.throws(() => disabledUniverse.automaticFileSystemWorkspaceBinding);
  });

  it('retrieves registered services via universe.get(...)', () => {
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });
    assert.strictEqual(universe.get(SDK.TargetManager.TargetManager), universe.targetManager);
    assert.strictEqual(universe.get(Common.Settings.Settings), universe.settings);
  });

  it('does not produce unexpected CDP traffic during target bootstrapping', async () => {
    const settingsCreationOptions = createSettingsCreationOptions();
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions,
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });

    // Let the enable calls succeed.
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('CSS.enable', () => ({}));
    connection.setSuccessHandler('Debugger.enable', () => ({debuggerId: '42' as Protocol.Runtime.UniqueDebuggerId}));
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('Overlay.enable', () => ({}));
    connection.setSuccessHandler('Page.enable', () => ({}));

    const sendSpy = sinon.spy(connection, 'send');

    const tabTarget = createTarget({
      type: SDK.Target.Type.TAB,
      targetManager: universe.targetManager,
      connection,
    });
    const mainFrameTarget = createTarget({
      type: SDK.Target.Type.FRAME,
      parentTarget: tabTarget,
      targetManager: universe.targetManager,
    });
    createTarget({
      type: SDK.Target.Type.FRAME,
      subtype: 'iframe',
      parentTarget: mainFrameTarget,
      targetManager: universe.targetManager,
    });
    createTarget({
      type: SDK.Target.Type.Worker,
      parentTarget: mainFrameTarget,
      targetManager: universe.targetManager,
    });

    // Wait a couple of event loop ticks to allow async initialization tasks to run.
    const EVENT_LOOP_TICKS = 5;
    for (let i = 0; i < EVENT_LOOP_TICKS; ++i) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // CDP commands that are currently called during bootstrapping. Ideally we reduce this to near 0.
    // TODO(crbug.com/493763857): Clean these up so bootstrapping doesn't produce CDP traffic.
    const toleratedCommands = [
      // ResourceTreeModel
      'Page.enable',
      'Page.getResourceTree',

      // NetworkManager
      'Network.enable',
      'Network.setAttachDebugStack',
      'Network.setBlockedURLs',
      'Network.emulateNetworkConditionsByRule',
      'Network.overrideNetworkState',
      'Network.clearAcceptedEncodingsOverride',

      // RuntimeModel
      'Runtime.enable',
      'Runtime.getIsolateId',

      // DOMModel
      'DOM.enable',

      // CSSModel
      'CSS.enable',

      // DebuggerModel
      'Debugger.enable',
      'Debugger.setPauseOnExceptions',
      'Debugger.setAsyncCallStackDepth',
      'Debugger.setBlackboxPatterns',

      // OverlayModel
      'Overlay.enable',
      'Overlay.setShowViewportSizeOnResize',
      'Overlay.setShowGridOverlays',
      'Overlay.setShowFlexOverlays',
      'Overlay.setShowScrollSnapOverlays',
      'Overlay.setShowContainerQueryOverlays',
      'Overlay.setShowIsolatedElements',

      // AnimationModel
      'Animation.enable',

      // AutofillModel
      'Autofill.enable',
      'Autofill.setAddresses',

      // ProfilerModel
      'Profiler.enable',

      // LogModel
      'Log.enable',
      'Log.startViolationsReport',

      // EmulationModel
      'Emulation.setEmulatedMedia',

      // AuditsModel
      'Audits.enable',

      // ServiceWorkerManager
      'ServiceWorker.enable',

      // DOMDebuggerModel
      'DOMDebugger.setBreakOnCSPViolation',

      // TargetDetachedDialog,
      'Inspector.enable',

      // ChildTargetManager
      'Target.setAutoAttach',
      'Target.setDiscoverTargets',
      'Target.setRemoteLocations',
    ];

    for (const call of sendSpy.getCalls()) {
      const method = call.args[0];
      assert.isTrue(toleratedCommands.includes(method),
                    `Unexpected CDP command '${method}' was called during target bootstrapping.`);
    }
  });

  it('cleans up IsolatedFileSystemManager on dispose', () => {
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });

    const disposeSpy = sinon.spy(universe.isolatedFileSystemManager, 'dispose');
    universe.dispose();

    sinon.assert.calledOnce(disposeSpy);
  });

  it('cleans up TargetManager on dispose', () => {
    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: createSettingsCreationOptions(),
      hostConfig: {} as Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      supportsEmulation: false,
    });

    const disposeSpy = sinon.spy(universe.targetManager, 'dispose');
    universe.dispose();

    sinon.assert.calledOnce(disposeSpy);
  });
});
