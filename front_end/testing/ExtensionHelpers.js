// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../core/host/host.js';
import * as PanelCommon from '../panels/common/common.js';
import { describeWithEnvironment, setupActionRegistry } from './EnvironmentHelpers.js';
import { describeWithMockConnection } from './MockConnection.js';
export function getExtensionOrigin() {
    return window.location.origin;
}
export function describeWithDevtoolsExtension(title, extension, fn) {
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
    function setup() {
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
    function cleanup() {
        const chrome = {};
        window.chrome = chrome;
        context.chrome = chrome;
    }
    return describeWithMockConnection(`with-extension-${title}`, function () {
        beforeEach(cleanup);
        beforeEach(setup);
        afterEach(cleanup);
        describeWithEnvironment(title, function () {
            setupActionRegistry();
            fn.call(this, context);
        });
    });
}
describeWithDevtoolsExtension.only = function (title, extension, fn) {
    // eslint-disable-next-line mocha/no-exclusive-tests
    return describe.only('.only', function () {
        return describeWithDevtoolsExtension(title, extension, fn);
    });
};
//# sourceMappingURL=ExtensionHelpers.js.map