// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assert } from 'chai';
import sinon from 'sinon';
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Platform from '../core/platform/platform.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as EmulationModel from '../models/emulation/emulation.js';
import * as Formatter from '../models/formatter/formatter.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import * as Logs from '../models/logs/logs.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as Workspace from '../models/workspace/workspace.js';
import { deinitializeGlobalLocaleVars, initializeGlobalLocaleVars } from './LocaleHelpers.js';
import { cleanupRuntime, setupRuntime } from './RuntimeHelpers.js';
import { cleanupSettings, setupSettings } from './SettingsHelpers.js';
// Don't import UI at this stage because it will fail without
// the environment. Instead we do the import at the end of the
// initialization phase.
// eslint-disable-next-line @typescript-eslint/naming-convention
let UI;
export { createTarget } from './TargetHelpers.js';
export { stubNoopSettings } from './SettingsHelpers.js';
export function registerActions(actions) {
    for (const action of actions) {
        UI.ActionRegistration.maybeRemoveActionExtension(action.actionId);
        UI.ActionRegistration.registerActionExtension(action);
    }
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({ forceNew: true });
    UI.ShortcutRegistry.ShortcutRegistry.instance({ forceNew: true, actionRegistry: actionRegistryInstance });
}
export function registerNoopActions(actionIds) {
    for (const actionId of actionIds) {
        UI.ActionRegistration.maybeRemoveActionExtension(actionId);
        UI.ActionRegistration.registerActionExtension({
            actionId,
            category: "" /* UI.ActionRegistration.ActionCategory.NONE */,
            title: () => 'mock',
        });
    }
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({ forceNew: true });
    UI.ShortcutRegistry.ShortcutRegistry.instance({ forceNew: true, actionRegistry: actionRegistryInstance });
}
export async function initializeGlobalVars({ reset = true } = {}) {
    await initializeGlobalLocaleVars();
    setupSettings(reset);
    setupRuntime();
    // Dynamically import UI after the rest of the environment is set up, otherwise it will fail.
    UI = await import('../ui/legacy/legacy.js');
    UI.ZoomManager.ZoomManager.instance({ forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance });
    // Initialize context menus.
    UI.UIUtils.initializeUIUtils(document);
}
export async function deinitializeGlobalVars() {
    // Remove the global SDK.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const globalObject = globalThis;
    delete globalObject.SDK;
    delete globalObject.ls;
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
        if (typeof target.dispose === 'function') {
            target.dispose('deinitializeGlobalVars');
        }
    }
    // Remove instances.
    deinitializeGlobalLocaleVars();
    Host.GdpClient.GdpClient.removeInstance();
    Host.AidaClient.HostConfigTracker.removeInstance();
    Logs.NetworkLog.NetworkLog.removeInstance();
    SDK.TargetManager.TargetManager.removeInstance();
    SDK.CPUThrottlingManager.CPUThrottlingManager.removeInstance();
    SDK.FrameManager.FrameManager.removeInstance();
    SDK.EventBreakpointsModel.EventBreakpointsManager.removeInstance();
    SDK.PageResourceLoader.PageResourceLoader.removeInstance();
    Common.Settings.Settings.removeInstance();
    Common.Revealer.RevealerRegistry.removeInstance();
    Common.Console.Console.removeInstance();
    Workspace.Workspace.WorkspaceImpl.removeInstance();
    Workspace.FileManager.FileManager.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
    Bindings.NetworkProject.NetworkProjectManager.removeInstance();
    IssuesManager.IssuesManager.IssuesManager.removeInstance();
    Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.removeInstance();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.removeInstance();
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
    EmulationModel.DeviceModeModel.DeviceModeModel.removeInstance();
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
    // We must dynamically import the highlighting module because evaluating
    // `HighlightElement.ts` requires `HTMLElement` to be available. When running
    // unit tests in the Node.js environment, `HTMLElement` is missing, so a
    // static import at the top of this file would break Node unit tests.
    if (typeof HTMLElement !== 'undefined') {
        const Highlighting = await import('../ui/components/highlighting/highlighting.js');
        Highlighting.HighlightManager.HighlightManager.removeInstance();
    }
    cleanupRuntime();
}
export function describeWithEnvironment(title, fn, opts = {
    reset: true,
}) {
    return describe(title, function () {
        beforeEach(async () => await initializeGlobalVars(opts));
        fn.call(this);
        afterEach(async () => await deinitializeGlobalVars());
    });
}
describeWithEnvironment.only = function (title, fn, opts = {
    reset: true,
}) {
    // eslint-disable-next-line mocha/no-exclusive-tests
    return describe.only(title, function () {
        beforeEach(async () => await initializeGlobalVars(opts));
        fn.call(this);
        afterEach(async () => await deinitializeGlobalVars());
    });
};
describeWithEnvironment.skip = function (title, fn, _opts = {
    reset: true,
}) {
    // eslint-disable-next-line @devtools/check-test-definitions
    return describe.skip(title, function () {
        fn.call(this);
    });
};
export function createFakeSetting(name, defaultValue) {
    const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
    return new Common.Settings.Setting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage, Common.Console.Console.instance());
}
export function createFakeRegExpSetting(name, defaultValue) {
    const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
    return new Common.Settings.RegExpSetting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage, Common.Console.Console.instance());
}
export function setupActionRegistry() {
    beforeEach(function () {
        const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
        UI.ShortcutRegistry.ShortcutRegistry.instance({
            forceNew: true,
            actionRegistry,
        });
    });
    afterEach(function () {
        if (UI) {
            UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
            UI.ActionRegistry.ActionRegistry.removeInstance();
        }
    });
}
/** This needs to be invoked within a describe block, rather than within an it() block. **/
export function expectConsoleLogs(expectedLogs) {
    const { error, warn, log } = console;
    before(() => {
        if (expectedLogs.log) {
            // eslint-disable-next-line no-console
            console.log = (...data) => {
                if (!expectedLogs.log?.includes(data.join(' '))) {
                    log(...data);
                }
            };
        }
        if (expectedLogs.warn) {
            console.warn = (...data) => {
                if (!expectedLogs.warn?.includes(data.join(' '))) {
                    warn(...data);
                }
            };
        }
        if (expectedLogs.error) {
            console.error = (...data) => {
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
let userAgentStub;
export function setUserAgentForTesting() {
    userAgentStub = sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Chrome/unit_test');
}
export function restoreUserAgentForTesting() {
    userAgentStub?.restore();
    userAgentStub = undefined;
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
export function updateHostConfig(config) {
    Object.assign(Root.Runtime.hostConfig, config);
}
export async function waitFor(selector, root) {
    let element = null;
    let polls = 0;
    // Poll for element until found
    while (!element) {
        assert.isBelow(polls, 200, `Element with selector ${selector} was not found.`);
        element = root ? root.querySelector(selector) : document.querySelector(selector);
        await new Promise(resolve => setTimeout(resolve, 10));
        polls++;
    }
    return element;
}
//# sourceMappingURL=EnvironmentHelpers.js.map