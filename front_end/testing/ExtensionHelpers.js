// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import sinon from 'sinon';
import * as Host from '../core/host/host.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Logs from '../models/logs/logs.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as PanelCommon from '../panels/common/common.js';
import { deinitializeGlobalVars, initializeGlobalVars, setupActionRegistry, } from './EnvironmentHelpers.js';
import { MockDebuggerBackend } from './MockScopeChain.js';
export function getExtensionOrigin() {
    return window.location.origin;
}
export function setupDevtoolsExtensionHooks(extension = {}) {
    const extensionDescriptor = {
        startPage: `${getExtensionOrigin()}/blank.html`,
        name: 'TestExtension',
        exposeExperimentalAPIs: true,
        allowFileAccess: false,
        ...extension,
    };
    const context = {
        extensionDescriptor,
        chrome: {},
    };
    function setupExtensionHelper() {
        const server = PanelCommon.ExtensionServer.ExtensionServer.instance({ forceNew: true });
        sinon.stub(server, 'addExtensionFrame');
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setInjectedScriptForOrigin')
            .callsFake((origin, _script) => {
            if (origin === getExtensionOrigin()) {
                const chrome = {};
                window.chrome = chrome;
                self.injectedExtensionAPI(extensionDescriptor, 'main', 'dark', [], () => { }, 1, window);
                context.chrome = chrome;
            }
        });
        server.addExtension(extensionDescriptor);
    }
    function cleanupExtensionHelper() {
        const chrome = {};
        window.chrome = chrome;
        context.chrome = chrome;
        sinon.restore();
    }
    beforeEach(async () => {
        await initializeGlobalVars();
    });
    setupActionRegistry();
    beforeEach(() => {
        cleanupExtensionHelper();
        const backend = new MockDebuggerBackend();
        context.backend = backend;
        sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(backend.universe.workspace);
        sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
        const networkLog = new Logs.NetworkLog.NetworkLog(backend.universe.targetManager, backend.universe.settings);
        sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(networkLog);
        setupExtensionHelper();
    });
    afterEach(async () => {
        cleanupExtensionHelper();
        await deinitializeGlobalVars();
    });
    return context;
}
//# sourceMappingURL=ExtensionHelpers.js.map