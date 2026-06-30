// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import type {Chrome} from '../../extension-api/ExtensionAPI.js';
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Extensions from '../models/extensions/extensions.js';
import * as Logs from '../models/logs/logs.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as PanelCommon from '../panels/common/common.js';

import {describeWithEnvironment, setupActionRegistry} from './EnvironmentHelpers.js';
import {MockDebuggerBackend} from './MockScopeChain.js';

export interface ExtensionContext {
  chrome: Partial<Chrome.DevTools.Chrome>;
  extensionDescriptor: Extensions.ExtensionAPI.ExtensionDescriptor;
  backend?: Partial<MockDebuggerBackend>;
}

export function getExtensionOrigin() {
  return window.location.origin;
}

export function describeWithDevtoolsExtension(
    title: string, extension: Partial<Host.InspectorFrontendHostAPI.ExtensionDescriptor>,
    fn: (this: Mocha.Suite, context: ExtensionContext) => void) {
  const extensionDescriptor = {
    startPage: `${getExtensionOrigin()}/blank.html`,
    name: 'TestExtension',
    exposeExperimentalAPIs: true,
    allowFileAccess: false,
    ...extension,
  };
  const context: ExtensionContext = {
    extensionDescriptor,
    chrome: {},
  };

  function setupExtensionHelper() {
    const server = PanelCommon.ExtensionServer.ExtensionServer.instance({forceNew: true});
    sinon.stub(server, 'addExtensionFrame');

    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setInjectedScriptForOrigin')
        .callsFake((origin, _script) => {
          if (origin === getExtensionOrigin()) {
            const chrome: Partial<Chrome.DevTools.Chrome> = {};
            (window as {chrome?: Partial<Chrome.DevTools.Chrome>}).chrome = chrome;
            self.injectedExtensionAPI(extensionDescriptor, 'main', 'dark', [], () => {}, 1, window);
            context.chrome = chrome;
          }
        });
    server.addExtension(extensionDescriptor);
  }

  function cleanupExtensionHelper() {
    const chrome: Partial<Chrome.DevTools.Chrome> = {};
    (window as {chrome?: Partial<Chrome.DevTools.Chrome>}).chrome = chrome;
    context.chrome = chrome;
    sinon.restore();
  }

  return describeWithEnvironment(`with-extension-${title}`, function() {
    setupActionRegistry();

    let backend: MockDebuggerBackend;

    beforeEach(() => {
      cleanupExtensionHelper();
      backend = new MockDebuggerBackend();
      context.backend = backend;
      sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(backend.universe.workspace);
      sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
      sinon.stub(Common.Settings.Settings, 'instance').returns(backend.universe.settings);

      const networkLog = new Logs.NetworkLog.NetworkLog();
      sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(networkLog);

      setupExtensionHelper();
    });

    afterEach(cleanupExtensionHelper);

    fn.call(this, context);
  });
}

describeWithDevtoolsExtension.only = function(
    title: string, extension: Partial<Host.InspectorFrontendHostAPI.ExtensionDescriptor>,
    fn: (this: Mocha.Suite, context: ExtensionContext) => void) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only('.only', function() {
    return describeWithDevtoolsExtension(title, extension, fn);
  });
};
