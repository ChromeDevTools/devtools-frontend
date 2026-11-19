// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {waitForTarget} from '../../testing/TargetHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

describe('ServiceWorkerVersion', () => {
  const REGISTRATION_PAYLOAD = {registrationId: 'foo', scopeURL: 'https://example.com', isDeleted: false} as
      Protocol.ServiceWorker.ServiceWorkerRegistration;

  const VERSION_PAYLOAD = {
    versionId: '12345',
    scriptURL: 'http://example.com/script.js',
    runningStatus: 'stopped',
    status: 'new',
    scriptLastModified: 1234567890,
    scriptResponseTime: 12345,
    controlledClients: ['client1', 'client2'],
    targetId: 'target1',
    routerRules: '[{"condition":{"requestMethod":"POST"},"source":["fetch","network"],"id":1}]',
  } as Protocol.ServiceWorker.ServiceWorkerVersion;

  function makeVersion(
      registrationPayload: Protocol.ServiceWorker.ServiceWorkerRegistration,
      versionPayload: Protocol.ServiceWorker.ServiceWorkerVersion): SDK.ServiceWorkerManager.ServiceWorkerVersion {
    return new SDK.ServiceWorkerManager.ServiceWorkerVersion(
        new SDK.ServiceWorkerManager.ServiceWorkerRegistration(registrationPayload), versionPayload);
  }

  it('initializes with a given payload', () => {
    const version = makeVersion(REGISTRATION_PAYLOAD, VERSION_PAYLOAD);

    const expectedRouterRules =
        [{condition: '{"requestMethod":"POST"}', source: '["fetch","network"]', id: 1} as
         SDK.ServiceWorkerManager.ServiceWorkerRouterRule];

    assert.strictEqual(version.id, VERSION_PAYLOAD.versionId);
    assert.strictEqual(version.scriptURL, VERSION_PAYLOAD.scriptURL);
    assert.strictEqual(version.runningStatus, VERSION_PAYLOAD.runningStatus);
    assert.strictEqual(version.status, VERSION_PAYLOAD.status);
    assert.strictEqual(version.scriptLastModified, VERSION_PAYLOAD.scriptLastModified);
    assert.strictEqual(version.scriptResponseTime, VERSION_PAYLOAD.scriptResponseTime);
    assert.deepEqual(version.controlledClients, VERSION_PAYLOAD.controlledClients);
    assert.strictEqual(version.targetId, VERSION_PAYLOAD.targetId);
    assert.deepEqual(version.routerRules, expectedRouterRules);
  });

  it('initializes with a given payload containing typedRouterRules', () => {
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            requestMethod: 'POST',
            urlPattern:
                '{"hash":"*","hostname":"*","password":"*","pathname":"/example","port":"*","protocol":"*","search":"*","username":"*"}',
          },
          source: {
            type: 'network' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    const expectedRouterRules = [{
      condition:
          '{"requestMethod":"POST","urlPattern":{"hash":"*","hostname":"*","password":"*","pathname":"/example","port":"*","protocol":"*","search":"*","username":"*"}}',
      source: '"network"',
      id: 1,
    } as SDK.ServiceWorkerManager.ServiceWorkerRouterRule];

    assert.deepEqual(version.routerRules, expectedRouterRules);
  });

  it('initializes with typedRouterRules containing plain string urlPattern', () => {
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            requestMethod: 'GET',
            urlPattern: 'https://example.com/api/*',
          },
          source: {
            type: 'network' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    const expectedRouterRules =
        [{condition: '{"requestMethod":"GET","urlPattern":"https://example.com/api/*"}', source: '"network"', id: 1} as
         SDK.ServiceWorkerManager.ServiceWorkerRouterRule];

    assert.deepEqual(version.routerRules, expectedRouterRules);
  });

  it('parses nested urlPattern in typedRouterRules correctly', () => {
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            or: [
              {
                urlPattern: '{"pathname": "/foo"}',
              },
              {
                not: {
                  urlPattern: '{"pathname": "/bar"}',
                },
              },
            ],
          },
          source: {
            type: 'network' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    const expectedRouterRules = [{
      condition: '{"or":[{"urlPattern":{"pathname":"/foo"}},{"not":{"urlPattern":{"pathname":"/bar"}}}]}',
      source: '"network"',
      id: 1,
    } as SDK.ServiceWorkerManager.ServiceWorkerRouterRule];

    assert.deepEqual(version.routerRules, expectedRouterRules);
  });

  it('initializes with typedRouterRules with sourceDict source', () => {
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            requestMethod: 'GET',
          },
          source: {
            type: 'sourceDict' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
            sourceDict: {
              cacheName: 'v1',
            },
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    const expectedRouterRules = [{condition: '{"requestMethod":"GET"}', source: '{"cacheName":"v1"}', id: 1} as
                                 SDK.ServiceWorkerManager.ServiceWorkerRouterRule];

    assert.deepEqual(version.routerRules, expectedRouterRules);
  });

  it('fails to parse typedRouterRules when sourceDict is missing for SourceDict source type', () => {
    const consoleError = sinon.stub(console, 'error');
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            requestMethod: 'GET',
          },
          source: {
            type: 'sourceDict' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    assert.isNull(version.routerRules);
    sinon.assert.calledOnceWithExactly(consoleError,
                                       'Parse error: `sourceDict` is missing in `typedRouterRules` source');
  });

  it('fails to parse typedRouterRules when sourceDict is present for non-SourceDict source type', () => {
    const consoleError = sinon.stub(console, 'error');
    const TYPED_ROUTER_RULES_PAYLOAD = {
      ...VERSION_PAYLOAD,
      routerRules: undefined,
      typedRouterRules: [
        {
          condition: {
            requestMethod: 'GET',
          },
          source: {
            type: 'network' as Protocol.ServiceWorker.ServiceWorkerRouterSourceType,
            sourceDict: {
              cacheName: 'v1',
            },
          },
          id: 1,
        },
      ],
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, TYPED_ROUTER_RULES_PAYLOAD);

    assert.isNull(version.routerRules);
    sinon.assert.calledOnceWithExactly(consoleError,
                                       'Parse error: Unexpected `sourceDict` in `typedRouterRules` source');
  });

  it('should update the version with the given payload', () => {
    const version = makeVersion(REGISTRATION_PAYLOAD, VERSION_PAYLOAD);

    version.update({
      versionId: '67890',
      scriptURL: 'http://example.com/script2.js',
      runningStatus: 'starting',
      status: 'installing',
      scriptLastModified: 1234567891,
      scriptResponseTime: 12346,
      controlledClients: ['client3', 'client4'],
      targetId: 'target2',
    } as Protocol.ServiceWorker.ServiceWorkerVersion);

    assert.strictEqual(version.id, '67890');
    assert.strictEqual(version.scriptURL, 'http://example.com/script2.js');
    assert.strictEqual(version.runningStatus, 'starting');
    assert.strictEqual(version.status, 'installing');
    assert.strictEqual(version.scriptLastModified, 1234567891);
    assert.strictEqual(version.scriptResponseTime, 12346);
    assert.deepEqual(version.controlledClients, ['client3', 'client4']);
    assert.strictEqual(version.targetId, 'target2');
  });

  it('identifies when the worker is startable', () => {
    const version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped', status: 'activated'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);

    assert.isTrue(version.isStartable());
  });

  it('identifies when the worker is not startable', () => {
    let version = makeVersion(
        {...REGISTRATION_PAYLOAD, isDeleted: true},
        {...VERSION_PAYLOAD, runningStatus: 'stopped', status: 'activated'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStartable());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped', status: 'new'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStartable());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'starting', status: 'activated'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStartable());
  });

  it('identifies when the worker is stopped and redundant', () => {
    const version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped', status: 'redundant'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);

    assert.isTrue(version.isStoppedAndRedundant());
  });

  it('identifies when the worker is not stopped and redundant', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped', status: 'activated'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStoppedAndRedundant());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'starting', status: 'redundant'} as
            Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStoppedAndRedundant());
  });

  it('identifies when the worker is stopped', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isStopped());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'starting'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStopped());
  });

  it('identifies when the worker is starting', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'starting'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isStarting());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStarting());
  });

  it('identifies when the worker is running', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'running'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isRunning());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isRunning());
  });

  it('identifies when the worker is stopping', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopping'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isStopping());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, runningStatus: 'stopped'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isStopping());
  });

  it('identifies when the worker is new', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'new'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isNew());

    version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isNew());
  });

  it('identifies when the worker is installing', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'installing'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isInstalling());

    version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isInstalling());
  });

  it('identifies when the worker is installed', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'installed'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isInstalled());

    version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isInstalled());
  });

  it('identifies when the worker is activating', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'activating'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isActivating());

    version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isActivating());
  });

  it('identifies when the worker is activated', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isActivated());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'activating'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isActivated());
  });

  it('identifies when the worker is redundant', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'redundant'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isTrue(version.isRedundant());

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'activating'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.isFalse(version.isRedundant());
  });

  it('identifies when the worker is in installing mode', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'new'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING);

    version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'installing'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING);
  });

  it('identifies when the worker is in waiting mode', () => {
    const version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'installed'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING);
  });

  it('identifies when the worker is in active mode', () => {
    let version = makeVersion(
        REGISTRATION_PAYLOAD,
        {...VERSION_PAYLOAD, status: 'activating'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE);

    version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'activated'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE);
  });

  it('identifies when the worker is in redundant mode', () => {
    const version = makeVersion(
        REGISTRATION_PAYLOAD, {...VERSION_PAYLOAD, status: 'redundant'} as Protocol.ServiceWorker.ServiceWorkerVersion);
    assert.strictEqual(version.mode(), SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT);
  });

  it('routerRules should be null if not provided', () => {
    const VERSION_PAYLOAD_WITHOUT_ROUTER_RULES = {
      versionId: '12345',
      scriptURL: 'http://example.com/script.js',
      runningStatus: 'stopped',
      status: 'new',
      scriptLastModified: 1234567890,
      scriptResponseTime: 12345,
      controlledClients: ['client1', 'client2'],
      targetId: 'target1',
    } as Protocol.ServiceWorker.ServiceWorkerVersion;

    const version = makeVersion(REGISTRATION_PAYLOAD, VERSION_PAYLOAD_WITHOUT_ROUTER_RULES);

    assert.isNull(version.routerRules);
  });
});

describe('ServiceWorkerManager', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  it('disables forceUpdateOnPageLoad when DevTools is offline even if service-worker-update-on-reload setting is enabled',
     () => {
       const universe = new TestUniverse();
       const target = universe.createTarget({type: SDK.Target.Type.FRAME});
       const serviceWorkerAgent = target.serviceWorkerAgent();
       const setForceUpdateSpy = sinon.spy(serviceWorkerAgent, 'invoke_setForceUpdateOnPageLoad');
       const updateOnReloadSetting = universe.settings.createSetting('service-worker-update-on-reload', false);

       const manager = new SDK.ServiceWorkerManager.ServiceWorkerManager(target);
       sinon.assert.notCalled(setForceUpdateSpy);

       updateOnReloadSetting.set(true);
       sinon.assert.calledWith(setForceUpdateSpy, {forceUpdateOnPageLoad: true});

       universe.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
       sinon.assert.calledWith(setForceUpdateSpy, {forceUpdateOnPageLoad: false});

       universe.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.NoThrottlingConditions);
       sinon.assert.calledWith(setForceUpdateSpy, {forceUpdateOnPageLoad: true});

       manager.dispose();
     });

  it('enables Debugger without DOM or CSS commands on ServiceWorker attach, suspend, and resume', async () => {
    const autoStartModels = new Set(
        [...SDK.SDKModel.SDKModel.registeredModels].filter(([, info]) => info.autostart).map(([model]) => model));
    const universe = new TestUniverse({overrideAutoStartModels: autoStartModels});

    try {
      const connection = new MockCDPConnection([
        ['Debugger.enable', () => ({result: {debuggerId: 'debugger-1' as Protocol.Runtime.UniqueDebuggerId}})],
        ['Debugger.disable', () => ({result: {}})],
        ['Runtime.runIfWaitingForDebugger', () => ({result: {}})],
      ]);
      const sendSpy = sinon.spy(connection, 'send');

      const tabTarget = universe.createTarget({
        id: 'tab-target' as Protocol.Target.TargetID,
        type: SDK.Target.Type.TAB,
        connection,
      });
      const frameTarget = universe.createTarget({
        id: 'frame-target' as Protocol.Target.TargetID,
        type: SDK.Target.Type.FRAME,
        parentTarget: tabTarget,
        url: 'http://127.0.0.1:8000/devtools/resources/inspected-page.html',
      });
      const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(frameTarget);
      const serviceWorkerManager = frameTarget.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
      assert.exists(serviceWorkerManager);

      const primaryPageTarget = universe.targetManager.primaryPageTarget();
      assert.exists(primaryPageTarget);
      assert.strictEqual(primaryPageTarget, frameTarget);

      const swSessionId = 'sw-session-1' as Protocol.Target.SessionID;
      const swTargetId = 'sw-target-1' as Protocol.Target.TargetID;
      const swScriptUrl = 'http://127.0.0.1:8000/devtools/service-workers/resources/service-worker-empty.js';
      const swScopeUrl = 'http://127.0.0.1:8000/devtools/service-workers/resources/scope1/';
      const registrationId = 'reg-1' as Protocol.ServiceWorker.RegistrationID;
      const versionId = '1';

      const swTargetPromise = waitForTarget(
          universe, target => target.id() === swTargetId && target.type() === SDK.Target.Type.ServiceWorker);

      await childTargetManager.attachedToTarget({
        sessionId: swSessionId,
        targetInfo: {
          targetId: swTargetId,
          type: 'service_worker',
          title: swScriptUrl,
          url: swScriptUrl,
          attached: true,
          canAccessOpener: false,
        },
        waitingForDebugger: true,
      });

      const swTarget = await swTargetPromise;
      assert.strictEqual(swTarget.type(), SDK.Target.Type.ServiceWorker);
      assert.isNull(swTarget.model(SDK.DOMModel.DOMModel));
      assert.isNull(swTarget.model(SDK.CSSModel.CSSModel));

      const swDebuggerModel = swTarget.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(swDebuggerModel);
      if (!swDebuggerModel.debuggerId()) {
        await swDebuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
      }

      const primarySessionId = primaryPageTarget.sessionId;
      const commandsForSession = (sessionId: string) =>
          sendSpy.getCalls()
              .filter(call => call.args[2] === sessionId)
              .map(call => ({method: call.args[0] as string, params: call.args[1]}));

      // Control check: the primary FRAME target sends DOM.enable and CSS.enable, whereas the
      // ServiceWorker session sends Debugger.enable and zero DOM.* or CSS.* commands.
      const frameInitialCommands = commandsForSession(primarySessionId).map(cmd => cmd.method);
      assert.include(frameInitialCommands, 'DOM.enable');
      assert.include(frameInitialCommands, 'CSS.enable');

      const swInitialCommands = commandsForSession(swSessionId);
      assert.isFalse(swInitialCommands.some(cmd => cmd.method.startsWith('DOM.') || cmd.method.startsWith('CSS.')),
                     'Unexpected DOM.* or CSS.* command sent to ServiceWorker session on attach');
      assert.deepEqual(swInitialCommands.filter(cmd => cmd.method === 'Debugger.enable'),
                       [{method: 'Debugger.enable', params: {maxScriptsCacheSize: 100000000}}]);

      connection.dispatchEvent(
          'ServiceWorker.workerRegistrationUpdated',
          {registrations: [{registrationId, scopeURL: swScopeUrl, isDeleted: false}]},
          primarySessionId,
      );
      connection.dispatchEvent(
          'ServiceWorker.workerVersionUpdated',
          {
            versions: [{
              registrationId,
              versionId,
              scriptURL: swScriptUrl,
              runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting,
              status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing,
            }],
          },
          primarySessionId,
      );
      connection.dispatchEvent(
          'ServiceWorker.workerVersionUpdated',
          {
            versions: [{
              registrationId,
              versionId,
              scriptURL: swScriptUrl,
              runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
              status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
              targetId: swTargetId,
            }],
          },
          primarySessionId,
      );
      connection.dispatchEvent(
          'Runtime.executionContextCreated',
          {
            context: {
              id: 1 as Protocol.Runtime.ExecutionContextId,
              origin: 'http://127.0.0.1:8000',
              name: swScriptUrl,
              uniqueId: 'sw-context-1',
            },
          },
          swSessionId,
      );
      connection.dispatchEvent(
          'ServiceWorker.workerRegistrationUpdated',
          {registrations: [{registrationId, scopeURL: swScopeUrl, isDeleted: false}]},
          primarySessionId,
      );

      assert.strictEqual(serviceWorkerManager.registrations().size, 1);
      const swExecutionContexts = swTarget.model(SDK.RuntimeModel.RuntimeModel)?.executionContexts();
      assert.exists(swExecutionContexts);
      assert.lengthOf(swExecutionContexts, 1);
      assert.strictEqual(swExecutionContexts[0].label(), ' #1 (activated)');

      const commandCountBeforeSuspend = sendSpy.callCount;
      await universe.targetManager.suspendAllTargets();
      assert.isTrue(universe.targetManager.allTargetsSuspended());
      assert.isTrue(swTarget.suspended());

      const swSuspendCommands = sendSpy.getCalls()
                                    .slice(commandCountBeforeSuspend)
                                    .filter(call => call.args[2] === swSessionId)
                                    .map(call => call.args[0] as string);
      assert.include(swSuspendCommands, 'Debugger.disable');
      assert.isFalse(swSuspendCommands.some(method => method.startsWith('DOM.') || method.startsWith('CSS.')),
                     'Unexpected DOM.* or CSS.* command sent to ServiceWorker session during suspend');

      const commandCountBeforeResume = sendSpy.callCount;
      await universe.targetManager.resumeAllTargets();
      assert.isFalse(universe.targetManager.allTargetsSuspended());
      assert.isFalse(swTarget.suspended());

      const swResumeCommands = sendSpy.getCalls()
                                   .slice(commandCountBeforeResume)
                                   .filter(call => call.args[2] === swSessionId)
                                   .map(call => ({method: call.args[0] as string, params: call.args[1]}));
      assert.isFalse(swResumeCommands.some(cmd => cmd.method.startsWith('DOM.') || cmd.method.startsWith('CSS.')),
                     'Unexpected DOM.* or CSS.* command sent to ServiceWorker session during resume');
      assert.deepEqual(swResumeCommands.filter(cmd => cmd.method === 'Debugger.enable'),
                       [{method: 'Debugger.enable', params: {maxScriptsCacheSize: 100000000}}]);
    } finally {
      universe.dispose();
    }
  });
});
