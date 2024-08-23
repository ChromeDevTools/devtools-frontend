// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

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
    assert.deepStrictEqual(version.controlledClients, VERSION_PAYLOAD.controlledClients);
    assert.strictEqual(version.targetId, VERSION_PAYLOAD.targetId);
    assert.deepStrictEqual(version.routerRules, expectedRouterRules);
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
    assert.deepStrictEqual(version.controlledClients, ['client3', 'client4']);
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
