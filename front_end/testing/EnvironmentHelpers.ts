// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import type * as Platform from '../core/platform/platform.js';
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Formatter from '../models/formatter/formatter.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import * as Logs from '../models/logs/logs.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as ProjectSettings from '../models/project_settings/project_settings.js';
import * as Workspace from '../models/workspace/workspace.js';
import type * as UIModule from '../ui/legacy/legacy.js';

import {deinitializeGlobalLocaleVars, initializeGlobalLocaleVars} from './LocaleHelpers.js';
import {MockCDPConnection} from './MockCDPConnection.js';
import {cleanupRuntime, setupRuntime} from './RuntimeHelpers.js';
import {cleanupSettings, setupSettings} from './SettingsHelpers.js';

// Don't import UI at this stage because it will fail without
// the environment. Instead we do the import at the end of the
// initialization phase.
// eslint-disable-next-line @typescript-eslint/naming-convention
let UI: typeof UIModule;

let uniqueTargetId = 0;

export function createTarget({
  id,
  name,
  type = SDK.Target.Type.FRAME,
  parentTarget,
  subtype,
  url = 'http://example.com',
  connection,
  targetManager = SDK.TargetManager.TargetManager.instance(),
}: {
  id?: Protocol.Target.TargetID,
  name?: string,
  type?: SDK.Target.Type,
  parentTarget?: SDK.Target.Target,
  subtype?: string,
  url?: string,
  connection?: ProtocolClient.CDPConnection.CDPConnection,
  targetManager?: SDK.TargetManager.TargetManager,
} = {}) {
  if (!id) {
    if (!uniqueTargetId++) {
      id = 'test' as Protocol.Target.TargetID;
    } else {
      id = ('test' + uniqueTargetId) as Protocol.Target.TargetID;
    }
  }
  if (!ProtocolClient.ConnectionTransport.ConnectionTransport.getFactory()) {
    // We are not running with `describeWithMockConnection` so create a fresh mock connection.
    // Because child targets inherit the SessionRouter/CDPConnection from the parent, we'll throw if a
    // connection is passed together with a parent target as it would have no effect.
    if (parentTarget && connection) {
      throw new Error(
          'Can\'t create child targets with it\'s own connection. Child targets share the connection with their parent.');
    }
    if (!connection && !parentTarget) {
      connection = new MockCDPConnection([]);
    }
  }
  return targetManager.createTarget(
      id, name ?? id, type, parentTarget ? parentTarget : null, /* sessionId=*/ parentTarget ? id : undefined,
      /* suspended=*/ false, connection, {targetId: id, url, subtype} as Protocol.Target.TargetInfo);
}

export {stubNoopSettings} from './SettingsHelpers.js';

export function registerActions(actions: UIModule.ActionRegistration.ActionRegistration[]): void {
  for (const action of actions) {
    UI.ActionRegistration.maybeRemoveActionExtension(action.actionId);
    UI.ActionRegistration.registerActionExtension(action);
  }
  const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
  UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
}

export function registerNoopActions(actionIds: string[]): void {
  for (const actionId of actionIds) {
    UI.ActionRegistration.maybeRemoveActionExtension(actionId);
    UI.ActionRegistration.registerActionExtension({
      actionId,
      category: UI.ActionRegistration.ActionCategory.NONE,
      title: () => 'mock' as Platform.UIString.LocalizedString,
    });
  }
  const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
  UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
}

export async function initializeGlobalVars({reset = true} = {}) {
  await initializeGlobalLocaleVars();

  setupSettings(reset);
  setupRuntime();

  // Dynamically import UI after the rest of the environment is set up, otherwise it will fail.
  UI = await import('../ui/legacy/legacy.js');
  UI.ZoomManager.ZoomManager.instance(
      {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

  // Initialize context menus.
  UI.UIUtils.initializeUIUtils(document);
}

export async function deinitializeGlobalVars() {
  // Remove the global SDK.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const globalObject = (globalThis as unknown as {SDK?: unknown, ls?: unknown});
  delete globalObject.SDK;
  delete globalObject.ls;

  for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
    target.dispose('deinitializeGlobalVars');
  }

  // Remove instances.
  deinitializeGlobalLocaleVars();
  Logs.NetworkLog.NetworkLog.removeInstance();
  SDK.TargetManager.TargetManager.removeInstance();
  SDK.FrameManager.FrameManager.removeInstance();
  Common.Settings.Settings.removeInstance();
  Common.Revealer.RevealerRegistry.removeInstance();
  Common.Console.Console.removeInstance();
  Workspace.Workspace.WorkspaceImpl.removeInstance();
  Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
  Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
  IssuesManager.IssuesManager.IssuesManager.removeInstance();
  Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.removeInstance();
  ProjectSettings.ProjectSettingsModel.ProjectSettingsModel.removeInstance();
  Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();

  cleanupSettings();

  // Protect against the dynamic import not having happened.
  if (UI) {
    UI.ZoomManager.ZoomManager.removeInstance();
    UI.ViewManager.ViewManager.removeInstance();
    UI.ViewManager.resetViewRegistration();
    UI.Context.Context.removeInstance();
    UI.InspectorView.InspectorView.removeInstance();
    UI.ActionRegistry.ActionRegistry.reset();
  }

  cleanupRuntime();
}

export function describeWithEnvironment(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(title, function() {
    before(async () => await initializeGlobalVars(opts));
    fn.call(this);
    after(async () => await deinitializeGlobalVars());
  });
}

describeWithEnvironment.only = function(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only(title, function() {
    before(async () => await initializeGlobalVars(opts));
    fn.call(this);
    after(async () => await deinitializeGlobalVars());
  });
};
describeWithEnvironment.skip = function(title: string, fn: (this: Mocha.Suite) => void, _opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line @devtools/check-test-definitions
  return describe.skip(title, function() {
    fn.call(this);
  });
};

export function createFakeSetting<T>(name: string, defaultValue: T): Common.Settings.Setting<T> {
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  return new Common.Settings.Setting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage);
}

export function createFakeRegExpSetting(name: string, defaultValue: string): Common.Settings.RegExpSetting {
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  return new Common.Settings.RegExpSetting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage);
}

export function setupActionRegistry() {
  before(function() {
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    UI.ShortcutRegistry.ShortcutRegistry.instance({
      forceNew: true,
      actionRegistry,
    });
  });
  after(function() {
    if (UI) {
      UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
      UI.ActionRegistry.ActionRegistry.removeInstance();
    }
  });
}

/** This needs to be invoked within a describe block, rather than within an it() block. **/
export function expectConsoleLogs(expectedLogs: {warn?: string[], log?: string[], error?: string[]}) {
  const {error, warn, log} = console;
  before(() => {
    if (expectedLogs.log) {
      // eslint-disable-next-line no-console
      console.log = (...data: unknown[]) => {
        if (!expectedLogs.log?.includes(data.join(' '))) {
          log(...data);
        }
      };
    }
    if (expectedLogs.warn) {
      console.warn = (...data: unknown[]) => {
        if (!expectedLogs.warn?.includes(data.join(' '))) {
          warn(...data);
        }
      };
    }
    if (expectedLogs.error) {
      console.error = (...data: unknown[]) => {
        if (!expectedLogs.error?.includes(data.join(' '))) {
          error(...data);
        }
      };
    }
  });
  after(() => {
    if (expectedLogs.log) {
      // eslint-disable-next-line no-console
      console.log = log;
    }
    if (expectedLogs.warn) {
      console.warn = warn;
    }
    if (expectedLogs.error) {
      console.error = error;
    }
  });
}

let originalUserAgent: string;

export function setUserAgentForTesting(): void {
  originalUserAgent = window.navigator.userAgent;
  Object.defineProperty(window.navigator, 'userAgent', {value: 'Chrome/unit_test', configurable: true});
}

export function restoreUserAgentForTesting(): void {
  Object.defineProperty(window.navigator, 'userAgent', {value: originalUserAgent});
}

export function resetHostConfig() {
  for (const key of Object.keys(Root.Runtime.hostConfig)) {
    // @ts-expect-error TypeScript does not deduce the correct type
    delete Root.Runtime.hostConfig[key];
  }
}

/**
 * Update `Root.Runtime.hostConfig` for testing.
 * `Root.Runtime.hostConfig` is automatically cleaned-up between unit
 * tests.
 */
export function updateHostConfig(config: Root.Runtime.HostConfig) {
  Object.assign(Root.Runtime.hostConfig, config);
}
